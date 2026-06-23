/**
 * Draw an image into a target-sized RGBA buffer, then pixelate it by an integer
 * factor using nearest-neighbour downsample + upsample. The operation is
 * non-destructive: it always works from the original source image.
 */
export function pixelateImage(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  factor: number,
): Uint8ClampedArray {
  const f = Math.max(1, Math.floor(factor));

  // First, fit the source image into the canvas dimensions.
  const base = document.createElement('canvas');
  base.width = targetWidth;
  base.height = targetHeight;
  const baseCtx = base.getContext('2d');
  if (!baseCtx) throw new Error('Unable to acquire 2D context');
  baseCtx.imageSmoothingEnabled = false;
  baseCtx.clearRect(0, 0, targetWidth, targetHeight);
  baseCtx.drawImage(source, 0, 0, targetWidth, targetHeight);

  if (f === 1) {
    return baseCtx.getImageData(0, 0, targetWidth, targetHeight).data;
  }

  const smallW = Math.max(1, Math.round(targetWidth / f));
  const smallH = Math.max(1, Math.round(targetHeight / f));

  // Downsample with nearest neighbour.
  const small = document.createElement('canvas');
  small.width = smallW;
  small.height = smallH;
  const smallCtx = small.getContext('2d');
  if (!smallCtx) throw new Error('Unable to acquire 2D context');
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(base, 0, 0, smallW, smallH);

  // Upsample back to canvas size with nearest neighbour.
  baseCtx.clearRect(0, 0, targetWidth, targetHeight);
  baseCtx.imageSmoothingEnabled = false;
  baseCtx.drawImage(small, 0, 0, smallW, smallH, 0, 0, targetWidth, targetHeight);

  return baseCtx.getImageData(0, 0, targetWidth, targetHeight).data;
}
