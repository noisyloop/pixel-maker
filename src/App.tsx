import CanvasView from './components/CanvasView';
import ColorPanel from './components/ColorPanel';
import ImportModal from './components/ImportModal';
import LayersPanel from './components/LayersPanel';
import PalettePanel from './components/PalettePanel';
import StatusBar from './components/StatusBar';
import Toasts from './components/Toasts';
import Toolbar from './components/Toolbar';
import TopBar from './components/TopBar';
import { useKeyboard } from './hooks/useKeyboard';

export default function App() {
  useKeyboard();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-gray-200">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <Toolbar />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <CanvasView />
          <ImportModal />
        </div>

        <aside className="flex w-72 flex-col border-l border-edge bg-panel">
          <div className="thin-scroll flex-1 overflow-y-auto">
            <LayersPanel />
            <ColorPanel />
            <PalettePanel />
          </div>
        </aside>
      </div>

      <StatusBar />
      <Toasts />
    </div>
  );
}
