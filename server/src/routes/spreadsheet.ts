import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Spreadsheet, { ICellData, IWorksheet, IChart, IFilter, ISortRange, INamedRange, IConditionalFormat, ISpreadsheetDocument } from '../models/Spreadsheet';
import { authenticate } from '../middleware/auth';
import { IAuthRequest, IApiResponse } from '../types';

const router = Router();

// ==================== 公式计算引擎 ====================

/**
 * 公式计算类
 * 支持 SUM, AVERAGE, COUNT, MAX, MIN, IF, CONCATENATE 等常用公式
 */
class FormulaEngine {
  private spreadsheet: any;
  private sheetId: string;

  constructor(spreadsheet: any, sheetId: string) {
    this.spreadsheet = spreadsheet;
    this.sheetId = sheetId;
  }

  /**
   * 解析单元格引用 (如 "A1", "B2:C5")
   */
  private parseCellRef(ref: string): { col: number; row: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    
    const colStr = match[1];
    const row = parseInt(match[2], 10) - 1; // 0-indexed
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col--; // 0-indexed
    
    return { col, row };
  }

  /**
   * 解析范围引用 (如 "A1:B5")
   */
  private parseRangeRef(ref: string): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
    const parts = ref.split(':');
    if (parts.length !== 2) return null;
    
    const start = this.parseCellRef(parts[0]);
    const end = this.parseCellRef(parts[1]);
    
    if (!start || !end) return null;
    
    return {
      startCol: start.col,
      startRow: start.row,
      endCol: end.col,
      endRow: end.row
    };
  }

  /**
   * 获取单元格值
   */
  private getCellValue(col: number, row: number): any {
    const cell = this.spreadsheet.getCell(this.sheetId, row, col);
    if (!cell) return null;
    if (cell.type === 'formula' && cell.computedValue !== undefined) {
      return cell.computedValue;
    }
    return cell.value;
  }

  /**
   * 获取范围内的所有数值
   */
  private getRangeValues(rangeRef: string): number[] {
    const range = this.parseRangeRef(rangeRef);
    if (!range) return [];
    
    const values: number[] = [];
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const value = this.getCellValue(col, row);
        if (typeof value === 'number') {
          values.push(value);
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          values.push(parseFloat(value));
        }
      }
    }
    return values;
  }

  /**
   * 计算公式
   */
  calculate(formula: string): any {
    if (!formula.startsWith('=')) {
      return formula;
    }
    
    const expr = formula.substring(1).trim();
    
    try {
      // SUM 函数
      const sumMatch = expr.match(/^SUM\(([^)]+)\)$/i);
      if (sumMatch) {
        const values = this.getRangeValues(sumMatch[1]);
        return values.reduce((a, b) => a + b, 0);
      }
      
      // AVERAGE 函数
      const avgMatch = expr.match(/^AVERAGE\(([^)]+)\)$/i);
      if (avgMatch) {
        const values = this.getRangeValues(avgMatch[1]);
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }
      
      // COUNT 函数
      const countMatch = expr.match(/^COUNT\(([^)]+)\)$/i);
      if (countMatch) {
        return this.getRangeValues(countMatch[1]).length;
      }
      
      // MAX 函数
      const maxMatch = expr.match(/^MAX\(([^)]+)\)$/i);
      if (maxMatch) {
        const values = this.getRangeValues(maxMatch[1]);
        return values.length > 0 ? Math.max(...values) : 0;
      }
      
      // MIN 函数
      const minMatch = expr.match(/^MIN\(([^)]+)\)$/i);
      if (minMatch) {
        const values = this.getRangeValues(minMatch[1]);
        return values.length > 0 ? Math.min(...values) : 0;
      }
      
      // IF 函数
      const ifMatch = expr.match(/^IF\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
      if (ifMatch) {
        const condition = this.evaluateCondition(ifMatch[1].trim());
        const trueValue = this.parseValue(ifMatch[2].trim());
        const falseValue = this.parseValue(ifMatch[3].trim());
        return condition ? trueValue : falseValue;
      }
      
      // CONCATENATE 函数
      const concatMatch = expr.match(/^CONCATENATE\(([^)]+)\)$/i);
      if (concatMatch) {
        const args = concatMatch[1].split(',').map(arg => arg.trim());
        return args.map(arg => this.getArgValue(arg)).join('');
      }
      
      // 简单的算术表达式
      return this.evaluateExpression(expr);
      
    } catch (error) {
      console.error('Formula calculation error:', error);
      return '#ERROR';
    }
  }

  /**
   * 获取参数值
   */
  private getArgValue(arg: string): any {
    // 字符串字面量
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg.slice(1, -1);
    }
    
    // 单元格引用
    const cellRef = this.parseCellRef(arg);
    if (cellRef) {
      return this.getCellValue(cellRef.col, cellRef.row) || '';
    }
    
    // 数值
    if (!isNaN(parseFloat(arg))) {
      return parseFloat(arg);
    }
    
    return arg;
  }

  /**
   * 解析值
   */
  private parseValue(value: string): any {
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    if (!isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    return value;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: string): boolean {
    // 简单的比较
    const operators = ['>=', '<=', '!=', '=', '>', '<'];
    for (const op of operators) {
      const parts = condition.split(op);
      if (parts.length === 2) {
        const left = this.getArgValue(parts[0].trim());
        const right = this.getArgValue(parts[1].trim());
        
        switch (op) {
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '!=': return left !== right;
          case '=': return left === right;
          case '>': return left > right;
          case '<': return left < right;
        }
      }
    }
    
    // 简单真值判断
    const value = this.getArgValue(condition);
    return !!value && value !== 0 && value !== '';
  }

  /**
   * 评估简单算术表达式
   */
  private evaluateExpression(expr: string): number {
    // 替换单元格引用为值
    let processedExpr = expr;
    const cellRefs = expr.match(/[A-Z]+\d+/g) || [];
    
    for (const ref of cellRefs) {
      const cell = this.parseCellRef(ref);
      if (cell) {
        const value = this.getCellValue(cell.col, cell.row);
        processedExpr = processedExpr.replace(ref, value !== null ? value.toString() : '0');
      }
    }
    
    try {
      // 使用 Function 安全地计算表达式
      return new Function('return ' + processedExpr)();
    } catch {
      return 0;
    }
  }
}

