import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== Types ==========
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface Cell {
  value: string;
  formula?: string;
  style: CellStyle;
  computed?: string | number;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  rowCount: number;
  colCount: number;
  columnWidths: number[];
  rowHeights: number[];
}

export interface Workbook {
  id: string;
  name: string;
  sheets: Sheet[];
  createdAt: number;
  updatedAt: number;
  activeSheetId: string;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface ClipboardData {
  cells: Record<string, Cell>;
  range: CellRange;
  isCut: boolean;
}

interface HistoryState {
  workbooks: Workbook[];
  selectedCell: CellPosition | null;
}

interface SpreadsheetState {
  workbooks: Workbook[];
  selectedCell: CellPosition | null;
  selectedRange: CellRange | null;
  clipboard: ClipboardData | null;
  undoStack: HistoryState[];
  redoStack: HistoryState[];
  currentWorkbookId: string | null;
}

interface SpreadsheetActions {
  // Workbook actions
  createWorkbook: (name?: string) => string;
  renameWorkbook: (id: string, name: string) => void;
  deleteWorkbook: (id: string) => void;
  setCurrentWorkbook: (id: string | null) => void;

  // Sheet actions
  createSheet: (workbookId: string, name?: string) => string;
  renameSheet: (workbookId: string, sheetId: string, name: string) => void;
  deleteSheet: (workbookId: string, sheetId: string) => void;
  duplicateSheet: (workbookId: string, sheetId: string) => string;
  setActiveSheet: (workbookId: string, sheetId: string) => void;

  // Cell actions
  updateCell: (workbookId: string, sheetId: string, row: number, col: number, value: string, isFormula?: boolean) => void;
  deleteCell: (workbookId: string, sheetId: string, row: number, col: number) => void;
  setCellStyle: (workbookId: string, sheetId: string, row: number, col: number, style: Partial<CellStyle>) => void;

  // Row/Column actions
  insertRow: (workbookId: string, sheetId: string, afterRow: number) => void;
  deleteRow: (workbookId: string, sheetId: string, row: number) => void;
  insertColumn: (workbookId: string, sheetId: string, afterCol: number) => void;
  deleteColumn: (workbookId: string, sheetId: string, col: number) => void;
  setColumnWidth: (workbookId: string, sheetId: string, col: number, width: number) => void;
  setRowHeight: (workbookId: string, sheetId: string, row: number, height: number) => void;

  // Selection actions
  setSelectedCell: (position: CellPosition | null) => void;
  setSelectedRange: (range: CellRange | null) => void;

  // Clipboard actions
  copy: (workbookId: string, sheetId: string, range: CellRange) => void;
  cut: (workbookId: string, sheetId: string, range: CellRange) => void;
  paste: (workbookId: string, sheetId: string, targetRow: number, targetCol: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  saveState: () => void;

  // Formula evaluation
  evaluateFormula: (workbookId: string, sheetId: string, formula: string, currentRow: number, currentCol: number) => string | number;
  recalculateSheet: (workbookId: string, sheetId: string) => void;

  // Getters
  getCurrentWorkbook: () => Workbook | null;
  getCurrentSheet: () => Sheet | null;
  getCell: (workbookId: string, sheetId: string, row: number, col: number) => Cell | null;
  getCellValue: (workbookId: string, sheetId: string, row: number, col: number) => string | number;
}

// ========== Helper Functions ==========
const generateId = () => Math.random().toString(36).substring(2, 15);

const getCellKey = (row: number, col: number) => `${row},${col}`;

const parseCellKey = (key: string): CellPosition => {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
};

const columnToLetter = (col: number): string => {
  let result = '';
  let n = col;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || 'A';
};

const letterToColumn = (letter: string): number => {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result;
};

const parseCellReference = (ref: string): CellPosition | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    col: letterToColumn(match[1]),
    row: parseInt(match[2], 10),
  };
};

const parseRange = (range: string): CellRange | null => {
  const [start, end] = range.split(':');
  const startPos = parseCellReference(start);
  const endPos = end ? parseCellReference(end) : startPos;
  if (!startPos || !endPos) return null;
  return { start: startPos, end: endPos };
};

