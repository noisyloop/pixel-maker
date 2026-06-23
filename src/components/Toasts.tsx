import { useStore } from '../store/useStore';

const STYLES: Record<string, string> = {
  info: 'border-accent bg-panel-alt',
  success: 'border-green-600 bg-panel-alt',
  error: 'border-red-600 bg-panel-alt',
};

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded border-l-4 px-4 py-2 text-sm text-gray-100 shadow-lg ${
            STYLES[t.kind] ?? STYLES.info
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
