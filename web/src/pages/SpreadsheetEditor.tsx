import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Check,
  FunctionSquare,
  Sigma,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  useSpreadsheetStore,
  columnToLetter,
  getCellKey,
  CellPosition,
  Cell,
} from '../store/useSpreadsheetStore';

// ========== Constants ==========
const MIN_COLUMN_WIDTH = 40;
const MIN_ROW_HEIGHT = 20;
const DEFAULT_ZOOM = 100;
const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

const FORMULA_FUNCTIONS = [
  'SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT', 'IF', 'CONCATENATE'
];

// ========== Helper Components ==========
const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={label}
      >
        <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} />
        <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="grid grid-cols-5 gap-1">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setIsOpen(false); }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  items: { label: string; onClick: () => void; disabled?: boolean; separator?: boolean }[];
}> = ({ x, y, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ left: x, top: y }}
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[160px]"
    >
      {items.map((item, index) => (
        item.separator ? (
          <div key={index} className="my-1 border-t border-gray-200 dark:border-gray-700" />
        ) : (
          <button
            key={index}
            onClick={() => { item.onClick(); onClose(); }}
            disabled={item.disabled}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.label}
          </button>
        )
      ))}
    </motion.div>
  );
};

// ========== Main Component ==========
const SpreadsheetEditor: React.FC = () => {
  const { t } = useTranslation();
  const {
    workbooks,
    selectedCell,
    selectedRange,
    clipboard,
    undoStack,
    redoStack,
    currentWorkbookId,
    createWorkbook,
    renameWorkbook,
    deleteWorkbook,
    setCurrentWorkbook,
    createSheet,
    renameSheet,
    deleteSheet,
    duplicateSheet,
    setActiveSheet,
    updateCell,
    deleteCell,
    setCellStyle,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    setColumnWidth,
    setRowHeight,
    setSelectedCell,
    setSelectedRange,
    copy,
    cut,
    paste,
    undo,
    redo,
    getCurrentWorkbook,
    getCurrentSheet,
    getCell,
  } = useSpreadsheetStore();

  // Local state
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [showFormulaAutocomplete, setShowFormulaAutocomplete] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'cell' | 'sheet' | 'header'; data?: any } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null);
  const [showWorkbookList, setShowWorkbookList] = useState(false);
  const [renamingWorkbook, setRenamingWorkbook] = useState<string | null>(null);
  const [renamingSheet, setRenamingSheet] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);

  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Get current workbook and sheet
  const currentWorkbook = getCurrentWorkbook();
  const currentSheet = getCurrentSheet();

  // Initialize with first workbook if none selected
  useEffect(() => {
    if (!currentWorkbookId && workbooks.length > 0) {
      setCurrentWorkbook(workbooks[0].id);
    }
  }, [currentWorkbookId, workbooks, setCurrentWorkbook]);

  // Update formula bar when selection changes
  useEffect(() => {
    if (selectedCell && currentWorkbook && currentSheet) {
      const cell = getCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
      setFormulaBarValue(cell?.formula ? cell.formula : (cell?.value || ''));
    }
  }, [selectedCell, currentWorkbook, currentSheet, getCell]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentWorkbook || !currentSheet) return;
      if (editingCell) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (ctrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        if (selectedRange) {
          copy(currentWorkbook.id, currentSheet.id, selectedRange);
        } else if (selectedCell) {
          copy(currentWorkbook.id, currentSheet.id, { start: selectedCell, end: selectedCell });
        }
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        if (selectedRange) {
          cut(currentWorkbook.id, currentSheet.id, selectedRange);
        } else if (selectedCell) {
          cut(currentWorkbook.id, currentSheet.id, { start: selectedCell, end: selectedCell });
        }
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        if (clipboard && selectedCell) {
          paste(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
        }
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedRange) {
          for (let r = selectedRange.start.row; r <= selectedRange.end.row; r++) {
            for (let c = selectedRange.start.col; c <= selectedRange.end.col; c++) {
              deleteCell(currentWorkbook.id, currentSheet.id, r, c);
            }
          }
        } else if (selectedCell) {
          deleteCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        navigateWithArrow(e.key, e.shiftKey);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedCell) {
          startEdit(selectedCell);
        }
      } else if (e.key.length === 1 && !ctrl) {
        // Start editing with the pressed key
        if (selectedCell) {
          startEdit(selectedCell, e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWorkbook, currentSheet, selectedCell, selectedRange, editingCell, clipboard, undo, redo, copy, cut, paste, deleteCell]);

  // Navigation
  const navigateWithArrow = (key: string, shift: boolean) => {
    if (!selectedCell) return;
    let newRow = selectedCell.row;
    let newCol = selectedCell.col;

    switch (key) {
      case 'ArrowUp': newRow = Math.max(1, newRow - 1); break;
      case 'ArrowDown': newRow = newRow + 1; break;
      case 'ArrowLeft': newCol = Math.max(1, newCol - 1); break;
      case 'ArrowRight': newCol = newCol + 1; break;
    }

    const newPos = { row: newRow, col: newCol };
    
    if (shift && selectionStart) {
      setSelectedRange({ start: selectionStart, end: newPos });
      setSelectedCell(newPos);
    } else {
      setSelectionStart(newPos);
      setSelectedCell(newPos);
      setSelectedRange(null);
    }
  };

  // Edit operations
  const startEdit = (pos: CellPosition, initialValue = '') => {
    setEditingCell(pos);
    const cell = currentWorkbook && currentSheet ? getCell(currentWorkbook.id, currentSheet.id, pos.row, pos.col) : null;
    setEditValue(initialValue || (cell?.formula || cell?.value || ''));
    setTimeout(() => cellInputRef.current?.focus(), 0);
  };

  const confirmEdit = () => {
    if (!editingCell || !currentWorkbook || !currentSheet) return;
    const isFormula = editValue.startsWith('=');
    updateCell(currentWorkbook.id, currentSheet.id, editingCell.row, editingCell.col, editValue, isFormula);
    setEditingCell(null);
    setEditValue('');
    setShowFormulaAutocomplete(false);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setShowFormulaAutocomplete(false);
  };

  // Formula bar change
  const handleFormulaBarChange = (value: string) => {
    setFormulaBarValue(value);
    if (selectedCell && currentWorkbook && currentSheet) {
      const isFormula = value.startsWith('=');
      updateCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, value, isFormula);
    }
  };

  // Cell click handlers
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pos = { row, col };
    setSelectionStart(pos);
    setSelectedCell(pos);
    setSelectedRange(null);
    setIsSelecting(true);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;
    setSelectedRange({
      start: selectionStart,
      end: { row, col }
    });
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    startEdit({ row, col });
  };

  const handleCellContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'cell', data: { row, col } });
  };

  // Header context menu
  const handleHeaderContextMenu = (e: React.MouseEvent, type: 'row' | 'col', index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'header', data: { type, index } });
  };

  // Column resize
  const handleColumnResizeStart = (col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(col);
    setResizeStartX(e.clientX);
    if (currentSheet) {
      setResizeStartWidth(currentSheet.columnWidths[col - 1] || 100);
    }
  };

  // Row resize
  const handleRowResizeStart = (row: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRow(row);
    setResizeStartY(e.clientY);
    if (currentSheet) {
      setResizeStartHeight(currentSheet.rowHeights[row - 1] || 24);
    }
  };

  // Mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn !== null && currentWorkbook && currentSheet) {
        const delta = e.clientX - resizeStartX;
        const newWidth = Math.max(MIN_COLUMN_WIDTH, resizeStartWidth + delta);
        setColumnWidth(currentWorkbook.id, currentSheet.id, resizingColumn, newWidth);
      }
      if (resizingRow !== null && currentWorkbook && currentSheet) {
        const delta = e.clientY - resizeStartY;
        const newHeight = Math.max(MIN_ROW_HEIGHT, resizeStartHeight + delta);
        setRowHeight(currentWorkbook.id, currentSheet.id, resizingRow, newHeight);
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      setResizingRow(null);
    };

    if (resizingColumn !== null || resizingRow !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingColumn, resizingRow, resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight, currentWorkbook, currentSheet, setColumnWidth, setRowHeight]);

  // Style operations
  const toggleBold = () => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    const cell = getCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, {
      bold: !cell?.style?.bold
    });
  };

  const toggleItalic = () => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    const cell = getCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, {
      italic: !cell?.style?.italic
    });
  };

  const toggleUnderline = () => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    const cell = getCell(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, {
      underline: !cell?.style?.underline
    });
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, { align });
  };

  const setBgColor = (color: string) => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, { bgColor: color });
  };

  const setTextColor = (color: string) => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, { textColor: color });
  };

  const setFontSize = (size: number) => {
    if (!selectedCell || !currentWorkbook || !currentSheet) return;
    setCellStyle(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col, { fontSize: size });
  };

  // Check if cell is in selected range
  const isCellSelected = (row: number, col: number) => {
    if (!selectedCell) return false;
    if (selectedRange) {
      return (
        row >= Math.min(selectedRange.start.row, selectedRange.end.row) &&
        row <= Math.max(selectedRange.start.row, selectedRange.end.row) &&
        col >= Math.min(selectedRange.start.col, selectedRange.end.col) &&
        col <= Math.max(selectedRange.start.col, selectedRange.end.col)
      );
    }
    return selectedCell.row === row && selectedCell.col === col;
  };

  // Get cell display value
  const getCellDisplayValue = (cell: Cell | null): string => {
    if (!cell) return '';
    if (cell.computed !== undefined) return String(cell.computed);
    return cell.value;
  };

  // Calculate selection stats
  const selectionStats = useMemo(() => {
    if (!selectedRange || !currentWorkbook || !currentSheet) return null;
    let count = 0;
    let sum = 0;
    let validCount = 0;
    
    for (let r = Math.min(selectedRange.start.row, selectedRange.end.row); r <= Math.max(selectedRange.start.row, selectedRange.end.row); r++) {
      for (let c = Math.min(selectedRange.start.col, selectedRange.end.col); c <= Math.max(selectedRange.start.col, selectedRange.end.col); c++) {
        const cell = getCell(currentWorkbook.id, currentSheet.id, r, c);
        count++;
        const val = parseFloat(getCellDisplayValue(cell));
        if (!isNaN(val)) {
          sum += val;
          validCount++;
        }
      }
    }
    
    return { count, sum, average: validCount > 0 ? sum / validCount : 0 };
  }, [selectedRange, currentWorkbook, currentSheet, getCell]);

  // Render cell reference
  const getCellReference = (pos: CellPosition | null) => {
    if (!pos) return '';
    return `${columnToLetter(pos.col)}${pos.row}`;
  };

  if (!currentWorkbook || !currentSheet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <Grid3X3 className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('spreadsheet.noWorkbooks')}
        </h2>
        <button
          onClick={() => createWorkbook()}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          {t('spreadsheet.createFirst')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* File/Edit Menu Bar */}
        <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={() => setShowWorkbookList(!showWorkbookList)}
              className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">{currentWorkbook.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showWorkbookList && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-12 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px]"
                >
                  {workbooks.map((wb) => (
                    <div
                      key={wb.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => { setCurrentWorkbook(wb.id); setShowWorkbookList(false); }}
                    >
                      <span className={wb.id === currentWorkbook.id ? 'font-medium text-green-600' : ''}>
                        {wb.name}
                      </span>
                      {wb.id === currentWorkbook.id && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                    <button
                      onClick={() => { createWorkbook(); setShowWorkbookList(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {t('spreadsheet.newWorkbook')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => createWorkbook()}
              className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('spreadsheet.newWorkbook')}
            </button>
            <button
              onClick={() => setRenamingWorkbook(currentWorkbook.id)}
              className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('spreadsheet.rename')}
            </button>
            <button
              onClick={() => deleteWorkbook(currentWorkbook.id)}
              className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 transition-colors"
            >
              {t('spreadsheet.delete')}
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-4" />

          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              title={t('spreadsheet.undo')}
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
              title={t('spreadsheet.redo')}
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Toolbar */}
        <div className="flex items-center px-4 py-2 gap-2 flex-wrap">
          {/* Font Style */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={toggleBold}
              className={`p-1.5 rounded transition-colors ${
                getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.bold
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('spreadsheet.bold')}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={toggleItalic}
              className={`p-1.5 rounded transition-colors ${
                getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.italic
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('spreadsheet.italic')}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={toggleUnderline}
              className={`p-1.5 rounded transition-colors ${
                getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.underline
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('spreadsheet.underline')}
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Alignment */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setAlignment('left')}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={t('spreadsheet.alignLeft')}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAlignment('center')}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={t('spreadsheet.alignCenter')}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAlignment('right')}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={t('spreadsheet.alignRight')}
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Colors */}
          <div className="flex items-center gap-2">
            <ColorPicker
              color={getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.bgColor || '#ffffff'}
              onChange={setBgColor}
              label={t('spreadsheet.bgColor')}
            />
            <ColorPicker
              color={getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.textColor || '#000000'}
              onChange={setTextColor}
              label={t('spreadsheet.textColor')}
            />
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Font Size */}
          <select
            value={getCell(currentWorkbook.id, currentSheet.id, selectedCell?.row || 1, selectedCell?.col || 1)?.style?.fontSize || 14}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            title={t('spreadsheet.fontSize')}
          >
            {[10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>

        {/* Formula Bar */}
        <div className="flex items-center px-4 py-2 border-t border-gray-200 dark:border-gray-700 gap-3">
          <div className="flex items-center gap-2 min-w-[100px]">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              {getCellReference(selectedCell)}
            </span>
          </div>
          <div className="flex-1 relative">
            <div className="flex items-center gap-2">
              <FunctionSquare className="w-4 h-4 text-gray-400" />
              <input
                ref={formulaInputRef}
                type="text"
                value={formulaBarValue}
                onChange={(e) => handleFormulaBarChange(e.target.value)}
                onFocus={() => {
                  if (formulaBarValue.startsWith('=')) {
                    setShowFormulaAutocomplete(true);
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={t('spreadsheet.formulaBar')}
              />
            </div>
            <AnimatePresence>
              {showFormulaAutocomplete && formulaBarValue.startsWith('=') && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-6 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[150px]"
                >
                  {FORMULA_FUNCTIONS.filter(f => 
                    f.toLowerCase().includes(formulaBarValue.slice(1).toLowerCase())
                  ).map((func) => (
                    <button
                      key={func}
                      onClick={() => {
                        handleFormulaBarChange(`=${func}()`);
                        setShowFormulaAutocomplete(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Sigma className="w-3 h-3" />
                      {func}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <div className="inline-block min-w-full p-4">
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          >
            <table className="border-collapse">
              <thead>
                <tr>
                  {/* Corner cell */}
                  <th 
                    className="w-12 h-8 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 sticky top-0 left-0 z-20"
                    onClick={() => {
                      if (currentSheet) {
                        setSelectedRange({ start: { row: 1, col: 1 }, end: { row: currentSheet.rowCount, col: currentSheet.colCount } });
                      }
                    }}
                  />
                  {/* Column headers */}
                  {Array.from({ length: currentSheet.colCount }, (_, i) => i + 1).map((col) => (
                    <th
                      key={col}
                      className="h-8 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 sticky top-0 z-10 relative group"
                      style={{ width: currentSheet.columnWidths[col - 1] || 100 }}
                      onContextMenu={(e) => handleHeaderContextMenu(e, 'col', col)}
                    >
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {columnToLetter(col)}
                      </span>
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleColumnResizeStart(col, e)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: currentSheet.rowCount }, (_, i) => i + 1).map((row) => (
                  <tr key={row} style={{ height: currentSheet.rowHeights[row - 1] || 24 }}>
                    {/* Row header */}
                    <th
                      className="w-12 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 sticky left-0 z-10 relative group"
                      onContextMenu={(e) => handleHeaderContextMenu(e, 'row', row)}
                    >
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {row}
                      </span>
                      {/* Resize handle */}
                      <div
                        className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleRowResizeStart(row, e)}
                      />
                    </th>
                    {/* Cells */}
                    {Array.from({ length: currentSheet.colCount }, (_, i) => i + 1).map((col) => {
                      const cell = currentSheet.cells[getCellKey(row, col)];
                      const isSelected = isCellSelected(row, col);
                      const isEditing = editingCell?.row === row && editingCell?.col === col;

                      return (
                        <td
                          key={`${row}-${col}`}
                          className={`border border-gray-300 dark:border-gray-600 relative ${
                            isSelected ? 'ring-2 ring-green-500 ring-inset z-10' : ''
                          }`}
                          style={{
                            width: currentSheet.columnWidths[col - 1] || 100,
                            backgroundColor: cell?.style?.bgColor || 'transparent',
                          }}
                          onMouseDown={(e) => handleCellMouseDown(row, col, e)}
                          onMouseEnter={() => handleCellMouseEnter(row, col)}
                          onMouseUp={handleCellMouseUp}
                          onDoubleClick={() => handleCellDoubleClick(row, col)}
                          onContextMenu={(e) => handleCellContextMenu(e, row, col)}
                        >
                          {isEditing ? (
                            <input
                              ref={cellInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                if (e.target.value.startsWith('=')) {
                                  setShowFormulaAutocomplete(true);
                                } else {
                                  setShowFormulaAutocomplete(false);
                                }
                              }}
                              onBlur={confirmEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-full h-full px-2 py-0 border-none outline-none bg-transparent"
                              style={{
                                fontWeight: cell?.style?.bold ? 'bold' : 'normal',
                                fontStyle: cell?.style?.italic ? 'italic' : 'normal',
                                textDecoration: cell?.style?.underline ? 'underline' : 'none',
                                textAlign: cell?.style?.align || 'left',
                                color: cell?.style?.textColor || 'inherit',
                                fontSize: cell?.style?.fontSize ? `${cell?.style?.fontSize}px` : '14px',
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full px-2 py-0 overflow-hidden text-ellipsis whitespace-nowrap flex items-center"
                              style={{
                                fontWeight: cell?.style?.bold ? 'bold' : 'normal',
                                fontStyle: cell?.style?.italic ? 'italic' : 'normal',
                                textDecoration: cell?.style?.underline ? 'underline' : 'none',
                                textAlign: cell?.style?.align || 'left',
                                color: cell?.style?.textColor || 'inherit',
                                fontSize: cell?.style?.fontSize ? `${cell?.style?.fontSize}px` : '14px',
                              }}
                            >
                              {getCellDisplayValue(cell)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {currentWorkbook.sheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-colors border-b-2 ${
                sheet.id === currentWorkbook.activeSheetId
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveSheet(currentWorkbook.id, sheet.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'sheet', data: sheet });
              }}
            >
              {renamingSheet === sheet.id ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => {
                    if (newName.trim()) {
                      renameSheet(currentWorkbook.id, sheet.id, newName.trim());
                    }
                    setRenamingSheet(null);
                    setNewName('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (newName.trim()) {
                        renameSheet(currentWorkbook.id, sheet.id, newName.trim());
                      }
                      setRenamingSheet(null);
                      setNewName('');
                    }
                    if (e.key === 'Escape') {
                      setRenamingSheet(null);
                      setNewName('');
                    }
                  }}
                  autoFocus
                  className="w-20 px-1 py-0.5 text-sm border border-green-500 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm font-medium whitespace-nowrap">{sheet.name}</span>
              )}
            </div>
          ))}
          <button
            onClick={() => createSheet(currentWorkbook.id)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('spreadsheet.newSheet')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Control */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          >
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>{z}%</option>
            ))}
          </select>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          {selectedRange && (
            <>
              <span>{t('spreadsheet.range')}: {getCellReference(selectedRange.start)}:{getCellReference(selectedRange.end)}</span>
              {selectionStats && (
                <>
                  <span>{t('spreadsheet.count')}: {selectionStats.count}</span>
                  <span>{t('spreadsheet.sum')}: {selectionStats.sum.toFixed(2)}</span>
                  <span>{t('spreadsheet.average')}: {selectionStats.average.toFixed(2)}</span>
                </>
              )}
            </>
          )}
          {!selectedRange && selectedCell && (
            <span>{t('spreadsheet.cell')}: {getCellReference(selectedCell)}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>{t('spreadsheet.zoom')}: {zoom}%</span>
        </div>
      </div>

      {/* Context Menus */}
      <AnimatePresence>
        {contextMenu?.type === 'cell' && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              { label: t('spreadsheet.cut'), onClick: () => {
                if (selectedRange) {
                  cut(currentWorkbook.id, currentSheet.id, selectedRange);
                } else if (selectedCell) {
                  cut(currentWorkbook.id, currentSheet.id, { start: selectedCell, end: selectedCell });
                }
              }},
              { label: t('spreadsheet.copy'), onClick: () => {
                if (selectedRange) {
                  copy(currentWorkbook.id, currentSheet.id, selectedRange);
                } else if (selectedCell) {
                  copy(currentWorkbook.id, currentSheet.id, { start: selectedCell, end: selectedCell });
                }
              }},
              { label: t('spreadsheet.paste'), onClick: () => {
                if (clipboard && selectedCell) {
                  paste(currentWorkbook.id, currentSheet.id, selectedCell.row, selectedCell.col);
                }
              }, disabled: !clipboard },
              { separator: true, label: '', onClick: () => {} },
              { label: t('spreadsheet.insertRow'), onClick: () => insertRow(currentWorkbook.id, currentSheet.id, contextMenu.data.row) },
              { label: t('spreadsheet.deleteRow'), onClick: () => deleteRow(currentWorkbook.id, currentSheet.id, contextMenu.data.row) },
              { label: t('spreadsheet.insertColumn'), onClick: () => insertColumn(currentWorkbook.id, currentSheet.id, contextMenu.data.col) },
              { label: t('spreadsheet.deleteColumn'), onClick: () => deleteColumn(currentWorkbook.id, currentSheet.id, contextMenu.data.col) },
              { separator: true, label: '', onClick: () => {} },
              { label: t('spreadsheet.delete'), onClick: () => deleteCell(currentWorkbook.id, currentSheet.id, contextMenu.data.row, contextMenu.data.col) },
            ]}
          />
        )}
        {contextMenu?.type === 'sheet' && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              { label: t('spreadsheet.renameSheet'), onClick: () => {
                setRenamingSheet(contextMenu.data.id);
                setNewName(contextMenu.data.name);
              }},
              { label: t('spreadsheet.duplicateSheet'), onClick: () => duplicateSheet(currentWorkbook.id, contextMenu.data.id) },
              { separator: true, label: '', onClick: () => {} },
              { label: t('spreadsheet.deleteSheet'), onClick: () => {
                if (currentWorkbook.sheets.length > 1) {
                  deleteSheet(currentWorkbook.id, contextMenu.data.id);
                }
              }, disabled: currentWorkbook.sheets.length <= 1 },
            ]}
          />
        )}
        {contextMenu?.type === 'header' && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={contextMenu.data.type === 'col' ? [
              { label: t('spreadsheet.insertColumn'), onClick: () => insertColumn(currentWorkbook.id, currentSheet.id, contextMenu.data.index) },
              { label: t('spreadsheet.deleteColumn'), onClick: () => deleteColumn(currentWorkbook.id, currentSheet.id, contextMenu.data.index) },
            ] : [
              { label: t('spreadsheet.insertRow'), onClick: () => insertRow(currentWorkbook.id, currentSheet.id, contextMenu.data.index) },
              { label: t('spreadsheet.deleteRow'), onClick: () => deleteRow(currentWorkbook.id, currentSheet.id, contextMenu.data.index) },
            ]}
          />
        )}
      </AnimatePresence>

      {/* Rename Workbook Dialog */}
      <AnimatePresence>
        {renamingWorkbook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setRenamingWorkbook(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">{t('spreadsheet.rename')}</h3>
              <input
                type="text"
                defaultValue={currentWorkbook.name}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRenamingWorkbook(null)}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    if (newName.trim()) {
                      renameWorkbook(renamingWorkbook, newName.trim());
                    }
                    setRenamingWorkbook(null);
                    setNewName('');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpreadsheetEditor;
