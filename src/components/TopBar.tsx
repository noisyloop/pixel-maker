import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  canvasToPngBlob,
  compositeToCanvas,
  downloadBlob,
  scaleCanvas,
} from '../lib/composite';
import { serializeProject, deserializeProject } from '../lib/project';
import NewCanvasModal from './NewCanvasModal';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ['image/png', 'image/jpeg'];
const ALLOWED_EXT = /\.(png|jpe?g)$/i;

export default function TopBar() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [showNew, setShowNew] = useState(false);

  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const showGrid = useStore((s) => s.showGrid);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const pushToast = useStore((s) => s.pushToast);
  const beginImport = useStore((s) => s.beginImport);

  const handleImageFile = (file: File) => {
    if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.test(file.name)) {
      pushToast('error', 'Only PNG and JPG images are allowed');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      pushToast('error', 'Image exceeds the 2 MB size limit');
      return;
    }
    // Verify the file's magic bytes match a real PNG/JPEG. This blocks renamed
    // files (e.g. an SVG with a .png name) that the browser might otherwise
    // treat as an image and that can carry executable content.
    const headerReader = new FileReader();
    headerReader.onerror = () => pushToast('error', 'Failed to read image file');
    headerReader.onload = () => {
      const bytes = new Uint8Array(headerReader.result as ArrayBuffer);
      const isPng =
        bytes.length >= 4 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;
      const isJpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;
      if (!isPng && !isJpeg) {
        pushToast('error', 'File does not appear to be a valid PNG or JPG');
        return;
      }
      readImageData(file);
    };
    headerReader.readAsArrayBuffer(file.slice(0, 4));
  };

  const readImageData = (file: File) => {
    const reader = new FileReader();
    reader.onerror = () => pushToast('error', 'Failed to read image file');
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        beginImport(img);
        pushToast('info', 'Adjust pixelation, then confirm');
      };
      img.onerror = () => pushToast('error', 'The file is not a valid image');
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProjectFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      pushToast('error', 'Project file is too large');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => pushToast('error', 'Failed to read project file');
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const project = deserializeProject(parsed);
        useStore.getState().loadProject(project);
        pushToast('success', 'Project loaded');
      } catch (err) {
        pushToast('error', `Could not load project: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const exportPng = async () => {
    const s = useStore.getState();
    try {
      const canvas = compositeToCanvas(s.layers, s.width, s.height);
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, 'pixel-art.png');
      pushToast('success', 'Exported PNG');
    } catch {
      pushToast('error', 'Export failed');
    }
  };

  const exportScaled = async () => {
    const s = useStore.getState();
    const input = window.prompt('Scale factor (2–16):', '8');
    if (input === null) return;
    const factor = Math.floor(Number(input));
    if (!Number.isFinite(factor) || factor < 2 || factor > 16) {
      pushToast('error', 'Scale factor must be an integer 2–16');
      return;
    }
    try {
      const base = compositeToCanvas(s.layers, s.width, s.height);
      const scaled = scaleCanvas(base, factor);
      const blob = await canvasToPngBlob(scaled);
      downloadBlob(blob, `pixel-art@${factor}x.png`);
      pushToast('success', `Exported ${factor}× PNG`);
    } catch {
      pushToast('error', 'Export failed');
    }
  };

  const saveProject = () => {
    const s = useStore.getState();
    const project = serializeProject(s.width, s.height, s.palette, s.layers, s.activeLayerId);
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    downloadBlob(blob, 'project.pixelmaker.json');
    pushToast('success', 'Project saved');
  };

  return (
    <div className="flex items-center gap-1 border-b border-edge bg-panel px-2 py-1.5 text-sm">
      <span className="mr-3 select-none font-semibold tracking-tight text-gray-200">
        pixel<span className="text-accent">maker</span>
      </span>

      <Btn onClick={() => setShowNew(true)}>New</Btn>
      <Btn onClick={() => imageInputRef.current?.click()}>Import Image</Btn>

      <Divider />

      <Btn onClick={exportPng}>Export PNG</Btn>
      <Btn onClick={exportScaled}>Export Scaled</Btn>
      <Btn onClick={saveProject}>Save Project</Btn>
      <Btn onClick={() => projectInputRef.current?.click()}>Load Project</Btn>

      <Divider />

      <Btn onClick={undo} disabled={!canUndo}>
        ↶ Undo
      </Btn>
      <Btn onClick={redo} disabled={!canRedo}>
        ↷ Redo
      </Btn>

      <Divider />

      <Btn onClick={toggleGrid} active={showGrid}>
        Grid
      </Btn>
      <div className="ml-1 flex items-center gap-1">
        <Btn onClick={() => setZoom(Math.floor(zoom / 1.2) || 1)}>－</Btn>
        <span className="w-12 text-center text-xs tabular-nums text-gray-400">
          {Math.round(zoom * 100) / 100}×
        </span>
        <Btn onClick={() => setZoom(Math.ceil(zoom * 1.2))}>＋</Btn>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProjectFile(file);
          e.target.value = '';
        }}
      />

      {showNew && <NewCanvasModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-accent text-white'
          : 'text-gray-300 hover:bg-panel-alt hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-edge" />;
}