// ========== Demo Data Generators ==========
const createDefaultSheet = (name: string, rowCount = 50, colCount = 26): Sheet => ({
  id: generateId(),
  name,
  cells: {},
  rowCount,
  colCount,
  columnWidths: Array(colCount).fill(100),
  rowHeights: Array(rowCount).fill(24),
});

const createDemoWorkbook1 = (): Workbook => {
  const sheet = createDefaultSheet('Sheet1', 20, 10);
  
  // 预算表数据
  const budgetData: Record<string, { value: string; formula?: string }> = {
    '1,1': { value: '项目' },
    '1,2': { value: '预算' },
    '1,3': { value: '实际' },
    '1,4': { value: '差异' },
    '2,1': { value: '办公用品' },
    '2,2': { value: '5000' },
    '2,3': { value: '4800' },
    '2,4': { value: '', formula: '=C2-B2' },
    '3,1': { value: '差旅费' },
    '3,2': { value: '10000' },
    '3,3': { value: '9500' },
    '3,4': { value: '', formula: '=C3-B3' },
    '4,1': { value: '培训费' },
    '4,2': { value: '8000' },
    '4,3': { value: '8200' },
    '4,4': { value: '', formula: '=C4-B4' },
    '5,1': { value: '设备采购' },
    '5,2': { value: '50000' },
    '5,3': { value: '48500' },
    '5,4': { value: '', formula: '=C5-B5' },
    '6,1': { value: '总计' },
    '6,2': { value: '', formula: '=SUM(B2:B5)' },
    '6,3': { value: '', formula: '=SUM(C2:C5)' },
    '6,4': { value: '', formula: '=SUM(D2:D5)' },
  };

  Object.entries(budgetData).forEach(([key, data]) => {
    sheet.cells[key] = {
      value: data.value,
      formula: data.formula,
      style: { align: 'left' },
    };
  });

  // 设置表头样式
  for (let col = 1; col <= 4; col++) {
    const key = getCellKey(1, col);
    if (sheet.cells[key]) {
      sheet.cells[key].style = {
        ...sheet.cells[key].style,
        bold: true,
        bgColor: '#10b981',
        textColor: '#ffffff',
        align: 'center',
      };
    }
  }

  return {
    id: generateId(),
    name: '预算表',
    sheets: [sheet],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeSheetId: sheet.id,
  };
};

const createDemoWorkbook2 = (): Workbook => {
  const sheet = createDefaultSheet('Sheet1', 15, 8);
  
  // 销售数据
  const salesData: Record<string, { value: string; formula?: string }> = {
    '1,1': { value: '月份' },
    '1,2': { value: '产品A' },
    '1,3': { value: '产品B' },
    '1,4': { value: '产品C' },
    '1,5': { value: '总计' },
    '1,6': { value: '平均' },
    '2,1': { value: '1月' },
    '2,2': { value: '120' },
    '2,3': { value: '85' },
    '2,4': { value: '95' },
    '2,5': { value: '', formula: '=SUM(B2:D2)' },
    '2,6': { value: '', formula: '=AVERAGE(B2:D2)' },
    '3,1': { value: '2月' },
    '3,2': { value: '135' },
    '3,3': { value: '92' },
    '3,4': { value: '108' },
    '3,5': { value: '', formula: '=SUM(B3:D3)' },
    '3,6': { value: '', formula: '=AVERAGE(B3:D3)' },
    '4,1': { value: '3月' },
    '4,2': { value: '148' },
    '4,3': { value: '105' },
    '4,4': { value: '122' },
    '4,5': { value: '', formula: '=SUM(B4:D4)' },
    '4,6': { value: '', formula: '=AVERAGE(B4:D4)' },
    '5,1': { value: '4月' },
    '5,2': { value: '162' },
    '5,3': { value: '118' },
    '5,4': { value: '135' },
    '5,5': { value: '', formula: '=SUM(B5:D5)' },
    '5,6': { value: '', formula: '=AVERAGE(B5:D5)' },
    '6,1': { value: '5月' },
    '6,2': { value: '175' },
    '6,3': { value: '125' },
    '6,4': { value: '148' },
    '6,5': { value: '', formula: '=SUM(B6:D6)' },
    '6,6': { value: '', formula: '=AVERAGE(B6:D6)' },
    '7,1': { value: '6月' },
    '7,2': { value: '188' },
    '7,3': { value: '138' },
    '7,4': { value: '162' },
    '7,5': { value: '', formula: '=SUM(B7:D7)' },
    '7,6': { value: '', formula: '=AVERAGE(B7:D7)' },
    '8,1': { value: '合计' },
    '8,2': { value: '', formula: '=SUM(B2:B7)' },
    '8,3': { value: '', formula: '=SUM(C2:C7)' },
    '8,4': { value: '', formula: '=SUM(D2:D7)' },
    '8,5': { value: '', formula: '=SUM(E2:E7)' },
    '8,6': { value: '', formula: '=AVERAGE(E2:E7)' },
  };

  Object.entries(salesData).forEach(([key, data]) => {
    sheet.cells[key] = {
      value: data.value,
      formula: data.formula,
      style: { align: 'center' },
    };
  });

  // 设置表头样式
  for (let col = 1; col <= 6; col++) {
    const key = getCellKey(1, col);
    if (sheet.cells[key]) {
      sheet.cells[key].style = {
        ...sheet.cells[key].style,
        bold: true,
        bgColor: '#059669',
        textColor: '#ffffff',
      };
    }
  }

  // 设置合计行样式
  for (let col = 1; col <= 6; col++) {
    const key = getCellKey(8, col);
    if (sheet.cells[key]) {
      sheet.cells[key].style = {
        ...sheet.cells[key].style,
        bold: true,
        bgColor: '#d1fae5',
      };
    }
  }

  return {
    id: generateId(),
    name: '销售数据',
    sheets: [sheet],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeSheetId: sheet.id,
  };
};

