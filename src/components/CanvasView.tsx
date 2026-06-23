import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { compositeLayers, toImageData } from '../lib/composite';
import { ellipsePoints, linePoints, rectPoints } from '../lib/pixels';
import type { Rect } from '../types';

interface ShapePreview {
  kind: 'line' | 'rect' | 'ellipse';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

type Interaction =
  | { type: 'none' }
  | { type: 'draw'; erase: boolean; lastX: number; lastY: number }
  | { type: 'shape'; kind: 'line' | 'rect' | 'ellipse'; x0: number; y0: number }
  | { type: 'marquee'; x0: number; y0: number }
  | { type: 'move-float'; grabX: number; grabY: number; originX: number; originY: number }
  | { type: 'pan'; startX: number; startY: number; panX: number; panY: number };

export default function CanvasView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef<Interaction>({ type: 'none' });
  const spaceHeldRef = useRef(false);
  const [preview, setPreview] = useState<ShapePreview | null>(null);

  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const layers = useStore((s) => s.layers);
  const zoom = useStore((s) => s.zoom);
  const panX = useStore((s) => s.panX);
  const panY = useStore((s) => s.panY);
  const showGrid = useStore((s) => s.showGrid);
  const selection = useStore((s) => s.selection);
  const floating = useStore((s) => s.floating);
  const tool = useStore((s) => s.tool);
  const importState = useStore((s) => s.importState);
  const renderVersion = useStore((s) => s.renderVersion);

