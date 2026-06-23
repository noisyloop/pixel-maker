import type { Layer } from '../types';

/**
 * Construct an ImageData from an RGBA buffer. The DOM lib types the ImageData
 * constructor as requiring an ArrayBuffer-backed view; our buffers always are,
 * so this narrows the buffer type safely in one place.
 */
export function toImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  return new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height);
}

/**
 * Composite visible layers (bottom-to-top order in the array) into a single
 * RGBA buffer using straight-alpha "source-over" blending. Per-layer opacity
 * is applied as a multiplier on the source alpha.
 */
export function compositeLayers(
  layers: Layer[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const src = layer.data;
    const op = layer.opacity;
    for (let i = 0; i < out.length; i += 4) {
      const sa = (src[i + 3] / 255) * op;
      if (sa <= 0) continue;
      const da = out[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      for (let c = 0; c < 3; c++) {
        const sc = src[i + c];
        const dc = out[i + c];
        out[i + c] = (sc * sa + dc * da * (1 - sa)) / outA;
      }
      out[i + 3] = outA * 255;
    }
  }
  return out;
}

/** Build a native-resolution canvas containing the composited image. */
export function compositeToCanvas(
  layers: Layer[],
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire 2D context');
  const data = compositeLayers(layers, width, height);
  ctx.putImageData(toImageData(data, width, height), 0, 0);
  return canvas;
}

/** Nearest-neighbour upscale of a source canvas by an integer factor. */
export function scaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width * factor;
  out.height = source.height * factor;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire 2D context');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}
