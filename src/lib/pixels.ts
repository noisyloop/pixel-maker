import type { RGBA } from '../types';

/** Create a transparent RGBA buffer for the given dimensions. */
export function createBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function getPixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): RGBA {
  if (!inBounds(x, y, width, height)) return [0, 0, 0, 0];
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

/** Write a pixel, replacing whatever is there (no alpha blending). */
export function setPixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rgba: RGBA,
): void {
  if (!inBounds(x, y, width, height)) return;
  const i = (y * width + x) * 4;
  data[i] = rgba[0];
  data[i + 1] = rgba[1];
  data[i + 2] = rgba[2];
  data[i + 3] = rgba[3];
}

export function clearPixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): void {
  setPixel(data, width, height, x, y, [0, 0, 0, 0]);
}

function colorsEqual(
  data: Uint8ClampedArray,
  i: number,
  rgba: RGBA,
): boolean {
  return (
    data[i] === rgba[0] &&
    data[i + 1] === rgba[1] &&
    data[i + 2] === rgba[2] &&
    data[i + 3] === rgba[3]
  );
}

/** Bresenham line — returns the list of integer points from (x0,y0) to (x1,y1). */
export function linePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  // Guard against pathological loops on huge canvases.
  const limit = (dx - dy) * 2 + 4;
  let steps = 0;
  for (;;) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    if (steps++ > limit) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

/** Rectangle described by two corner points (inclusive). */
function normalizeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    right: Math.max(x0, x1),
    bottom: Math.max(y0, y1),
  };
}

export function rectPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  filled: boolean,
): Array<[number, number]> {
  const { left, top, right, bottom } = normalizeRect(x0, y0, x1, y1);
  const points: Array<[number, number]> = [];
  if (filled) {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) points.push([x, y]);
    }
  } else {
    for (let x = left; x <= right; x++) {
      points.push([x, top]);
      points.push([x, bottom]);
    }
    for (let y = top + 1; y < bottom; y++) {
      points.push([left, y]);
      points.push([right, y]);
    }
  }
  return points;
}

/** Midpoint ellipse inscribed in the bounding box of the two points. */
export function ellipsePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  filled: boolean,
): Array<[number, number]> {
  const { left, top, right, bottom } = normalizeRect(x0, y0, x1, y1);
  const a = (right - left) / 2;
  const b = (bottom - top) / 2;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const set = new Set<string>();
  const push = (x: number, y: number) => set.add(`${Math.round(x)},${Math.round(y)}`);

  if (a < 0.5 || b < 0.5) {
    // Degenerate: fall back to a straight line of pixels.
    for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) push(x, y);
  } else {
    // Sample the parametric ellipse densely enough to avoid gaps.
    const steps = Math.max(16, Math.ceil((a + b) * 4));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      push(cx + a * Math.cos(t), cy + b * Math.sin(t));
    }
  }

  let points: Array<[number, number]> = Array.from(set).map((s) => {
    const [sx, sy] = s.split(',');
    return [Number(sx), Number(sy)];
  });

  if (filled) {
    const filledPoints: Array<[number, number]> = [];
    const a2 = a * a;
    const b2 = b * b;
    for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
      for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
        const nx = (x - cx) / (a || 0.5);
        const ny = (y - cy) / (b || 0.5);
        if (a2 > 0 && b2 > 0 && nx * nx + ny * ny <= 1.05) filledPoints.push([x, y]);
      }
    }
    points = filledPoints.length ? filledPoints : points;
  }
  return points;
}

/** Scanline flood fill bounded by pixels matching the seed color. Replaces with `fill`. */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fill: RGBA,
): void {
  if (!inBounds(startX, startY, width, height)) return;
  const startIdx = (startY * width + startX) * 4;
  const target: RGBA = [
    data[startIdx],
    data[startIdx + 1],
    data[startIdx + 2],
    data[startIdx + 3],
  ];
  if (colorsEqual(data, startIdx, fill)) return;

  const stack: Array<[number, number]> = [[startX, startY]];
  while (stack.length) {
    const [sx, sy] = stack.pop() as [number, number];
    let x = sx;
    // Move to the left edge of the matching span.
    while (x >= 0 && colorsEqual(data, (sy * width + x) * 4, target)) x--;
    x++;
    let spanUp = false;
    let spanDown = false;
    while (x < width && colorsEqual(data, (sy * width + x) * 4, target)) {
      const i = (sy * width + x) * 4;
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];

      if (sy > 0) {
        const up = ((sy - 1) * width + x) * 4;
        if (colorsEqual(data, up, target)) {
          if (!spanUp) {
            stack.push([x, sy - 1]);
            spanUp = true;
          }
        } else {
          spanUp = false;
        }
      }
      if (sy < height - 1) {
        const down = ((sy + 1) * width + x) * 4;
        if (colorsEqual(data, down, target)) {
          if (!spanDown) {
            stack.push([x, sy + 1]);
            spanDown = true;
          }
        } else {
          spanDown = false;
        }
      }
      x++;
    }
  }
}

export function stampPoints(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  points: Array<[number, number]>,
  rgba: RGBA,
): void {
  for (const [x, y] of points) setPixel(data, width, height, x, y, rgba);
}
