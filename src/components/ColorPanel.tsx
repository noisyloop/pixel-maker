import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { hexToRgba, hslToRgb, rgbToHex, rgbToHsl } from '../lib/color';

export default function ColorPanel() {
  const foreground = useStore((s) => s.foreground);
  const setForeground = useStore((s) => s.setForeground);
  const addPaletteColor = useStore((s) => s.addPaletteColor);

  const [hexInput, setHexInput] = useState(foreground);

  useEffect(() => {
    setHexInput(foreground);
  }, [foreground]);

  const rgba = hexToRgba(foreground) ?? [0, 0, 0, 255];
  const hsl = rgbToHsl(rgba[0], rgba[1], rgba[2]);

  const commitHex = (value: string) => {
    const parsed = hexToRgba(value);
    if (parsed) {
      setForeground(rgbToHex(parsed[0], parsed[1], parsed[2]));
    } else {
      setHexInput(foreground);
    }
  };

  const updateHsl = (h: number, s: number, l: number) => {
    const [r, g, b] = hslToRgb(h, s, l);
    setForeground(rgbToHex(r, g, b));
  };

  return (
    <div className="flex flex-col gap-3 border-t border-edge bg-panel p-3">
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 shrink-0 rounded border border-edge"
          style={{ backgroundColor: foreground }}
          title="Foreground color"
        />
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-gray-500">Hex</label>
          <div className="flex gap-1">
            <input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value);
              }}
              spellCheck={false}
              className="w-full rounded border border-edge bg-panel-alt px-2 py-1 text-sm text-gray-100 focus:border-accent focus:outline-none"
            />
            <button
              title="Add to palette"
              onClick={() => addPaletteColor(foreground)}
              className="rounded bg-panel-alt px-2 text-sm text-gray-200 hover:bg-edge"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Slider
          label="H"
          min={0}
          max={360}
          value={hsl.h}
          onChange={(v) => updateHsl(v, hsl.s, hsl.l)}
          gradient="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        />
        <Slider
          label="S"
          min={0}
          max={100}
          value={hsl.s}
          onChange={(v) => updateHsl(hsl.h, v, hsl.l)}
          gradient={`linear-gradient(to right, ${rgbToHex(...hslToRgb(hsl.h, 0, hsl.l))}, ${rgbToHex(...hslToRgb(hsl.h, 100, hsl.l))})`}
        />
        <Slider
          label="L"
          min={0}
          max={100}
          value={hsl.l}
          onChange={(v) => updateHsl(hsl.h, hsl.s, v)}
          gradient={`linear-gradient(to right, #000, ${rgbToHex(...hslToRgb(hsl.h, hsl.s, 50))}, #fff)`}
        />
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  gradient: string;
  onChange: (v: number) => void;
}

function Slider({ label, min, max, value, gradient, onChange }: SliderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 text-[10px] text-gray-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
        style={{ background: gradient }}
      />
      <span className="w-8 text-right text-[10px] tabular-nums text-gray-400">{value}</span>
    </div>
  );
}
