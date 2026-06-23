import { useStore } from '../store/useStore';
import type { ToolId } from '../types';

interface ToolDef {
  id: ToolId;
  label: string;
  key: string;
  icon: JSX.Element;
}

const I = (path: JSX.Element) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const TOOLS: ToolDef[] = [
  { id: 'pencil', label: 'Pencil', key: 'P', icon: I(<><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>) },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: I(<><path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 7" /><path d="M6 11l6 6" /></>) },
  { id: 'fill', label: 'Fill', key: 'G', icon: I(<><path d="M19 11l-8-8-8 8 8 8 6-6" /><path d="M5 13h12" /><path d="M21 16c0 1.5-1 3-1 3s-1-1.5-1-3a1 1 0 0 1 2 0z" /></>) },
  { id: 'line', label: 'Line', key: 'L', icon: I(<line x1="5" y1="19" x2="19" y2="5" />) },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: I(<rect x="4" y="6" width="16" height="12" rx="0" />) },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: I(<ellipse cx="12" cy="12" rx="8" ry="6" />) },
  { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: I(<><path d="M19 3a2.8 2.8 0 0 0-4 0l-2 2 4 4 2-2a2.8 2.8 0 0 0 0-4z" /><path d="M13 7L4 16v4h4l9-9" /></>) },
  { id: 'select', label: 'Select', key: 'M', icon: I(<rect x="4" y="4" width="16" height="16" strokeDasharray="3 3" />) },
];

export default function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const rectFilled = useStore((s) => s.rectFilled);
  const ellipseFilled = useStore((s) => s.ellipseFilled);
  const setRectFilled = useStore((s) => s.setRectFilled);
  const setEllipseFilled = useStore((s) => s.setEllipseFilled);

  return (
    <div className="flex flex-col items-center gap-1 bg-panel border-r border-edge p-2 w-14">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          title={`${t.label} (${t.key})`}
          onClick={() => setTool(t.id)}
          className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
            tool === t.id
              ? 'bg-accent text-white'
              : 'text-gray-300 hover:bg-panel-alt hover:text-white'
          }`}
        >
          {t.icon}
        </button>
      ))}

      {(tool === 'rect' || tool === 'ellipse') && (
        <div className="mt-2 flex flex-col items-center gap-1 border-t border-edge pt-2">
          <span className="text-[9px] uppercase text-gray-500">Mode</span>
          <button
            title="Toggle fill"
            onClick={() =>
              tool === 'rect' ? setRectFilled(!rectFilled) : setEllipseFilled(!ellipseFilled)
            }
            className="h-8 w-10 rounded bg-panel-alt text-[10px] text-gray-200 hover:bg-edge"
          >
            {(tool === 'rect' ? rectFilled : ellipseFilled) ? 'Fill' : 'Line'}
          </button>
        </div>
      )}
    </div>
  );
}
