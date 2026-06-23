import { create } from 'zustand';
import type {
  FloatingSelection,
  Layer,
  Rect,
  RGBA,
  ToastItem,
  ToolId,
} from '../types';
import {
  clearPixel,
  createBuffer,
  ellipsePoints,
  floodFill,
  getPixel,
  linePoints,
  rectPoints,
  setPixel,
  stampPoints,
} from '../lib/pixels';
import { hexToRgba, rgbToHex } from '../lib/color';
import type { DeserializedProject } from '../lib/project';

const MAX_HISTORY = 60;
const MAX_DIM = 256;

const DEFAULT_PALETTE = [
  '#000000',
  '#ffffff',
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#9b59b6',
  '#34495e',
  '#7f8c8d',
  '#95a5a6',
  '#d35400',
  '#c0392b',
  '#16a085',
  '#2c3e50',
];

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

interface HistorySnapshot {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;
}

function cloneLayer(layer: Layer): Layer {
  return { ...layer, data: new Uint8ClampedArray(layer.data) };
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map(cloneLayer);
}

interface ImportState {
  source: HTMLImageElement;
  pixelation: number;
  /** Most recent pixelated preview data, sized to the canvas. */
  preview: Uint8ClampedArray;
}

export interface StoreState {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;

  tool: ToolId;
  foreground: string;
  palette: string[];

  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;

  rectFilled: boolean;
  ellipseFilled: boolean;

  selection: Rect | null;
  floating: FloatingSelection | null;

  importState: ImportState | null;

  cursor: { x: number; y: number } | null;

  /** Bumped on every pixel mutation so the canvas re-renders. */
  renderVersion: number;

  past: HistorySnapshot[];
  future: HistorySnapshot[];

  toasts: ToastItem[];
}

export interface StoreActions {
  // History
  record: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Canvas / document
  newDocument: (width: number, height: number) => void;
  loadProject: (project: DeserializedProject) => void;

  // Tools
  setTool: (tool: ToolId) => void;
  setForeground: (hex: string) => void;
  setRectFilled: (filled: boolean) => void;
  setEllipseFilled: (filled: boolean) => void;
  toggleGrid: () => void;

  // View
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCursor: (pos: { x: number; y: number } | null) => void;

  // Palette
  addPaletteColor: (hex: string) => void;
  removePaletteColor: (index: number) => void;

  // Layers
  addLayer: () => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  mergeDown: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  renameLayer: (id: string, name: string) => void;
  reorderLayer: (id: string, targetIndex: number) => void;

