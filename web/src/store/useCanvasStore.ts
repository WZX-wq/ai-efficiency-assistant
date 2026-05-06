import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type CanvasToolType = 'select' | 'pen' | 'eraser' | 'sticky' | 'shape' | 'text' | 'ai-assist';
export type CanvasElementType = 'path' | 'sticky' | 'shape' | 'text' | 'ai-generated';
export type ShapeType = 'rect' | 'circle' | 'arrow';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  points?: { x: number; y: number }[];
  shapeType?: ShapeType;
  opacity?: number;
  strokeWidth?: number;
}

export interface CanvasData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elements: CanvasElement[];
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `cv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateElementId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// Store
// ============================================================

const MAX_HISTORY = 50;

interface CanvasStore {
  // Canvas list
  canvases: CanvasData[];
  activeCanvasId: string | null;

  // Tool state
  activeTool: CanvasToolType;
  activeColor: string;
  strokeWidth: number;
  opacity: number;

  // Viewport
  zoom: number;
  panOffset: { x: number; y: number };

  // Grid
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // History (per canvas)
  undoStack: Record<string, CanvasElement[][]>;
  redoStack: Record<string, CanvasElement[][]>;

  // Canvas CRUD
  createCanvas: (name?: string) => string;
  renameCanvas: (id: string, name: string) => void;
  deleteCanvas: (id: string) => void;
  duplicateCanvas: (id: string) => string | null;
  setActiveCanvas: (id: string) => void;

  // Element CRUD
  addElement: (element: Omit<CanvasElement, 'id'>) => string;
  removeElement: (elementId: string) => void;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => void;

  // Tool state
  setActiveTool: (tool: CanvasToolType) => void;
  setActiveColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  // Grid
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Export / Import
  exportCanvas: (canvasId: string) => string;
  importCanvas: (json: string) => boolean;
  exportAllCanvases: () => string;

  // Getters
  getActiveCanvas: () => CanvasData | undefined;
  getActiveElements: () => CanvasElement[];
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      canvases: [],
      activeCanvasId: null,

      activeTool: 'select',
      activeColor: '#d946ef',
      strokeWidth: 2,
      opacity: 1,

      zoom: 1,
      panOffset: { x: 0, y: 0 },

      showGrid: true,
      snapToGrid: false,
      gridSize: 20,

      undoStack: {},
      redoStack: {},

      // ---- Canvas CRUD ----

      createCanvas: (name) => {
        const id = generateId();
        const now = Date.now();
        const newCanvas: CanvasData = {
          id,
          name: name || `Canvas ${get().canvases.length + 1}`,
          createdAt: now,
          updatedAt: now,
          elements: [],
        };
        set((state) => ({
          canvases: [...state.canvases, newCanvas],
          activeCanvasId: id,
          panOffset: { x: 0, y: 0 },
          zoom: 1,
        }));
        return id;
      },

      renameCanvas: (id, name) => {
        set((state) => ({
          canvases: state.canvases.map((c) =>
            c.id === id ? { ...c, name, updatedAt: Date.now() } : c
          ),
        }));
      },

      deleteCanvas: (id) => {
        set((state) => {
          const remaining = state.canvases.filter((c) => c.id !== id);
          const newActiveId =
            state.activeCanvasId === id
              ? remaining.length > 0
                ? remaining[remaining.length - 1].id
                : null
              : state.activeCanvasId;
          return { canvases: remaining, activeCanvasId: newActiveId };
        });
      },

      duplicateCanvas: (id) => {
        const source = get().canvases.find((c) => c.id === id);
        if (!source) return null;
        const newId = generateId();
        const now = Date.now();
        const copy: CanvasData = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
          elements: source.elements.map((el) => ({ ...el, id: generateElementId() })),
        };
        set((state) => ({
          canvases: [...state.canvases, copy],
          activeCanvasId: newId,
        }));
        return newId;
      },

      setActiveCanvas: (id) => {
        set({ activeCanvasId: id, panOffset: { x: 0, y: 0 }, zoom: 1 });
      },

      // ---- Element CRUD ----

      addElement: (element) => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return '';

        const newElement: CanvasElement = {
          ...element,
          id: generateElementId(),
        };

        // Push current state to undo before adding
        const canvas = state.canvases.find((c) => c.id === canvasId);
        if (canvas) {
          const undoStack = { ...state.undoStack };
          const canvasUndo = undoStack[canvasId] || [];
          undoStack[canvasId] = [...canvasUndo, canvas.elements].slice(-MAX_HISTORY);
          set({ undoStack });
        }

        set((s) => ({
          canvases: s.canvases.map((c) =>
            c.id === canvasId
              ? { ...c, elements: [...c.elements, newElement], updatedAt: Date.now() }
              : c
          ),
          redoStack: { ...s.redoStack, [canvasId]: [] },
        }));
        return newElement.id;
      },

      removeElement: (elementId) => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return;

        const canvas = state.canvases.find((c) => c.id === canvasId);
        if (canvas) {
          const undoStack = { ...state.undoStack };
          const canvasUndo = undoStack[canvasId] || [];
          undoStack[canvasId] = [...canvasUndo, canvas.elements].slice(-MAX_HISTORY);
          set({ undoStack });
        }

        set((s) => ({
          canvases: s.canvases.map((c) =>
            c.id === canvasId
              ? { ...c, elements: c.elements.filter((el) => el.id !== elementId), updatedAt: Date.now() }
              : c
          ),
          redoStack: { ...s.redoStack, [canvasId]: [] },
        }));
      },

      updateElement: (elementId, updates) => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return;

        set((s) => ({
          canvases: s.canvases.map((c) =>
            c.id === canvasId
              ? {
                  ...c,
                  elements: c.elements.map((el) =>
                    el.id === elementId ? { ...el, ...updates } : el
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      // ---- Tool state ----

      setActiveTool: (tool) => set({ activeTool: tool }),
      setActiveColor: (color) => set({ activeColor: color }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setOpacity: (opacity) => set({ opacity }),

      // ---- Viewport ----

      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
      setPanOffset: (offset) => set({ panOffset: offset }),

      // ---- Grid ----

      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

      // ---- History ----

      pushHistory: () => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return;
        const canvas = state.canvases.find((c) => c.id === canvasId);
        if (!canvas) return;

        const undoStack = { ...state.undoStack };
        const canvasUndo = undoStack[canvasId] || [];
        undoStack[canvasId] = [...canvasUndo, canvas.elements.map((el) => ({ ...el }))].slice(-MAX_HISTORY);

        set({
          undoStack,
          redoStack: { ...state.redoStack, [canvasId]: [] },
        });
      },

      undo: () => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return;
        const canvasUndo = state.undoStack[canvasId];
        if (!canvasUndo || canvasUndo.length === 0) return;

        const canvas = state.canvases.find((c) => c.id === canvasId);
        if (!canvas) return;

        const previousState = canvasUndo[canvasUndo.length - 1];
        const redoStack = { ...state.redoStack };
        const canvasRedo = redoStack[canvasId] || [];
        redoStack[canvasId] = [...canvasRedo, canvas.elements.map((el) => ({ ...el }))];

        const undoStack = { ...state.undoStack };
        undoStack[canvasId] = canvasUndo.slice(0, -1);

        set({
          canvases: state.canvases.map((c) =>
            c.id === canvasId ? { ...c, elements: previousState, updatedAt: Date.now() } : c
          ),
          undoStack,
          redoStack,
        });
      },

      redo: () => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return;
        const canvasRedo = state.redoStack[canvasId];
        if (!canvasRedo || canvasRedo.length === 0) return;

        const canvas = state.canvases.find((c) => c.id === canvasId);
        if (!canvas) return;

        const nextState = canvasRedo[canvasRedo.length - 1];
        const undoStack = { ...state.undoStack };
        const canvasUndo = undoStack[canvasId] || [];
        undoStack[canvasId] = [...canvasUndo, canvas.elements.map((el) => ({ ...el }))];

        const redoStack = { ...state.redoStack };
        redoStack[canvasId] = canvasRedo.slice(0, -1);

        set({
          canvases: state.canvases.map((c) =>
            c.id === canvasId ? { ...c, elements: nextState, updatedAt: Date.now() } : c
          ),
          undoStack,
          redoStack,
        });
      },

      canUndo: () => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return false;
        const stack = state.undoStack[canvasId];
        return !!(stack && stack.length > 0);
      },

      canRedo: () => {
        const state = get();
        const canvasId = state.activeCanvasId;
        if (!canvasId) return false;
        const stack = state.redoStack[canvasId];
        return !!(stack && stack.length > 0);
      },

      // ---- Export / Import ----

      exportCanvas: (canvasId) => {
        const canvas = get().canvases.find((c) => c.id === canvasId);
        if (!canvas) return '{}';
        return JSON.stringify({ version: 1, canvas }, null, 2);
      },

      importCanvas: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.canvas && data.canvas.id && data.canvas.elements) {
            const imported: CanvasData = {
              ...data.canvas,
              id: generateId(),
              name: data.canvas.name || 'Imported Canvas',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            set((state) => ({
              canvases: [...state.canvases, imported],
              activeCanvasId: imported.id,
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      exportAllCanvases: () => {
        const { canvases } = get();
        return JSON.stringify({ version: 1, canvases, exportedAt: Date.now() }, null, 2);
      },

      // ---- Getters ----

      getActiveCanvas: () => {
        const state = get();
        return state.canvases.find((c) => c.id === state.activeCanvasId);
      },

      getActiveElements: () => {
        const canvas = get().getActiveCanvas();
        return canvas?.elements || [];
      },
    }),
    {
      name: 'ai-assistant-canvas-store',
      partialize: (state) => ({
        canvases: state.canvases,
        activeCanvasId: state.activeCanvasId,
        showGrid: state.showGrid,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        activeColor: state.activeColor,
        strokeWidth: state.strokeWidth,
        opacity: state.opacity,
      }),
    }
  )
);
