import { useState } from 'react';
import { useStore, MAX_DIM } from '../store/useStore';

const PRESETS = [16, 32, 64, 128];

interface Props {
  onClose: () => void;
}

export default function NewCanvasModal({ onClose }: Props) {
  const newDocument = useStore((s) => s.newDocument);
  const pushToast = useStore((s) => s.pushToast);
  const [width, setWidth] = useState(32);
  const [height, setHeight] = useState(32);

  const apply = () => {
    const w = Math.floor(width);
    const h = Math.floor(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      pushToast('error', 'Enter valid dimensions');
      return;
    }
    if (w > MAX_DIM || h > MAX_DIM) {
      pushToast('error', `Maximum size is ${MAX_DIM}×${MAX_DIM}`);
      return;
    }
    newDocument(w, h);
    pushToast('success', `New ${w}×${h} canvas created`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-lg border border-edge bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold text-gray-100">New Canvas</h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setWidth(p);
                setHeight(p);
              }}
              className={`rounded px-3 py-1.5 text-sm ${
                width === p && height === p
                  ? 'bg-accent text-white'
                  : 'bg-panel-alt text-gray-200 hover:bg-edge'
              }`}
            >
              {p}×{p}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-gray-500">
            Width
            <input
              type="number"
              min={1}
              max={MAX_DIM}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="rounded border border-edge bg-panel-alt px-2 py-1 text-sm text-gray-100 focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-gray-500">
            Height
            <input
              type="number"
              min={1}
              max={MAX_DIM}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="rounded border border-edge bg-panel-alt px-2 py-1 text-sm text-gray-100 focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <p className="mb-4 text-[10px] text-gray-600">
          Custom dimensions up to {MAX_DIM}×{MAX_DIM}. This clears the current document.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-panel-alt px-3 py-1.5 text-sm text-gray-200 hover:bg-edge"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className="rounded bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
