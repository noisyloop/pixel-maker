import { useStore } from '../store/useStore';

export default function PalettePanel() {
  const palette = useStore((s) => s.palette);
  const foreground = useStore((s) => s.foreground);
  const setForeground = useStore((s) => s.setForeground);
  const removePaletteColor = useStore((s) => s.removePaletteColor);
  const addPaletteColor = useStore((s) => s.addPaletteColor);

  return (
    <div className="flex flex-col gap-2 border-t border-edge bg-panel p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Palette</span>
        <button
          title="Add current color"
          onClick={() => addPaletteColor(foreground)}
          className="rounded bg-panel-alt px-2 text-xs text-gray-200 hover:bg-edge"
        >
          + add
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {palette.map((color, i) => (
          <button
            key={`${color}-${i}`}
            title={`${color} — click to use, right-click to remove`}
            onClick={() => setForeground(color)}
            onContextMenu={(e) => {
              e.preventDefault();
              removePaletteColor(i);
            }}
            className={`aspect-square rounded border ${
              foreground.toLowerCase() === color.toLowerCase()
                ? 'border-white'
                : 'border-edge'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <p className="text-[9px] text-gray-600">Right-click a swatch to remove it.</p>
    </div>
  );
}