const createDemoWorkbook3 = (): Workbook => {
  const sheet = createDefaultSheet('Sheet1', 12, 7);
  
  // 项目进度表
  const projectData: Record<string, { value: string; formula?: string }> = {
    '1,1': { value: '任务' },
    '1,2': { value: '负责人' },
    '1,3': { value: '开始日期' },
    '1,4': { value: '结束日期' },
    '1,5': { value: '进度%' },
    '1,6': { value: '状态' },
    '2,1': { value: '需求分析' },
    '2,2': { value: '张三' },
    '2,3': { value: '2024-01-01' },
    '2,4': { value: '2024-01-15' },
    '2,5': { value: '100' },
    '2,6': { value: '已完成' },
    '3,1': { value: 'UI设计' },
    '3,2': { value: '李四' },
    '3,3': { value: '2024-01-10' },
    '3,4': { value: '2024-01-25' },
    '3,5': { value: '100' },
    '3,6': { value: '已完成' },
    '4,1': { value: '前端开发' },
    '4,2': { value: '王五' },
    '4,3': { value: '2024-01-20' },
    '4,4': { value: '2024-02-20' },
    '4,5': { value: '75' },
    '4,6': { value: '进行中' },
    '5,1': { value: '后端开发' },
    '5,2': { value: '赵六' },
    '5,3': { value: '2024-01-20' },
    '5,4': { value: '2024-02-25' },
    '5,5': { value: '60' },
    '5,6': { value: '进行中' },
    '6,1': { value: '测试' },
    '6,2': { value: '钱七' },
    '6,3': { value: '2024-02-15' },
    '6,4': { value: '2024-03-05' },
    '6,5': { value: '20' },
    '6,6': { value: '待开始' },
    '7,1': { value: '部署上线' },
    '7,2': { value: '孙八' },
    '7,3': { value: '2024-03-01' },
    '7,4': { value: '2024-03-10' },
    '7,5': { value: '0' },
    '7,6': { value: '待开始' },
    '8,1': { value: '平均进度' },
    '8,2': { value: '', formula: '=AVERAGE(E2:E7)' },
  };

  Object.entries(projectData).forEach(([key, data]) => {
    sheet.cells[key] = {
      value: data.value,
      formula: data.formula,
      style: { align: 'left' },
    };
  });

  // 设置表头样式
  for (let col = 1; col <= 6; col++) {
    const key = getCellKey(1, col);
    if (sheet.cells[key]) {
      sheet.cells[key].style = {
        ...sheet.cells[key].style,
        bold: true,
        bgColor: '#10b981',
        textColor: '#ffffff',
        align: 'center',
      };
    }
  }

  return {
    id: generateId(),
    name: '项目进度',
    sheets: [sheet],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activeSheetId: sheet.id,
  };
};

