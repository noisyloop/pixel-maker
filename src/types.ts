export type RGBA = readonly [number, number, number, number];

export type ToolId =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'eyedropper'
  | 'select';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  /** 0..1 */
  opacity: number;
  /** RGBA, length = width * height * 4 */
  data: Uint8ClampedArray;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloatingSelection {
  /** Lifted pixel data, sized w*h*4 */
  data: Uint8ClampedArray;
  /** Current top-left position on the canvas (may be negative). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ToastItem {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

/** Serialised project file (.pixelmaker.json). */
export interface ProjectFile {
  format: 'pixelmaker';
  version: 1;
  width: number;
  height: number;
  palette: string[];
  layers: SerializedLayer[];
  activeLayerId: string;
}

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  /** Base64-encoded RGBA bytes. */
  data: string;
}
