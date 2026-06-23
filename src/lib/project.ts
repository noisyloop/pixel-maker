import type { Layer, ProjectFile, SerializedLayer } from '../types';

function bytesToBase64(bytes: Uint8ClampedArray): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(sub) as number[]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string, expectedLength: number): Uint8ClampedArray {
  const binary = atob(b64);
  const out = new Uint8ClampedArray(expectedLength);
  const n = Math.min(binary.length, expectedLength);
  for (let i = 0; i < n; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function serializeProject(
  width: number,
  height: number,
  palette: string[],
  layers: Layer[],
  activeLayerId: string,
): ProjectFile {
  const serializedLayers: SerializedLayer[] = layers.map((l) => ({
    id: l.id,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity,
    data: bytesToBase64(l.data),
  }));
  return {
    format: 'pixelmaker',
    version: 1,
    width,
    height,
    palette,
    layers: serializedLayers,
    activeLayerId,
  };
}

export interface DeserializedProject {
  width: number;
  height: number;
  palette: string[];
  layers: Layer[];
  activeLayerId: string;
}

/** Validate and parse a project file. Throws on malformed input. */
export function deserializeProject(raw: unknown): DeserializedProject {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Not a valid project file');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== 'pixelmaker') {
    throw new Error('Unrecognised file format');
  }
  const width = Number(obj.width);
  const height = Number(obj.height);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 256 ||
    height > 256
  ) {
    throw new Error('Invalid canvas dimensions');
  }
  if (!Array.isArray(obj.layers) || obj.layers.length === 0) {
    throw new Error('Project has no layers');
  }
  if (obj.layers.length > 64) {
    throw new Error('Project exceeds the 64-layer limit');
  }
  const expectedLength = width * height * 4;
  const layers: Layer[] = (obj.layers as unknown[]).map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Layer ${index} is malformed`);
    }
    const le = entry as Record<string, unknown>;
    return {
      id: typeof le.id === 'string' ? le.id : `layer-${index}`,
      name: typeof le.name === 'string' ? le.name.slice(0, 64) : `Layer ${index + 1}`,
      visible: le.visible !== false,
      opacity:
        typeof le.opacity === 'number' ? Math.max(0, Math.min(1, le.opacity)) : 1,
      data: base64ToBytes(typeof le.data === 'string' ? le.data : '', expectedLength),
    };
  });
  const palette = Array.isArray(obj.palette)
    ? (obj.palette as unknown[]).filter(
        (c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c),
      )
    : [];
  const activeLayerId =
    typeof obj.activeLayerId === 'string' &&
    layers.some((l) => l.id === obj.activeLayerId)
      ? obj.activeLayerId
      : layers[layers.length - 1].id;

  return { width, height, palette, layers, activeLayerId };
}