// ========== Store ==========
export const useSpreadsheetStore = create<SpreadsheetState & SpreadsheetActions>()(
  persist(
    (set, get) => ({
      // Initial state
      workbooks: [createDemoWorkbook1(), createDemoWorkbook2(), createDemoWorkbook3()],
      selectedCell: { row: 1, col: 1 },
      selectedRange: null,
      clipboard: null,
      undoStack: [],
      redoStack: [],
      currentWorkbookId: null,

      // Workbook actions
      createWorkbook: (name = '新建工作簿') => {
        const id = generateId();
        const sheet = createDefaultSheet('Sheet1');
        const workbook: Workbook = {
          id,
          name,
          sheets: [sheet],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          activeSheetId: sheet.id,
        };
        set((state) => ({
          workbooks: [...state.workbooks, workbook],
          currentWorkbookId: id,
          selectedCell: { row: 1, col: 1 },
          selectedRange: null,
        }));
        return id;
      },

      renameWorkbook: (id, name) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) =>
            wb.id === id ? { ...wb, name, updatedAt: Date.now() } : wb
          ),
        }));
      },

      deleteWorkbook: (id) => {
        set((state) => {
          const newWorkbooks = state.workbooks.filter((wb) => wb.id !== id);
          return {
            workbooks: newWorkbooks,
            currentWorkbookId: state.currentWorkbookId === id ? null : state.currentWorkbookId,
          };
        });
      },

      setCurrentWorkbook: (id) => {
        set({ currentWorkbookId: id, selectedCell: { row: 1, col: 1 }, selectedRange: null });
      },

      // Sheet actions
      createSheet: (workbookId, name) => {
        const sheet = createDefaultSheet(name || `Sheet${get().workbooks.find(wb => wb.id === workbookId)?.sheets.length || 1 + 1}`);
        set((state) => ({
          workbooks: state.workbooks.map((wb) =>
            wb.id === workbookId
              ? { ...wb, sheets: [...wb.sheets, sheet], updatedAt: Date.now() }
              : wb
          ),
        }));
        return sheet.id;
      },

      renameSheet: (workbookId, sheetId, name) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) =>
            wb.id === workbookId
              ? {
                  ...wb,
                  sheets: wb.sheets.map((s) => (s.id === sheetId ? { ...s, name } : s)),
                  updatedAt: Date.now(),
                }
              : wb
          ),
        }));
      },

      deleteSheet: (workbookId, sheetId) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            const newSheets = wb.sheets.filter((s) => s.id !== sheetId);
            return {
              ...wb,
              sheets: newSheets,
              activeSheetId: newSheets.length > 0 ? newSheets[0].id : '',
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      duplicateSheet: (workbookId, sheetId) => {
        const newId = generateId();
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            const sheet = wb.sheets.find((s) => s.id === sheetId);
            if (!sheet) return wb;
            const newSheet: Sheet = {
              ...sheet,
              id: newId,
              name: `${sheet.name} (副本)`,
              cells: JSON.parse(JSON.stringify(sheet.cells)),
            };
            return {
              ...wb,
              sheets: [...wb.sheets, newSheet],
              updatedAt: Date.now(),
            };
          }),
        }));
        return newId;
      },

      setActiveSheet: (workbookId, sheetId) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) =>
            wb.id === workbookId ? { ...wb, activeSheetId: sheetId } : wb
          ),
        }));
      },

      // Cell actions
      updateCell: (workbookId, sheetId, row, col, value, isFormula = false) => {
        get().saveState();
        const key = getCellKey(row, col);
        
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const existingCell = s.cells[key];
                const newCell: Cell = {
                  ...existingCell,
                  value: isFormula ? '' : value,
                  formula: isFormula ? value : undefined,
                  style: existingCell?.style || { align: 'left' },
                };
                
                // Evaluate formula if present
                if (isFormula && value.startsWith('=')) {
                  newCell.computed = get().evaluateFormula(workbookId, sheetId, value, row, col);
                } else {
                  newCell.computed = undefined;
                }
                
                return {
                  ...s,
                  cells: { ...s.cells, [key]: newCell },
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));

        // Recalculate dependent cells
        get().recalculateSheet(workbookId, sheetId);
      },

      deleteCell: (workbookId, sheetId, row, col) => {
        get().saveState();
        const key = getCellKey(row, col);
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const { [key]: _, ...restCells } = s.cells;
                return { ...s, cells: restCells };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setCellStyle: (workbookId, sheetId, row, col, style) => {
        const key = getCellKey(row, col);
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const existingCell = s.cells[key];
                return {
                  ...s,
                  cells: {
                    ...s.cells,
                    [key]: {
                      value: existingCell?.value || '',
                      formula: existingCell?.formula,
                      style: { ...existingCell?.style, ...style },
                      computed: existingCell?.computed,
                    },
                  },
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      // Row/Column actions
      insertRow: (workbookId, sheetId, afterRow) => {
        get().saveState();
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, Cell> = {};
                Object.entries(s.cells).forEach(([key, cell]) => {
                  const pos = parseCellKey(key);
                  if (pos.row > afterRow) {
                    newCells[getCellKey(pos.row + 1, pos.col)] = cell;
                  } else {
                    newCells[key] = cell;
                  }
                });
                return {
                  ...s,
                  cells: newCells,
                  rowCount: s.rowCount + 1,
                  rowHeights: [...s.rowHeights.slice(0, afterRow), 24, ...s.rowHeights.slice(afterRow)],
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteRow: (workbookId, sheetId, row) => {
        get().saveState();
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, Cell> = {};
                Object.entries(s.cells).forEach(([key, cell]) => {
                  const pos = parseCellKey(key);
                  if (pos.row < row) {
                    newCells[key] = cell;
                  } else if (pos.row > row) {
                    newCells[getCellKey(pos.row - 1, pos.col)] = cell;
                  }
                });
                return {
                  ...s,
                  cells: newCells,
                  rowCount: Math.max(1, s.rowCount - 1),
                  rowHeights: s.rowHeights.filter((_, i) => i !== row - 1),
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      insertColumn: (workbookId, sheetId, afterCol) => {
        get().saveState();
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, Cell> = {};
                Object.entries(s.cells).forEach(([key, cell]) => {
                  const pos = parseCellKey(key);
                  if (pos.col > afterCol) {
                    newCells[getCellKey(pos.row, pos.col + 1)] = cell;
                  } else {
                    newCells[key] = cell;
                  }
                });
                return {
                  ...s,
                  cells: newCells,
                  colCount: s.colCount + 1,
                  columnWidths: [...s.columnWidths.slice(0, afterCol), 100, ...s.columnWidths.slice(afterCol)],
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteColumn: (workbookId, sheetId, col) => {
        get().saveState();
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, Cell> = {};
                Object.entries(s.cells).forEach(([key, cell]) => {
                  const pos = parseCellKey(key);
                  if (pos.col < col) {
                    newCells[key] = cell;
                  } else if (pos.col > col) {
                    newCells[getCellKey(pos.row, pos.col - 1)] = cell;
                  }
                });
                return {
                  ...s,
                  cells: newCells,
                  colCount: Math.max(1, s.colCount - 1),
                  columnWidths: s.columnWidths.filter((_, i) => i !== col - 1),
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setColumnWidth: (workbookId, sheetId, col, width) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newWidths = [...s.columnWidths];
                newWidths[col - 1] = width;
                return { ...s, columnWidths: newWidths };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setRowHeight: (workbookId, sheetId, row, height) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newHeights = [...s.rowHeights];
                newHeights[row - 1] = height;
                return { ...s, rowHeights: newHeights };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      // Selection actions
      setSelectedCell: (position) => set({ selectedCell: position, selectedRange: null }),
      setSelectedRange: (range) => set({ selectedRange: range }),

      // Clipboard actions
      copy: (workbookId, sheetId, range) => {
        const sheet = get().workbooks.find(wb => wb.id === workbookId)?.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        
        const cells: Record<string, Cell> = {};
        for (let r = range.start.row; r <= range.end.row; r++) {
          for (let c = range.start.col; c <= range.end.col; c++) {
            const key = getCellKey(r, c);
            if (sheet.cells[key]) {
              cells[key] = JSON.parse(JSON.stringify(sheet.cells[key]));
            }
          }
        }
        
        set({ clipboard: { cells, range, isCut: false } });
      },

      cut: (workbookId, sheetId, range) => {
        get().copy(workbookId, sheetId, range);
        set((state) => ({
          clipboard: state.clipboard ? { ...state.clipboard, isCut: true } : null,
        }));
      },

      paste: (workbookId, sheetId, targetRow, targetCol) => {
        const { clipboard } = get();
        if (!clipboard) return;
        
        get().saveState();
        const rowOffset = targetRow - clipboard.range.start.row;
        const colOffset = targetCol - clipboard.range.start.col;
        
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells = { ...s.cells };
                
                Object.entries(clipboard.cells).forEach(([key, cell]) => {
                  const pos = parseCellKey(key);
                  const newRow = pos.row + rowOffset;
                  const newCol = pos.col + colOffset;
                  const newKey = getCellKey(newRow, newCol);
                  newCells[newKey] = JSON.parse(JSON.stringify(cell));
                });
                
                // If cut, remove original cells
                if (clipboard.isCut) {
                  Object.keys(clipboard.cells).forEach((key) => {
                    delete newCells[key];
                  });
                }
                
                return { ...s, cells: newCells };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
        
        if (clipboard.isCut) {
          set({ clipboard: null });
        }
      },

      // Undo/Redo
      saveState: () => {
        const { workbooks, selectedCell } = get();
        set((state) => ({
          undoStack: [...state.undoStack.slice(-19), { workbooks: JSON.parse(JSON.stringify(workbooks)), selectedCell }],
          redoStack: [],
        }));
      },

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        
        const currentState = {
          workbooks: JSON.parse(JSON.stringify(get().workbooks)),
          selectedCell: get().selectedCell,
        };
        
        const previousState = undoStack[undoStack.length - 1];
        set((state) => ({
          workbooks: previousState.workbooks,
          selectedCell: previousState.selectedCell,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, currentState],
        }));
      },

      redo: () => {
        const { redoStack } = get();
        if (redoStack.length === 0) return;
        
        const currentState = {
          workbooks: JSON.parse(JSON.stringify(get().workbooks)),
          selectedCell: get().selectedCell,
        };
        
        const nextState = redoStack[redoStack.length - 1];
        set((state) => ({
          workbooks: nextState.workbooks,
          selectedCell: nextState.selectedCell,
          undoStack: [...state.undoStack, currentState],
          redoStack: state.redoStack.slice(0, -1),
        }));
      },

      // Formula evaluation
      evaluateFormula: (workbookId, sheetId, formula) => {
        if (!formula.startsWith('=')) return formula;
        
        const expression = formula.substring(1).toUpperCase();
        const sheet = get().workbooks.find(wb => wb.id === workbookId)?.sheets.find(s => s.id === sheetId);
        
        if (!sheet) return '#REF!';

        const getCellValueForFormula = (ref: string): number => {
          // Handle relative references
          let finalRef = ref;
          if (ref.startsWith('R') && ref.includes('C')) {
            // R1C1 format - convert to A1
            const match = ref.match(/R(\d+)C(\d+)/);
            if (match) {
              finalRef = `${columnToLetter(parseInt(match[2]))}${match[1]}`;
            }
          }
          
          const pos = parseCellReference(finalRef);
          if (!pos) return 0;
          
          const key = getCellKey(pos.row, pos.col);
          const cell = sheet.cells[key];
          if (!cell) return 0;
          
          if (cell.formula && cell.computed !== undefined) {
            return typeof cell.computed === 'number' ? cell.computed : parseFloat(cell.computed) || 0;
          }
          
          return parseFloat(cell.value) || 0;
        };

        const evaluateExpression = (expr: string): number => {
          // Replace cell references with values
          let processedExpr = expr;
          
          // Handle ranges for functions
          const rangeMatches = expr.match(/([A-Z]+\d+):([A-Z]+\d+)/g);
          if (rangeMatches) {
            rangeMatches.forEach((range) => {
              const parsedRange = parseRange(range);
              if (parsedRange) {
                const values: number[] = [];
                for (let r = parsedRange.start.row; r <= parsedRange.end.row; r++) {
                  for (let c = parsedRange.start.col; c <= parsedRange.end.col; c++) {
                    values.push(getCellValueForFormula(`${columnToLetter(c)}${r}`));
                  }
                }
                // Store values for function processing
                processedExpr = processedExpr.replace(range, `[${values.join(',')}]`);
              }
            });
          }
          
          // Replace individual cell references
          processedExpr = processedExpr.replace(/[A-Z]+\d+/g, (match) => {
            return getCellValueForFormula(match).toString();
          });

          // Process functions
          const functionMatch = processedExpr.match(/^(\w+)\((.*)\)$/);
          if (functionMatch) {
            const [, funcName, args] = functionMatch;
            const argValues = args.includes('[') 
              ? args.match(/\[.*?\]/g)?.map(s => s.slice(1, -1).split(',').map(Number)).flat() || []
              : args.split(',').map(s => parseFloat(s.trim()) || 0).filter(n => !isNaN(n));
            
            switch (funcName) {
              case 'SUM':
                return argValues.reduce((a, b) => a + b, 0);
              case 'AVERAGE':
                return argValues.length > 0 ? argValues.reduce((a, b) => a + b, 0) / argValues.length : 0;
              case 'MAX':
                return Math.max(...argValues);
              case 'MIN':
                return Math.min(...argValues);
              case 'COUNT':
                return argValues.length;
              case 'IF':
                const [condition, trueVal, falseVal] = args.split(',').map(s => s.trim());
                // Simple condition evaluation
                const evalCondition = (cond: string): boolean => {
                  if (cond.includes('>')) {
                    const [left, right] = cond.split('>').map(s => parseFloat(s.trim()));
                    return left > right;
                  }
                  if (cond.includes('<')) {
                    const [left, right] = cond.split('<').map(s => parseFloat(s.trim()));
                    return left < right;
                  }
                  if (cond.includes('=')) {
                    const [left, right] = cond.split('=').map(s => parseFloat(s.trim()));
                    return left === right;
                  }
                  return parseFloat(cond) !== 0;
                };
                return evalCondition(condition) ? parseFloat(trueVal) || 0 : parseFloat(falseVal) || 0;
              case 'CONCATENATE':
                return 0; // CONCATENATE returns string, but we simplify to 0 for numeric evaluation
              default:
                return 0;
            }
          }

          // Basic math evaluation
          try {
            // eslint-disable-next-line no-eval
            return eval(processedExpr) || 0;
          } catch {
            return 0;
          }
        };

        try {
          const result = evaluateExpression(expression);
          return isNaN(result) ? 0 : result;
        } catch {
          return '#ERROR!';
        }
      },

      recalculateSheet: (workbookId, sheetId) => {
        set((state) => ({
          workbooks: state.workbooks.map((wb) => {
            if (wb.id !== workbookId) return wb;
            return {
              ...wb,
              sheets: wb.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells = { ...s.cells };
                
                Object.entries(newCells).forEach(([key, cell]) => {
                  if (cell.formula) {
                    const pos = parseCellKey(key);
                    const computed = get().evaluateFormula(workbookId, sheetId, cell.formula, pos.row, pos.col);
                    newCells[key] = { ...cell, computed };
                  }
                });
                
                return { ...s, cells: newCells };
              }),
            };
          }),
        }));
      },

      // Getters
      getCurrentWorkbook: () => {
        const { workbooks, currentWorkbookId } = get();
        return workbooks.find((wb) => wb.id === currentWorkbookId) || workbooks[0] || null;
      },

      getCurrentSheet: () => {
        const workbook = get().getCurrentWorkbook();
        if (!workbook) return null;
        return workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0] || null;
      },

      getCell: (workbookId, sheetId, row, col) => {
        const workbook = get().workbooks.find((wb) => wb.id === workbookId);
        if (!workbook) return null;
        const sheet = workbook.sheets.find((s) => s.id === sheetId);
        if (!sheet) return null;
        return sheet.cells[getCellKey(row, col)] || null;
      },

      getCellValue: (workbookId, sheetId, row, col) => {
        const cell = get().getCell(workbookId, sheetId, row, col);
        if (!cell) return '';
        if (cell.computed !== undefined) return cell.computed;
        return cell.value;
      },
    }),
    {
      name: 'spreadsheet-storage',
      partialize: (state) => ({
        workbooks: state.workbooks,
        currentWorkbookId: state.currentWorkbookId,
      }),
    }
  )
);

export { columnToLetter, letterToColumn, parseCellReference, parseRange, getCellKey, parseCellKey };
