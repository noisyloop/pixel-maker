import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function LayersPanel() {
  const layers = useStore((s) => s.layers);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const addLayer = useStore((s) => s.addLayer);
  const deleteLayer = useStore((s) => s.deleteLayer);
  const duplicateLayer = useStore((s) => s.duplicateLayer);
  const mergeDown = useStore((s) => s.mergeDown);
  const setActiveLayer = useStore((s) => s.setActiveLayer);
  const setLayerVisible = useStore((s) => s.setLayerVisible);
  const setLayerOpacity = useStore((s) => s.setLayerOpacity);
  const renameLayer = useStore((s) => s.renameLayer);
  const reorderLayer = useStore((s) => s.reorderLayer);

  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Render top layer first (layers array is bottom-to-top).
  const ordered = [...layers].reverse();

  return (
    <div className="flex flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Layers
        </span>
        <div className="flex gap-1">
          <IconBtn title="Add layer" onClick={addLayer}>＋</IconBtn>
          <IconBtn title="Duplicate layer" onClick={() => duplicateLayer(activeLayerId)}>
            ⧉
          </IconBtn>
          <IconBtn title="Merge down" onClick={() => mergeDown(activeLayerId)}>
            ⬇
          </IconBtn>
          <IconBtn title="Delete layer" onClick={() => deleteLayer(activeLayerId)}>
            🗑
          </IconBtn>
        </div>
      </div>

      <div className="thin-scroll max-h-64 overflow-y-auto">
        {ordered.map((layer) => {
          const realIndex = layers.findIndex((l) => l.id === layer.id);
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={() => setDragId(layer.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId && dragId !== layer.id) {
                  reorderLayer(dragId, realIndex);
                }
                setDragId(null);
              }}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex cursor-pointer items-center gap-2 border-b border-edge/50 px-2 py-2 ${
                isActive ? 'bg-accent/30' : 'hover:bg-panel-alt'
              }`}
            >
              <button
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation();
                  setLayerVisible(layer.id, !layer.visible);
                }}
                className="text-sm text-gray-300"
              >
                {layer.visible ? '👁' : '🚫'}
              </button>
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {editingId === layer.id ? (
                  <input
                    autoFocus
                    defaultValue={layer.name}
                    onBlur={(e) => {
                      renameLayer(layer.id, e.target.value || layer.name);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-edge bg-panel-alt px-1 text-xs text-gray-100 focus:outline-none"
                  />
                ) : (
                  <span
                    className="truncate text-xs text-gray-200"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingId(layer.id);
                    }}
                    title="Double-click to rename"
                  >
                    {layer.name}
                  </span>
                )}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value) / 100)}
                  className="w-full"
                  title="Opacity"
                />
              </div>
              <span className="w-7 text-right text-[10px] tabular-nums text-gray-500">
                {Math.round(layer.opacity * 100)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded bg-panel-alt text-xs text-gray-200 hover:bg-edge"
    >
      {children}
    </button>
  );
}
