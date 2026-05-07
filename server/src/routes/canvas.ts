import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Canvas, { ICanvasElement, ICanvasComment, ICanvasVersion, ICollaborator, IPermissionSettings, ICanvasDocument } from '../models/Canvas';
import { authenticate } from '../middleware/auth';
import { IAuthRequest, IApiResponse } from '../types';

const router = Router();

// 生成唯一颜色（用于协作者光标）
const generateCollaboratorColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// ==================== 画布 CRUD ====================

/**
 * @swagger
 * /api/canvas:
 *   post:
 *     summary: 创建新画布
 *     tags: [画布]
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
 *               canvasWidth:
 *                 type: integer
 *                 default: 1920
 *               canvasHeight:
 *                 type: integer
 *                 default: 1080
 *               backgroundColor:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 画布创建成功
 */
router.post(
  '/',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const {
        title,
        description,
        canvasWidth,
        canvasHeight,
        backgroundColor,
        isTemplate,
        templateCategory,
        tags
      } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          message: '画布标题是必填项',
          error: 'BadRequest'
        });
        return;
      }

      const canvas = new Canvas({
        title: title.trim(),
        description: description?.trim(),
        ownerId: req.user!._id.toString(),
        elements: [],
        collaborators: [],
        permissions: {
          visibility: 'private',
          defaultRole: 'viewer',
          allowExport: true,
          allowDuplicate: true,
          allowComments: true
        },
        canvasWidth: canvasWidth || 1920,
        canvasHeight: canvasHeight || 1080,
        backgroundColor: backgroundColor || '#ffffff',
        isTemplate: isTemplate || false,
        templateCategory,
        tags: tags || []
      });

      await canvas.save();

      res.status(201).json({
        success: true,
        message: '画布创建成功',
        data: canvas.toJSON()
      });
    } catch (error) {
      console.error('创建画布错误:', error);
      res.status(500).json({
        success: false,
        message: '创建画布过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas:
 *   get:
 *     summary: 获取用户的画布列表
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 画布列表
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

      let canvases: any[] = [];

      if (owned === 'true') {
        canvases = await Canvas.findByOwner(userId, options);
      } else if (collaborated === 'true') {
        canvases = await Canvas.findByCollaborator(userId, options);
      } else {
        // 获取所有相关画布（拥有的 + 协作的）
        const [ownedCanvases, collaboratedCanvases] = await Promise.all([
          Canvas.findByOwner(userId, options),
          Canvas.findByCollaborator(userId, options)
        ]);
        
        // 合并并去重
        const canvasMap = new Map();
        [...ownedCanvases, ...collaboratedCanvases].forEach(canvas => {
          canvasMap.set(canvas._id.toString(), canvas);
        });
        canvases = Array.from(canvasMap.values());
      }

      res.json({
        success: true,
        message: '获取画布列表成功',
        data: {
          canvases: canvases.map(c => c.toJSON()),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: canvases.length
          }
        }
      });
    } catch (error) {
      console.error('获取画布列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取画布列表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/templates:
 *   get:
 *     summary: 获取画布模板列表
 *     tags: [画布]
 *     responses:
 *       200:
 *         description: 模板列表
 */
router.get(
  '/templates',
  async (req: Request, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { category } = req.query;
      const templates = await Canvas.findTemplates(category as string | undefined);

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
 * /api/canvas/{id}:
 *   get:
 *     summary: 获取单个画布详情
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 画布详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      // 检查权限
      if (!canvas.hasPermission(userId, 'view')) {
        res.status(403).json({
          success: false,
          message: '无权访问此画布',
          error: 'Forbidden'
        });
        return;
      }

      res.json({
        success: true,
        message: '获取画布成功',
        data: canvas.toJSON()
      });
    } catch (error) {
      console.error('获取画布错误:', error);
      res.status(500).json({
        success: false,
        message: '获取画布过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}:
 *   put:
 *     summary: 更新画布基本信息
 *     tags: [画布]
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

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      // 检查权限（需要编辑权限）
      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此画布',
          error: 'Forbidden'
        });
        return;
      }

      // 允许的更新字段
      const allowedUpdates = [
        'title', 'description', 'canvasWidth', 'canvasHeight',
        'backgroundColor', 'gridSettings', 'thumbnail', 'tags', 'isArchived'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          (canvas as any)[field] = updates[field];
        }
      });

      await canvas.save();

      res.json({
        success: true,
        message: '画布更新成功',
        data: canvas.toJSON()
      });
    } catch (error) {
      console.error('更新画布错误:', error);
      res.status(500).json({
        success: false,
        message: '更新画布过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}:
 *   delete:
 *     summary: 删除画布
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 画布已删除
 */
router.delete(
  '/:id',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      // 只有所有者或管理员可以删除
      if (canvas.ownerId !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权删除此画布',
          error: 'Forbidden'
        });
        return;
      }

      await Canvas.findByIdAndDelete(id);

      res.json({
        success: true,
        message: '画布删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除画布错误:', error);
      res.status(500).json({
        success: false,
        message: '删除画布过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 画布元素操作 ====================

/**
 * @swagger
 * /api/canvas/{id}/elements:
 *   post:
 *     summary: 添加元素到画布
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 元素添加成功
 */
router.post(
  '/:id/elements',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const elementData: ICanvasElement = req.body;

      if (!elementData.id || !elementData.type) {
        res.status(400).json({
          success: false,
          message: '元素ID和类型是必填项',
          error: 'BadRequest'
        });
        return;
      }

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此画布',
          error: 'Forbidden'
        });
        return;
      }

      await canvas.addElement({
        ...elementData,
        createdBy: userId
      });

      res.json({
        success: true,
        message: '元素添加成功',
        data: elementData
      });
    } catch (error) {
      console.error('添加元素错误:', error);
      res.status(500).json({
        success: false,
        message: '添加元素过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/elements/{elementId}:
 *   put:
 *     summary: 更新画布元素
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 元素更新成功
 */
router.put(
  '/:id/elements/:elementId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, elementId } = req.params;
      const userId = req.user!._id.toString();
      const updates = req.body;

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此画布',
          error: 'Forbidden'
        });
        return;
      }

      const success = await canvas.updateElement(elementId as string, updates);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '元素不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '元素更新成功',
        data: { id: elementId, ...updates }
      });
    } catch (error) {
      console.error('更新元素错误:', error);
      res.status(500).json({
        success: false,
        message: '更新元素过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/elements/{elementId}:
 *   delete:
 *     summary: 删除画布元素
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 元素已删除
 */
router.delete(
  '/:id/elements/:elementId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { id, elementId } = req.params;
      const userId = req.user!._id.toString();

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此画布',
          error: 'Forbidden'
        });
        return;
      }

      const success = await canvas.removeElement(elementId as string);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '元素不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '元素删除成功',
        data: null
      });
    } catch (error) {
      console.error('删除元素错误:', error);
      res.status(500).json({
        success: false,
        message: '删除元素过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/elements:
 *   put:
 *     summary: 批量更新画布元素
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 元素更新成功
 */
router.put(
  '/:id/elements',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { elements } = req.body;

      if (!Array.isArray(elements)) {
        res.status(400).json({
          success: false,
          message: 'elements 必须是数组',
          error: 'BadRequest'
        });
        return;
      }

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权编辑此画布',
          error: 'Forbidden'
        });
        return;
      }

      // 批量更新元素
      for (const element of elements) {
        const existingIndex = canvas.elements.findIndex(e => e.id === element.id);
        if (existingIndex >= 0) {
          canvas.elements[existingIndex] = {
            ...canvas.elements[existingIndex],
            ...element,
            updatedAt: new Date()
          };
        }
      }

      await canvas.save();

      res.json({
        success: true,
        message: '元素批量更新成功',
        data: { updatedCount: elements.length }
      });
    } catch (error) {
      console.error('批量更新元素错误:', error);
      res.status(500).json({
        success: false,
        message: '批量更新元素过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 协作权限管理 ====================

/**
 * @swagger
 * /api/canvas/{id}/collaborators:
 *   post:
 *     summary: 添加协作者
 *     tags: [画布]
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

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      // 只有所有者或管理员可以管理协作者
      if (canvas.ownerId !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权管理此画布的协作者',
          error: 'Forbidden'
        });
        return;
      }

      await canvas.addCollaborator({
        userId: collaboratorId,
        userName,
        userAvatar,
        color: generateCollaboratorColor(),
        permissions
      });

      res.json({
        success: true,
        message: '协作者添加成功',
        data: canvas.collaborators.find(c => c.userId === collaboratorId)
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
 * /api/canvas/{id}/collaborators/{userId}:
 *   put:
 *     summary: 更新协作者权限
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 权限更新成功
 */
router.put(
  '/:id/collaborators/:userId',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, userId: collaboratorId } = req.params;
      const currentUserId = req.user!._id.toString();
      const { permissions } = req.body;

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (canvas.ownerId !== currentUserId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权管理此画布的协作者',
          error: 'Forbidden'
        });
        return;
      }

      const collaborator = canvas.collaborators.find(c => c.userId === collaboratorId);
      if (!collaborator) {
        res.status(404).json({
          success: false,
          message: '协作者不存在',
          error: 'NotFound'
        });
        return;
      }

      collaborator.permissions = permissions;
      await canvas.save();

      res.json({
        success: true,
        message: '协作者权限更新成功',
        data: collaborator
      });
    } catch (error) {
      console.error('更新协作者权限错误:', error);
      res.status(500).json({
        success: false,
        message: '更新协作者权限过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/collaborators/{userId}:
 *   delete:
 *     summary: 移除协作者
 *     tags: [画布]
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

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (canvas.ownerId !== currentUserId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权管理此画布的协作者',
          error: 'Forbidden'
        });
        return;
      }

      await canvas.removeCollaborator(collaboratorId as string);

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

/**
 * @swagger
 * /api/canvas/{id}/permissions:
 *   put:
 *     summary: 更新画布权限设置
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 权限设置更新成功
 */
router.put(
  '/:id/permissions',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const permissionUpdates: Partial<IPermissionSettings> = req.body;

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (canvas.ownerId !== userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: '无权修改此画布的权限设置',
          error: 'Forbidden'
        });
        return;
      }

      Object.assign(canvas.permissions, permissionUpdates);
      await canvas.save();

      res.json({
        success: true,
        message: '权限设置更新成功',
        data: canvas.permissions
      });
    } catch (error) {
      console.error('更新权限设置错误:', error);
      res.status(500).json({
        success: false,
        message: '更新权限设置过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 评论功能 ====================

/**
 * @swagger
 * /api/canvas/{id}/comments:
 *   post:
 *     summary: 添加评论
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 评论添加成功
 */
router.post(
  '/:id/comments',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { elementId, content, position } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          message: '评论内容是必填项',
          error: 'BadRequest'
        });
        return;
      }

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'comment')) {
        res.status(403).json({
          success: false,
          message: '无权在此画布发表评论',
          error: 'Forbidden'
        });
        return;
      }

      const commentId = await canvas.addComment({
        elementId,
        userId,
        userName: req.user!.name,
        userAvatar: req.user!.avatar || undefined,
        content,
        position
      });

      res.json({
        success: true,
        message: '评论添加成功',
        data: { id: commentId, elementId, content, position }
      });
    } catch (error) {
      console.error('添加评论错误:', error);
      res.status(500).json({
        success: false,
        message: '添加评论过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/comments/{commentId}/resolve:
 *   put:
 *     summary: 解决评论
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 评论已解决
 */
router.put(
  '/:id/comments/:commentId/resolve',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, commentId } = req.params;
      const userId = req.user!._id.toString();

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'comment')) {
        res.status(403).json({
          success: false,
          message: '无权操作此画布的评论',
          error: 'Forbidden'
        });
        return;
      }

      const comment = canvas.comments.find(c => c.id === commentId);
      if (!comment) {
        res.status(404).json({
          success: false,
          message: '评论不存在',
          error: 'NotFound'
        });
        return;
      }

      comment.resolved = true;
      await canvas.save();

      res.json({
        success: true,
        message: '评论已解决',
        data: comment
      });
    } catch (error) {
      console.error('解决评论错误:', error);
      res.status(500).json({
        success: false,
        message: '解决评论过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 版本历史 ====================

/**
 * @swagger
 * /api/canvas/{id}/versions:
 *   post:
 *     summary: 创建版本快照
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 版本创建成功
 */
router.post(
  '/:id/versions',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { name, description } = req.body;

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权创建此画布的版本',
          error: 'Forbidden'
        });
        return;
      }

      const versionId = await canvas.createVersion({
        name: name || `版本 ${canvas.versions.length + 1}`,
        description,
        createdBy: userId
      });

      res.json({
        success: true,
        message: '版本创建成功',
        data: { id: versionId, name, description }
      });
    } catch (error) {
      console.error('创建版本错误:', error);
      res.status(500).json({
        success: false,
        message: '创建版本过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/versions/{versionId}/restore:
 *   post:
 *     summary: 恢复到指定版本
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 版本恢复成功
 */
router.post(
  '/:id/versions/:versionId/restore',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id, versionId } = req.params;
      const userId = req.user!._id.toString();

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.hasPermission(userId, 'edit')) {
        res.status(403).json({
          success: false,
          message: '无权恢复此画布的版本',
          error: 'Forbidden'
        });
        return;
      }

      const success = await canvas.restoreVersion(versionId as string);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '版本不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '版本恢复成功',
        data: canvas.toJSON()
      });
    } catch (error) {
      console.error('恢复版本错误:', error);
      res.status(500).json({
        success: false,
        message: '恢复版本过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/canvas/{id}/duplicate:
 *   post:
 *     summary: 复制画布
 *     tags: [画布]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 画布复制成功
 */
router.post(
  '/:id/duplicate',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id.toString();
      const { title } = req.body;

      const canvas = await Canvas.findById(id);

      if (!canvas) {
        res.status(404).json({
          success: false,
          message: '画布不存在',
          error: 'NotFound'
        });
        return;
      }

      if (!canvas.permissions.allowDuplicate && canvas.ownerId !== userId) {
        res.status(403).json({
          success: false,
          message: '此画布不允许复制',
          error: 'Forbidden'
        });
        return;
      }

      const newCanvasData: any = canvas.toObject();
      delete newCanvasData._id;
      delete newCanvasData.createdAt;
      delete newCanvasData.updatedAt;

      const newCanvas = new Canvas({
        ...newCanvasData,
        title: title || `${canvas.title} (副本)`,
        ownerId: userId,
        collaborators: [],
        isTemplate: false,
        templateCategory: undefined
      });

      await newCanvas.save();

      res.json({
        success: true,
        message: '画布复制成功',
        data: newCanvas.toJSON()
      });
    } catch (error) {
      console.error('复制画布错误:', error);
      res.status(500).json({
        success: false,
        message: '复制画布过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

export default router;