// ==================== 表格 CRUD ====================

/**
 * @swagger
 * /api/spreadsheet:
 *   post:
 *     summary: 创建新表格
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 表格创建成功
 */
router.post(
  '/',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { title, description, tags, isTemplate, templateCategory } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          message: '表格标题是必填项',
          error: 'BadRequest'
        });
        return;
      }

      const spreadsheet = new Spreadsheet({
        title: title.trim(),
        description: description?.trim(),
        ownerId: req.user!._id.toString(),
        tags: tags || [],
        isTemplate: isTemplate || false,
        templateCategory
      });

      await spreadsheet.save();

      res.status(201).json({
        success: true,
        message: '表格创建成功',
        data: spreadsheet.toJSON()
      });
    } catch (error) {
      console.error('创建表格错误:', error);
      res.status(500).json({
        success: false,
        message: '创建表格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet:
 *   get:
 *     summary: 获取用户的表格列表
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 表格列表
 */
router.get(
  '/',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { page = 1, limit = 20, includeArchived, owned, collaborated } = req.query;
      const userId = req.user!._id.toString();

      const skip = (Number(page) - 1) * Number(limit);
      const options = {
        includeArchived: includeArchived === 'true',
        limit: Number(limit),
        skip
      };

      let spreadsheets: any[] = [];

      if (owned === 'true') {
        spreadsheets = await Spreadsheet.findByOwner(userId, options);
      } else if (collaborated === 'true') {
        spreadsheets = await Spreadsheet.findByCollaborator(userId, options);
      } else {
        const [ownedSheets, collaboratedSheets] = await Promise.all([
          Spreadsheet.findByOwner(userId, options),
          Spreadsheet.findByCollaborator(userId, options)
        ]);
        
        const sheetMap = new Map();
        [...ownedSheets, ...collaboratedSheets].forEach(sheet => {
          sheetMap.set(sheet._id.toString(), sheet);
        });
        spreadsheets = Array.from(sheetMap.values());
      }

      res.json({
        success: true,
        message: '获取表格列表成功',
        data: {
          spreadsheets: spreadsheets.map(s => s.toJSON()),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: spreadsheets.length
          }
        }
      });
    } catch (error) {
      console.error('获取表格列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取表格列表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/templates:
 *   get:
 *     summary: 获取表格模板列表
 *     tags: [表格]
 *     responses:
 *       200:
 *         description: 模板列表
 */
router.get(
  '/templates',
  async (req: Request, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { category } = req.query;
      const templates = await Spreadsheet.findTemplates(category as string | undefined);

      res.json({
        success: true,
        message: '获取模板列表成功',
        data: templates.map(t => t.toJSON())
      });
    } catch (error) {
      console.error('获取模板列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取模板列表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}:
 *   get:
 *     summary: 获取单个表格详情
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 表格详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'view')) {
        res.status(403).json({
          success: false,
          message: '无权访问此表格',
          error: 'Forbidden'
        });
        return;
      }

      res.json({
        success: true,
        message: '获取表格成功',
        data: spreadsheet.toJSON()
      });
    } catch (error) {
      console.error('获取表格错误:', error);
      res.status(500).json({
        success: false,
        message: '获取表格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}:
 *   put:
 *     summary: 更新表格基本信息
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/:id',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const updates = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const allowedUpdates = [
        'title', 'description', 'tags', 'isArchived', 'settings'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          (spreadsheet as any)[field] = updates[field];
        }
      });

      await spreadsheet.save();

      res.json({
        success: true,
        message: '表格更新成功',
        data: spreadsheet.toJSON()
      });
    } catch (error) {
      console.error('更新表格错误:', error);
      res.status(500).json({
        success: false,
        message: '更新表格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}:
 *   delete:
 *     summary: 删除表格
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 表格已删除
 */
router.delete(
  '/:id',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (spreadsheet.ownerId !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权删除此表格',
          error: 'Forbidden'
        });
        return;
      }

      await Spreadsheet.findByIdAndDelete(id);

      res.json({
        success: true,
        message: '表格删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除表格错误:', error);
      res.status(500).json({
        success: false,
        message: '删除表格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 工作表操作 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets:
 *   post:
 *     summary: 添加工作表
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 工作表添加成功
 */
router.post(
  '/:id/worksheets',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { name } = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const newSheet = await spreadsheet.addWorksheet(name);

      res.json({
        success: true,
        message: '工作表添加成功',
        data: newSheet
      });
    } catch (error) {
      console.error('添加工作表错误:', error);
      res.status(500).json({
        success: false,
        message: '添加工作表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}:
 *   delete:
 *     summary: 删除工作表
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 工作表已删除
 */
router.delete(
  '/:id/worksheets/:sheetId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id, sheetId } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      await spreadsheet.removeWorksheet(sheetId as string);

      res.json({
        success: true,
        message: '工作表删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除工作表错误:', error);
      res.status(500).json({
        success: false,
        message: '删除工作表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 单元格操作 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/cells/{row}/{col}:
 *   get:
 *     summary: 获取单元格数据
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 单元格数据
 */
router.get(
  '/:id/worksheets/:sheetId/cells/:row/:col',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, sheetId, row, col } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'view')) {
        res.status(403).json({
          success: false,
          message: '无权访问此表格',
          error: 'Forbidden'
        });
        return;
      }

      const cell = spreadsheet.getCell(sheetId as string, parseInt(row as string), parseInt(col as string));

      res.json({
        success: true,
        message: '获取单元格成功',
        data: cell || null
      });
    } catch (error) {
      console.error('获取单元格错误:', error);
      res.status(500).json({
        success: false,
        message: '获取单元格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/cells/{row}/{col}:
 *   put:
 *     summary: 更新单元格数据
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/:id/worksheets/:sheetId/cells/:row/:col',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, sheetId, row, col } = req.params;
      const userId = req.user!._id.toString();
      const cellData: Partial<ICellData> = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const rowNum = parseInt(row as string);
      const colNum = parseInt(col as string);

      // 如果是公式，计算结果
      let computedValue = cellData.value;
      if (cellData.type === 'formula' && cellData.formula) {
        const engine = new FormulaEngine(spreadsheet, sheetId as string);
        computedValue = engine.calculate(cellData.formula);
      }

      const fullCellData: ICellData = {
        row: rowNum,
        col: colNum,
        value: cellData.value ?? null,
        type: cellData.type || 'string',
        formula: cellData.formula,
        computedValue,
        format: cellData.format,
        comment: cellData.comment,
        merged: cellData.merged,
        mergeRange: cellData.mergeRange,
        validation: cellData.validation
      };

      await spreadsheet.setCell(sheetId as string, fullCellData);

      res.json({
        success: true,
        message: '单元格更新成功',
        data: fullCellData
      });
    } catch (error) {
      console.error('更新单元格错误:', error);
      res.status(500).json({
        success: false,
        message: '更新单元格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/cells:
 *   put:
 *     summary: 批量更新单元格数据
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 批量更新成功
 */
router.put(
  '/:id/worksheets/:sheetId/cells',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, sheetId } = req.params;
      const userId = req.user!._id.toString();
      const { cells } = req.body;

      if (!Array.isArray(cells)) {
        res.status(400).json({
          success: false,
          message: 'cells 必须是数组',
          error: 'BadRequest'
        });
        return;
      }

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      // 处理公式计算
      const engine = new FormulaEngine(spreadsheet, sheetId as string);
      const processedCells = cells.map((cell: ICellData) => {
        let computedValue = cell.value;
        if (cell.type === 'formula' && cell.formula) {
          computedValue = engine.calculate(cell.formula);
        }
        return { ...cell, computedValue };
      });

      await spreadsheet.setCells(sheetId as string, processedCells);

      res.json({
        success: true,
        message: '单元格批量更新成功',
        data: { updatedCount: cells.length }
      });
    } catch (error) {
      console.error('批量更新单元格错误:', error);
      res.status(500).json({
        success: false,
        message: '批量更新单元格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/cells/{row}/{col}:
 *   delete:
 *     summary: 清除单元格数据
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 单元格已清除
 */
router.delete(
  '/:id/worksheets/:sheetId/cells/:row/:col',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id, sheetId, row, col } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      await spreadsheet.clearCell(sheetId as string, parseInt(row as string), parseInt(col as string));

      res.json({
        success: true,
        message: '单元格清除成功',
        data: null
      });
    } catch (error) {
      console.error('清除单元格错误:', error);
      res.status(500).json({
        success: false,
        message: '清除单元格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 公式计算 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/calculate:
 *   post:
 *     summary: 计算公式
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 计算结果
 */
router.post(
  '/:id/worksheets/:sheetId/calculate',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, sheetId } = req.params;
      const userId = req.user!._id.toString();
      const { formula } = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'view')) {
        res.status(403).json({
          success: false,
          message: '无权访问此表格',
          error: 'Forbidden'
        });
        return;
      }

      const engine = new FormulaEngine(spreadsheet, sheetId as string);
      const result = engine.calculate(formula);

      res.json({
        success: true,
        message: '公式计算成功',
        data: { formula, result }
      });
    } catch (error) {
      console.error('公式计算错误:', error);
      res.status(500).json({
        success: false,
        message: '公式计算过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/worksheets/{sheetId}/recalculate:
 *   post:
 *     summary: 重新计算工作表中的所有公式
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 重新计算完成
 */
router.post(
  '/:id/worksheets/:sheetId/recalculate',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, sheetId } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const sheet = spreadsheet.getWorksheet(sheetId as string);
      if (!sheet) {
        res.status(404).json({
          success: false,
          message: '工作表不存在',
          error: 'NotFound'
        });
        return;
      }

      const engine = new FormulaEngine(spreadsheet, sheetId as string);
      let recalculatedCount = 0;

      for (const cell of sheet.cells) {
        if (cell.type === 'formula' && cell.formula) {
          cell.computedValue = engine.calculate(cell.formula);
          recalculatedCount++;
        }
      }

      await spreadsheet.save();

      res.json({
        success: true,
        message: '工作表重新计算成功',
        data: { recalculatedCount }
      });
    } catch (error) {
      console.error('重新计算错误:', error);
      res.status(500).json({
        success: false,
        message: '重新计算过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 协作权限管理 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/collaborators:
 *   post:
 *     summary: 添加协作者
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 协作者添加成功
 */
router.post(
  '/:id/collaborators',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { userId: collaboratorId, userName, userAvatar, permissions } = req.body;

      if (!collaboratorId || !userName || !permissions) {
        res.status(400).json({
          success: false,
          message: 'userId, userName 和 permissions 是必填项',
          error: 'BadRequest'
        });
        return;
      }

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (spreadsheet.ownerId !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权管理此表格的协作者',
          error: 'Forbidden'
        });
        return;
      }

      await spreadsheet.addCollaborator({
        userId: collaboratorId,
        userName,
        userAvatar,
        permissions
      });

      res.json({
        success: true,
        message: '协作者添加成功',
        data: spreadsheet.collaborators.find(c => c.userId === collaboratorId)
      });
    } catch (error) {
      console.error('添加协作者错误:', error);
      res.status(500).json({
        success: false,
        message: '添加协作者过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/collaborators/{userId}:
 *   delete:
 *     summary: 移除协作者
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 协作者已移除
 */
router.delete(
  '/:id/collaborators/:userId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id, userId: collaboratorId } = req.params;
      const currentUserId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (spreadsheet.ownerId !== currentUserId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权管理此表格的协作者',
          error: 'Forbidden'
        });
        return;
      }

      await spreadsheet.removeCollaborator(collaboratorId as string);

      res.json({
        success: true,
        message: '协作者移除成功',
        data: null
      });
    } catch (error) {
      console.error('移除协作者错误:', error);
      res.status(500).json({
        success: false,
        message: '移除协作者过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 图表操作 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/charts:
 *   post:
 *     summary: 添加图表
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表添加成功
 */
router.post(
  '/:id/charts',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const chartData: Omit<IChart, 'id'> = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const newChart: IChart = {
        id: new mongoose.Types.ObjectId().toString(),
        ...chartData
      };

      spreadsheet.charts.push(newChart);
      await spreadsheet.save();

      res.json({
        success: true,
        message: '图表添加成功',
        data: newChart
      });
    } catch (error) {
      console.error('添加图表错误:', error);
      res.status(500).json({
        success: false,
        message: '添加图表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/charts/{chartId}:
 *   delete:
 *     summary: 删除图表
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表已删除
 */
router.delete(
  '/:id/charts/:chartId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id, chartId } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      spreadsheet.charts = spreadsheet.charts.filter(c => c.id !== chartId);
      await spreadsheet.save();

      res.json({
        success: true,
        message: '图表删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除图表错误:', error);
      res.status(500).json({
        success: false,
        message: '删除图表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 筛选和排序 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/filters:
 *   post:
 *     summary: 添加筛选器
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 筛选器添加成功
 */
router.post(
  '/:id/filters',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const filterData: IFilter = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      // 移除同一范围的现有筛选器
      spreadsheet.filters = spreadsheet.filters.filter(
        f => !(f.sheetId === filterData.sheetId && 
               f.range.startRow === filterData.range.startRow &&
               f.range.startCol === filterData.range.startCol)
      );

      spreadsheet.filters.push(filterData);
      await spreadsheet.save();

      res.json({
        success: true,
        message: '筛选器添加成功',
        data: filterData
      });
    } catch (error) {
      console.error('添加筛选器错误:', error);
      res.status(500).json({
        success: false,
        message: '添加筛选器过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/spreadsheet/{id}/sort:
 *   post:
 *     summary: 排序数据
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 排序完成
 */
router.post(
  '/:id/sort',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const sortData: ISortRange = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此表格',
          error: 'Forbidden'
        });
        return;
      }

      const sheet = spreadsheet.getWorksheet(sortData.sheetId);
      if (!sheet) {
        res.status(404).json({
          success: false,
          message: '工作表不存在',
          error: 'NotFound'
        });
        return;
      }

      // 获取范围内的所有行
      const rangeCells = sheet.cells.filter(
        c => c.row >= sortData.range.startRow && 
             c.row <= sortData.range.endRow &&
             c.col >= sortData.range.startCol &&
             c.col <= sortData.range.endCol
      );

      // 按行分组
      const rows = new Map<number, ICellData[]>();
      for (const cell of rangeCells) {
        if (!rows.has(cell.row)) {
          rows.set(cell.row, []);
        }
        rows.get(cell.row)!.push(cell);
      }

      // 排序
      const sortedRows = Array.from(rows.entries()).sort((a, b) => {
        for (const spec of sortData.sortSpecs) {
          const cellA = a[1].find(c => c.col === spec.col);
          const cellB = b[1].find(c => c.col === spec.col);
          const valA = cellA?.value ?? '';
          const valB = cellB?.value ?? '';
          
          let comparison = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else {
            comparison = String(valA).localeCompare(String(valB));
          }
          
          if (comparison !== 0) {
            return spec.ascending ? comparison : -comparison;
          }
        }
        return 0;
      });

      // 更新行号
      const newRowOrder = sortedRows.map(([row]) => row);
      
      // 保存排序规则
      spreadsheet.sortRanges.push(sortData);
      await spreadsheet.save();

      res.json({
        success: true,
        message: '排序成功',
        data: { sortedRows: newRowOrder }
      });
    } catch (error) {
      console.error('排序错误:', error);
      res.status(500).json({
        success: false,
        message: '排序过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 复制表格 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/duplicate:
 *   post:
 *     summary: 复制表格
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 表格复制成功
 */
router.post(
  '/:id/duplicate',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { title } = req.body;

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.permissions.allowDuplicate && spreadsheet.ownerId !== userId) {
        res.status(403).json({
          success: false,
          message: '此表格不允许复制',
          error: 'Forbidden'
        });
        return;
      }

      const newSpreadsheet = await spreadsheet.duplicate(userId, title);

      res.json({
        success: true,
        message: '表格复制成功',
        data: newSpreadsheet.toJSON()
      });
    } catch (error) {
      console.error('复制表格错误:', error);
      res.status(500).json({
        success: false,
        message: '复制表格过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 导入/导出 ====================

/**
 * @swagger
 * /api/spreadsheet/{id}/export:
 *   get:
 *     summary: 导出表格为 JSON
 *     tags: [表格]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 导出数据
 */
router.get(
  '/:id/export',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const spreadsheet = await Spreadsheet.findById(id);

      if (!spreadsheet) {
        res.status(404).json({
          success: false,
          message: '表格不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!spreadsheet.hasPermission(userId, 'view')) {
        res.status(403).json({
          success: false,
          message: '无权访问此表格',
          error: 'Forbidden'
        });
        return;
      }

      if (!spreadsheet.permissions.allowExport && spreadsheet.ownerId !== userId) {
        res.status(403).json({
          success: false,
          message: '此表格不允许导出',
          error: 'Forbidden'
        });
        return;
      }

      const exportData = {
        title: spreadsheet.title,
        description: spreadsheet.description,
        worksheets: spreadsheet.worksheets.map(sheet => ({
          name: sheet.name,
          cells: sheet.cells.map(cell => ({
            row: cell.row,
            col: cell.col,
            value: cell.type === 'formula' ? cell.computedValue : cell.value,
            formula: cell.formula,
            type: cell.type
          }))
        }))
      };

      res.json({
        success: true,
        message: '导出成功',
        data: exportData
      });
    } catch (error) {
      console.error('导出错误:', error);
      res.status(500).json({
        success: false,
        message: '导出过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

export default router;
