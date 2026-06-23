import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { ToolId } from '../types';

const TOOL_KEYS: Record<string, ToolId> = {
  p: 'pencil',
  e: 'eraser',
  g: 'fill',
  l: 'line',
  r: 'rect',
  o: 'ellipse',
  i: 'eyedropper',
  m: 'select',
};

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useStore.getState();
      if (isTextEntry(e.target)) return;

      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      // Tool shortcuts (no modifier).
      if (!mod && !e.altKey && TOOL_KEYS[key]) {
        e.preventDefault();
        store.setTool(TOOL_KEYS[key]);
        return;
      }

      if (key === 'escape') {
        if (store.importState) store.cancelImport();
        else if (store.floating || store.selection) store.cancelFloating();
        return;
      }

      if ((key === 'delete' || key === 'backspace') && (store.selection || store.floating)) {
        e.preventDefault();
        store.deleteSelection();
        return;
      }

      // Arrow-key nudging of a selection / floating buffer.
      if (store.tool === 'select' && (store.selection || store.floating)) {
        const step = e.shiftKey ? 8 : 1;
        if (key === 'arrowleft') {
          e.preventDefault();
          store.moveFloating(-step, 0);
        } else if (key === 'arrowright') {
          e.preventDefault();
          store.moveFloating(step, 0);
        } else if (key === 'arrowup') {
          e.preventDefault();
          store.moveFloating(0, -step);
        } else if (key === 'arrowdown') {
          e.preventDefault();
          store.moveFloating(0, step);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
