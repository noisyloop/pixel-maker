import { useStore } from '../store/useStore';

const TOOL_NAMES: Record<string, string> = {
  pencil: 'Pencil',
  eraser: 'Eraser',
  fill: 'Fill',
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  eyedropper: 'Eyedropper',
  select: 'Select',
};

export default function StatusBar() {
  const cursor = useStore((s) => s.cursor);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const zoom = useStore((s) => s.zoom);
  const tool = useStore((s) => s.tool);

  return (
    <div className="flex items-center gap-6 border-t border-edge bg-panel px-3 py-1 text-[11px] text-gray-400">
      <span className="w-28">
        {cursor ? `x: ${cursor.x}, y: ${cursor.y}` : 'x: –, y: –'}
      </span>
      <span>
        {width} × {height}
      </span>
      <span>Zoom: {Math.round(zoom * 100) / 100}×</span>
      <span className="ml-auto">Tool: {TOOL_NAMES[tool]}</span>
    </div>
  );
}
