import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { pixelateImage } from '../lib/pixelate';

export default function ImportModal() {
  const importState = useStore((s) => s.importState);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const setPixelation = useStore((s) => s.setPixelation);
  const setImportPreview = useStore((s) => s.setImportPreview);
  const confirmImport = useStore((s) => s.confirmImport);
  const cancelImport = useStore((s) => s.cancelImport);

  const level = importState?.pixelation ?? 1;
  const source = importState?.source ?? null;

  // Recompute the pixelated preview whenever the level or source changes.
  useEffect(() => {
    if (!source) return;
    const data = pixelateImage(source, width, height, level);
    setImportPreview(data);
  }, [source, level, width, height, setImportPreview]);

  if (!importState) return null;

  return (
    <div className="absolute bottom-12 left-1/2 z-40 w-80 -translate-x-1/2 rounded-lg border border-edge bg-panel p-4 shadow-2xl">
      <h3 className="mb-1 text-sm font-semibold text-gray-100">Pixelate imported image</h3>
      <p className="mb-3 text-[11px] text-gray-500">
        Adjust the level, then confirm to commit to the active layer.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] text-gray-500">1×</span>
        <input
          type="range"
          min={1}
          max={64}
          value={level}
          onChange={(e) => setPixelation(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[10px] text-gray-500">64×</span>
        <span className="w-8 text-right text-xs tabular-nums text-gray-300">{level}×</span>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={cancelImport}
          className="rounded bg-panel-alt px-3 py-1.5 text-sm text-gray-200 hover:bg-edge"
        >
          Cancel
        </button>
        <button
          onClick={confirmImport}
          className="rounded bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