  // Track space held for panning.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        spaceHeldRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const draw = useCallback(() => {
    // `renderVersion` is read so this redraw re-runs after in-place pixel
    // mutations (which don't change object identity).
    void renderVersion;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = width * zoom;
    const ch = height * zoom;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);

    // Build the native-resolution composite into the offscreen buffer.
    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
    const off = offscreenRef.current;
    off.width = width;
    off.height = height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;

    const composite = compositeLayers(layers, width, height);
    offCtx.putImageData(toImageData(composite, width, height), 0, 0);

    // Floating selection drawn on top of the composite.
    if (floating) {
      offCtx.putImageData(
        toImageData(new Uint8ClampedArray(floating.data), floating.w, floating.h),
        floating.x,
        floating.y,
      );
    }

    // Import preview overlays everything.
    if (importState && importState.preview.length === width * height * 4) {
      offCtx.putImageData(
        toImageData(new Uint8ClampedArray(importState.preview), width, height),
        0,
        0,
      );
    }

    ctx.drawImage(off, 0, 0, cw, ch);

    // Grid overlay.
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = Math.round(x * zoom) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, ch);
      }
      for (let y = 0; y <= height; y++) {
        const py = Math.round(y * zoom) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(cw, py);
      }
      ctx.stroke();
    }

    // Shape preview.
    if (preview) {
      let pts: Array<[number, number]>;
      const filled =
        preview.kind === 'rect'
          ? useStore.getState().rectFilled
          : preview.kind === 'ellipse'
            ? useStore.getState().ellipseFilled
            : false;
      if (preview.kind === 'line') pts = linePoints(preview.x0, preview.y0, preview.x1, preview.y1);
      else if (preview.kind === 'rect')
        pts = rectPoints(preview.x0, preview.y0, preview.x1, preview.y1, filled);
      else pts = ellipsePoints(preview.x0, preview.y0, preview.x1, preview.y1, filled);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const [px, py] of pts) {
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        ctx.fillRect(px * zoom, py * zoom, zoom, zoom);
      }
    }

    // Selection marquee.
    if (selection) {
      const { x, y, w, h } = selection;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x * zoom + 0.5, y * zoom + 0.5, w * zoom - 1, h * zoom - 1);
      ctx.strokeStyle = '#000000';
      ctx.lineDashOffset = 4;
      ctx.strokeRect(x * zoom + 0.5, y * zoom + 0.5, w * zoom - 1, h * zoom - 1);
      ctx.restore();
    }
  }, [
    width,
    height,
    layers,
    zoom,
    showGrid,
    selection,
    floating,
    importState,
    preview,
    renderVersion,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Map a pointer event to integer pixel coordinates.
  const toPixel = useCallback(
    (e: React.PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / zoom);
      const y = Math.floor((e.clientY - rect.top) / zoom);
      return { x, y };
    },
    [zoom],
  );

  const pointInRect = (px: number, py: number, r: Rect): boolean =>
    px >= r.x && py >= r.y && px < r.x + r.w && py < r.y + r.h;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const store = useStore.getState();
      const { x, y } = toPixel(e);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      // Panning: middle button, or space held, or pan via right button.
      if (e.button === 1 || spaceHeldRef.current) {
        interactionRef.current = {
          type: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          panX,
          panY,
        };
        return;
      }
      if (e.button !== 0) return;

      switch (store.tool) {
        case 'pencil':
        case 'eraser': {
          const erase = store.tool === 'eraser';
          store.record();
          store.paintPixel(x, y, erase);
          interactionRef.current = { type: 'draw', erase, lastX: x, lastY: y };
          break;
        }
        case 'line':
        case 'rect':
        case 'ellipse': {
          interactionRef.current = { type: 'shape', kind: store.tool, x0: x, y0: y };
          setPreview({ kind: store.tool, x0: x, y0: y, x1: x, y1: y });
          break;
        }
        case 'fill':
          store.bucketFill(x, y);
          break;
        case 'eyedropper':
          store.sampleColor(x, y);
          break;
        case 'select': {
          const sel = store.selection;
          if (sel && pointInRect(x, y, sel)) {
            // Begin moving the selection content (lift if needed).
            if (!store.floating) store.liftSelection();
            const f = useStore.getState().floating;
            if (f) {
              interactionRef.current = {
                type: 'move-float',
                grabX: x,
                grabY: y,
                originX: f.x,
                originY: f.y,
              };
            }
          } else {
            store.commitFloating();
            interactionRef.current = { type: 'marquee', x0: x, y0: y };
            store.setSelection({ x, y, w: 1, h: 1 });
          }
          break;
        }
      }
    },
    [panX, panY, toPixel],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const store = useStore.getState();
      const { x, y } = toPixel(e);
      if (x >= 0 && y >= 0 && x < width && y < height) {
        store.setCursor({ x, y });
      } else {
        store.setCursor(null);
      }

      const it = interactionRef.current;
      switch (it.type) {
        case 'pan': {
          store.setPan(it.panX + (e.clientX - it.startX), it.panY + (e.clientY - it.startY));
          break;
        }
        case 'draw': {
          store.paintLine(it.lastX, it.lastY, x, y, it.erase);
          interactionRef.current = { ...it, lastX: x, lastY: y };
          break;
        }
        case 'shape': {
          setPreview({ kind: it.kind, x0: it.x0, y0: it.y0, x1: x, y1: y });
          break;
        }
        case 'marquee': {
          const left = Math.min(it.x0, x);
          const top = Math.min(it.y0, y);
          const right = Math.max(it.x0, x);
          const bottom = Math.max(it.y0, y);
          store.setSelection({
            x: left,
            y: top,
            w: right - left + 1,
            h: bottom - top + 1,
          });
          break;
        }
        case 'move-float': {
          store.setFloatingPos(it.originX + (x - it.grabX), it.originY + (y - it.grabY));
          break;
        }
        case 'none':
          break;
      }
    },
    [toPixel, width, height],
  );

  const endInteraction = useCallback(() => {
    const store = useStore.getState();
    const it = interactionRef.current;
    if (it.type === 'shape' && preview) {
      store.commitShape(it.kind, preview.x0, preview.y0, preview.x1, preview.y1);
    }
    if (it.type === 'marquee') {
      const sel = store.selection;
      if (sel && sel.w <= 1 && sel.h <= 1) {
        store.setSelection(null);
      }
    }
    interactionRef.current = { type: 'none' };
    setPreview(null);
  }, [preview]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const store = useStore.getState();
    const delta = e.deltaY < 0 ? 1 : -1;
    const current = store.zoom;
    const next = delta > 0 ? Math.ceil(current * 1.2) : Math.floor(current / 1.2);
    store.setZoom(Math.max(1, next === current ? current + delta : next));
  }, []);

  const cursorClass =
    tool === 'eyedropper'
      ? 'cursor-crosshair'
      : tool === 'select'
        ? 'cursor-cell'
        : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden checker-bg flex items-center justify-center"
      onWheel={onWheel}
    >
      <div
        style={{ transform: `translate(${panX}px, ${panY}px)` }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          className={`block image-render-pixel ${cursorClass} shadow-[0_0_0_1px_rgba(255,255,255,0.15)]`}
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          onPointerLeave={() => useStore.getState().setCursor(null)}
        />
      </div>
    </div>
  );
}