  // Drawing (operate on active layer)
  paintPixel: (x: number, y: number, erase: boolean) => void;
  paintLine: (x0: number, y0: number, x1: number, y1: number, erase: boolean) => void;
  bucketFill: (x: number, y: number) => void;
  commitShape: (
    kind: 'line' | 'rect' | 'ellipse',
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => void;
  sampleColor: (x: number, y: number) => void;

  // Selection
  setSelection: (rect: Rect | null) => void;
  liftSelection: () => void;
  moveFloating: (dx: number, dy: number) => void;
  setFloatingPos: (x: number, y: number) => void;
  commitFloating: () => void;
  cancelFloating: () => void;
  deleteSelection: () => void;

  // Import
  beginImport: (image: HTMLImageElement) => void;
  setPixelation: (level: number) => void;
  setImportPreview: (preview: Uint8ClampedArray) => void;
  confirmImport: () => void;
  cancelImport: () => void;

  // Toasts
  pushToast: (kind: ToastItem['kind'], message: string) => void;
  dismissToast: (id: number) => void;
}

export type Store = StoreState & StoreActions;

function makeLayer(width: number, height: number, name: string): Layer {
  return {
    id: nextId('layer'),
    name,
    visible: true,
    opacity: 1,
    data: createBuffer(width, height),
  };
}

function initialState(): StoreState {
  const width = 32;
  const height = 32;
  const layer = makeLayer(width, height, 'Layer 1');
  return {
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    tool: 'pencil',
    foreground: '#000000',
    palette: [...DEFAULT_PALETTE],
    zoom: 14,
    panX: 0,
    panY: 0,
    showGrid: true,
    rectFilled: false,
    ellipseFilled: false,
    selection: null,
    floating: null,
    importState: null,
    cursor: null,
    renderVersion: 0,
    past: [],
    future: [],
    toasts: [],
  };
}

function snapshot(state: StoreState): HistorySnapshot {
  return {
    width: state.width,
    height: state.height,
    layers: cloneLayers(state.layers),
    activeLayerId: state.activeLayerId,
  };
}

let toastId = 0;

export const useStore = create<Store>((set, get) => ({
  ...initialState(),

  record: () => {
    const state = get();
    const past = [...state.past, snapshot(state)];
    if (past.length > MAX_HISTORY) past.shift();
    set({ past, future: [] });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    // Commit any floating selection into the layer before snapshotting current.
    const current = snapshot(state);
    const past = [...state.past];
    const prev = past.pop() as HistorySnapshot;
    set({
      ...prev,
      layers: cloneLayers(prev.layers),
      past,
      future: [...state.future, current],
      selection: null,
      floating: null,
      renderVersion: state.renderVersion + 1,
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const current = snapshot(state);
    const future = [...state.future];
    const next = future.pop() as HistorySnapshot;
    set({
      ...next,
      layers: cloneLayers(next.layers),
      past: [...state.past, current],
      future,
      selection: null,
      floating: null,
      renderVersion: state.renderVersion + 1,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  newDocument: (width, height) => {
    const w = Math.max(1, Math.min(MAX_DIM, Math.floor(width)));
    const h = Math.max(1, Math.min(MAX_DIM, Math.floor(height)));
    const layer = makeLayer(w, h, 'Layer 1');
    set({
      width: w,
      height: h,
      layers: [layer],
      activeLayerId: layer.id,
      selection: null,
      floating: null,
      importState: null,
      past: [],
      future: [],
      panX: 0,
      panY: 0,
      renderVersion: get().renderVersion + 1,
    });
  },

  loadProject: (project) => {
    set({
      width: project.width,
      height: project.height,
      layers: project.layers,
      activeLayerId: project.activeLayerId,
      palette: project.palette.length ? project.palette : [...DEFAULT_PALETTE],
      selection: null,
      floating: null,
      importState: null,
      past: [],
      future: [],
      panX: 0,
      panY: 0,
      renderVersion: get().renderVersion + 1,
    });
  },

  setTool: (tool) => {
    get().commitFloating();
    set({ tool });
  },
  setForeground: (hex) => set({ foreground: hex }),
  setRectFilled: (rectFilled) => set({ rectFilled }),
  setEllipseFilled: (ellipseFilled) => set({ ellipseFilled }),
  toggleGrid: () => set({ showGrid: !get().showGrid }),

  setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(64, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  setCursor: (cursor) => set({ cursor }),

  addPaletteColor: (hex) => {
    if (!hexToRgba(hex)) return;
    const palette = get().palette;
    if (palette.includes(hex)) return;
    set({ palette: [...palette, hex] });
  },
  removePaletteColor: (index) => {
    const palette = [...get().palette];
    palette.splice(index, 1);
    set({ palette });
  },

  addLayer: () => {
    const state = get();
    get().record();
    const layer = makeLayer(state.width, state.height, `Layer ${state.layers.length + 1}`);
    const activeIndex = state.layers.findIndex((l) => l.id === state.activeLayerId);
    const layers = [...state.layers];
    layers.splice(activeIndex + 1, 0, layer);
    set({ layers, activeLayerId: layer.id });
  },

  deleteLayer: (id) => {
    const state = get();
    if (state.layers.length <= 1) {
      get().pushToast('error', 'Cannot delete the last layer');
      return;
    }
    get().record();
    const index = state.layers.findIndex((l) => l.id === id);
    const layers = state.layers.filter((l) => l.id !== id);
    let activeLayerId = state.activeLayerId;
    if (activeLayerId === id) {
      activeLayerId = layers[Math.max(0, index - 1)].id;
    }
    set({ layers, activeLayerId, renderVersion: state.renderVersion + 1 });
  },

  duplicateLayer: (id) => {
    const state = get();
    const index = state.layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    get().record();
    const original = state.layers[index];
    const copy: Layer = {
      ...cloneLayer(original),
      id: nextId('layer'),
      name: `${original.name} copy`,
    };
    const layers = [...state.layers];
    layers.splice(index + 1, 0, copy);
    set({ layers, activeLayerId: copy.id, renderVersion: state.renderVersion + 1 });
  },

  mergeDown: (id) => {
    const state = get();
    const index = state.layers.findIndex((l) => l.id === id);
    if (index <= 0) {
      get().pushToast('error', 'No layer below to merge into');
      return;
    }
    get().record();
    const top = state.layers[index];
    const bottom = state.layers[index - 1];
    const merged = cloneLayer(bottom);
    // Source-over the top layer (with its opacity) onto the bottom copy.
    const src = top.data;
    const op = top.visible ? top.opacity : 0;
    for (let i = 0; i < merged.data.length; i += 4) {
      const sa = (src[i + 3] / 255) * op;
      if (sa <= 0) continue;
      const da = merged.data[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      for (let c = 0; c < 3; c++) {
        merged.data[i + c] = (src[i + c] * sa + merged.data[i + c] * da * (1 - sa)) / outA;
      }
      merged.data[i + 3] = outA * 255;
    }
    const layers = [...state.layers];
    layers.splice(index, 1); // remove top
    layers[index - 1] = merged;
    set({
      layers,
      activeLayerId: merged.id,
      renderVersion: state.renderVersion + 1,
    });
  },

  setActiveLayer: (id) => {
    get().commitFloating();
    set({ activeLayerId: id });
  },
  setLayerVisible: (id, visible) => {
    set({
      layers: get().layers.map((l) => (l.id === id ? { ...l, visible } : l)),
      renderVersion: get().renderVersion + 1,
    });
  },
  setLayerOpacity: (id, opacity) => {
    set({
      layers: get().layers.map((l) =>
        l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l,
      ),
      renderVersion: get().renderVersion + 1,
    });
  },
  renameLayer: (id, name) => {
    set({ layers: get().layers.map((l) => (l.id === id ? { ...l, name } : l)) });
  },
  reorderLayer: (id, targetIndex) => {
    const state = get();
    const from = state.layers.findIndex((l) => l.id === id);
    if (from === -1) return;
    const clamped = Math.max(0, Math.min(state.layers.length - 1, targetIndex));
    if (from === clamped) return;
    get().record();
    const layers = [...state.layers];
    const [moved] = layers.splice(from, 1);
    layers.splice(clamped, 0, moved);
    set({ layers, renderVersion: state.renderVersion + 1 });
  },

  paintPixel: (x, y, erase) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    if (erase) {
      clearPixel(layer.data, state.width, state.height, x, y);
    } else {
      const rgba = hexToRgba(state.foreground);
      if (!rgba) return;
      setPixel(layer.data, state.width, state.height, x, y, rgba);
    }
    set({ renderVersion: state.renderVersion + 1 });
  },

  paintLine: (x0, y0, x1, y1, erase) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    const rgba: RGBA = erase ? [0, 0, 0, 0] : hexToRgba(state.foreground) ?? [0, 0, 0, 0];
    const pts = linePoints(x0, y0, x1, y1);
    stampPoints(layer.data, state.width, state.height, pts, rgba);
    set({ renderVersion: state.renderVersion + 1 });
  },

  bucketFill: (x, y) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    const rgba = hexToRgba(state.foreground);
    if (!rgba) return;
    get().record();
    floodFill(layer.data, state.width, state.height, x, y, rgba);
    set({ renderVersion: state.renderVersion + 1 });
  },

  commitShape: (kind, x0, y0, x1, y1) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    const rgba = hexToRgba(state.foreground);
    if (!rgba) return;
    get().record();
    let pts: Array<[number, number]>;
    if (kind === 'line') pts = linePoints(x0, y0, x1, y1);
    else if (kind === 'rect') pts = rectPoints(x0, y0, x1, y1, state.rectFilled);
    else pts = ellipsePoints(x0, y0, x1, y1, state.ellipseFilled);
    stampPoints(layer.data, state.width, state.height, pts, rgba);
    set({ renderVersion: state.renderVersion + 1 });
  },

  sampleColor: (x, y) => {
    const state = get();
    // Sample the composite of visible layers at this pixel.
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i];
      if (!layer.visible) continue;
      const [r, g, b, a] = getPixel(layer.data, state.width, state.height, x, y);
      if (a > 0) {
        set({ foreground: rgbToHex(r, g, b) });
        return;
      }
    }
  },

  setSelection: (selection) => set({ selection }),

  liftSelection: () => {
    const state = get();
    if (!state.selection || state.floating) return;
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    get().record();
    const { x, y, w, h } = state.selection;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sx = x + col;
        const sy = y + row;
        const [r, g, b, a] = getPixel(layer.data, state.width, state.height, sx, sy);
        const di = (row * w + col) * 4;
        data[di] = r;
        data[di + 1] = g;
        data[di + 2] = b;
        data[di + 3] = a;
        clearPixel(layer.data, state.width, state.height, sx, sy);
      }
    }
    set({
      floating: { data, x, y, w, h },
      renderVersion: state.renderVersion + 1,
    });
  },

  moveFloating: (dx, dy) => {
    const state = get();
    if (!state.floating) {
      // Auto-lift if there's a selection but nothing floating yet.
      if (state.selection) {
        get().liftSelection();
      } else {
        return;
      }
    }
    const f = get().floating;
    if (!f) return;
    const nx = f.x + dx;
    const ny = f.y + dy;
    set({
      floating: { ...f, x: nx, y: ny },
      selection: { x: nx, y: ny, w: f.w, h: f.h },
      renderVersion: get().renderVersion + 1,
    });
  },

  setFloatingPos: (x, y) => {
    const state = get();
    if (!state.floating) return;
    set({
      floating: { ...state.floating, x, y },
      selection: { x, y, w: state.floating.w, h: state.floating.h },
      renderVersion: state.renderVersion + 1,
    });
  },

  commitFloating: () => {
    const state = get();
    if (!state.floating) return;
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) {
      set({ floating: null });
      return;
    }
    const f = state.floating;
    const newData = new Uint8ClampedArray(layer.data);
    for (let row = 0; row < f.h; row++) {
      for (let col = 0; col < f.w; col++) {
        const si = (row * f.w + col) * 4;
        if (f.data[si + 3] === 0) continue; // keep transparent pixels non-destructive
        setPixel(newData, state.width, state.height, f.x + col, f.y + row, [
          f.data[si],
          f.data[si + 1],
          f.data[si + 2],
          f.data[si + 3],
        ]);
      }
    }
    set({
      layers: state.layers.map((l) =>
        l.id === layer.id ? { ...l, data: newData } : l,
      ),
      floating: null,
      renderVersion: state.renderVersion + 1,
    });
  },

  cancelFloating: () => {
    const state = get();
    if (!state.floating) {
      set({ selection: null });
      return;
    }
    // Stamp the floating buffer back at its original... simplest: just drop it
    // back where it currently sits, then clear selection.
    get().commitFloating();
    set({ selection: null });
  },

  deleteSelection: () => {
    const state = get();
    if (state.floating) {
      // Discard the lifted pixels entirely.
      set({ floating: null, selection: null, renderVersion: state.renderVersion + 1 });
      return;
    }
    if (!state.selection) return;
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) return;
    get().record();
    const { x, y, w, h } = state.selection;
    const newData = new Uint8ClampedArray(layer.data);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        clearPixel(newData, state.width, state.height, x + col, y + row);
      }
    }
    set({
      layers: state.layers.map((l) => (l.id === layer.id ? { ...l, data: newData } : l)),
      selection: null,
      renderVersion: state.renderVersion + 1,
    });
  },

  beginImport: (image) => {
    set({
      importState: { source: image, pixelation: 1, preview: new Uint8ClampedArray(0) },
    });
  },
  setPixelation: (level) => {
    const state = get();
    if (!state.importState) return;
    set({
      importState: { ...state.importState, pixelation: Math.max(1, Math.min(64, level)) },
    });
  },
  setImportPreview: (preview) => {
    const state = get();
    if (!state.importState) return;
    set({ importState: { ...state.importState, preview } });
  },
  confirmImport: () => {
    const state = get();
    if (!state.importState) return;
    const layer = state.layers.find((l) => l.id === state.activeLayerId);
    if (!layer) {
      set({ importState: null });
      return;
    }
    get().record();
    const preview = state.importState.preview;
    const newData = new Uint8ClampedArray(layer.data);
    if (preview.length === newData.length) {
      newData.set(preview);
    }
    set({
      layers: state.layers.map((l) => (l.id === layer.id ? { ...l, data: newData } : l)),
      importState: null,
      renderVersion: state.renderVersion + 1,
    });
    get().pushToast('success', 'Image committed to active layer');
  },
  cancelImport: () => set({ importState: null }),

  pushToast: (kind, message) => {
    toastId += 1;
    const item: ToastItem = { id: toastId, kind, message };
    set({ toasts: [...get().toasts, item] });
    const id = item.id;
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export { DEFAULT_PALETTE, MAX_DIM };
