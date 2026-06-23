# pixel-maker

A browser-based pixel art editor inspired by [Aseprite](https://www.aseprite.org/).
Built with **React + Vite + TypeScript + Tailwind CSS**. No backend, no database —
everything runs in your browser, and projects are saved as explicit files you download.

## Features

### Canvas
- Grid-based pixel canvas, default **32×32**.
- Presets: 16×16, 32×32, 64×64, 128×128, plus **custom sizes up to 256×256**.
- Rendered on an HTML `<canvas>` with a toggle-able grid overlay.
- Pixel-perfect drawing — one click = one pixel, no anti-aliasing.
- **Zoom** (scroll wheel or toolbar buttons) and **pan** (middle-click drag, or hold `Space` and drag).

### Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| Pencil | `P` | Single-pixel draw (default) |
| Eraser | `E` | Sets pixels to transparent |
| Fill / Bucket | `G` | Flood fill bounded by matching color |
| Line | `L` | Click-drag, 1px Bresenham line |
| Rectangle | `R` | Outlined or filled (toggle) |
| Ellipse | `O` | Outlined or filled (toggle) |
| Eyedropper | `I` | Sample a color from the canvas |
| Selection | `M` | Rectangular marquee; move with arrow keys or drag |

- **Undo / Redo** with `Ctrl+Z` / `Ctrl+Shift+Z` (also `Ctrl+Y`), keeping 60 history states.
- `Delete` / `Backspace` clears the current selection. `Escape` cancels a selection or import.

### Color
- Foreground color swatch with hex input.
- HSL sliders and a hex field that stay in sync.
- Editable palette (16 default colors). Click a swatch to use it; right-click to remove.

### Layers
- Multiple layers with per-layer **opacity** slider and **visibility** toggle.
- Add, delete, duplicate, **merge down**, and **reorder via drag**.
- Draw operations apply only to the active layer. Double-click a layer name to rename.

### Image import & pixelation
- Import **PNG / JPG only**, max **2 MB** — other types and oversized files are rejected with a toast.
- A non-destructive **Pixelation slider (1×–64×)** downsamples/upsamples with nearest-neighbor
  interpolation. The original image stays in memory until you confirm, then it's committed as
  editable pixels on the active layer.

### Export & project files
- **Export PNG** — composite image at 1× (actual pixel dimensions).
- **Export Scaled PNG** — integer scale factor 2×–16×, nearest-neighbor upscaled.
- **Save Project** — downloads a `.pixelmaker.json` with all layers, palette, and dimensions.
- **Load Project** — restores full state from a `.pixelmaker.json`.

## Development

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # type-check and produce a production build in dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

Requires Node 18+ (developed on Node 22).

## Architecture

Concerns are kept separate:

```
src/
  lib/          pure logic — color math, pixel drawing algorithms,
                compositing, pixelation, project (de)serialization
  store/        Zustand store: all application state + actions
  components/   UI: Toolbar, CanvasView, LayersPanel, ColorPanel,
                PalettePanel, StatusBar, Toasts, TopBar, modals
  hooks/        keyboard shortcut handling
  types.ts      shared types
```

- **State**: a single [Zustand](https://github.com/pmndrs/zustand) store. Pixel buffers are
  `Uint8ClampedArray` (RGBA) mutated in place; a `renderVersion` counter triggers re-renders.
- **Rendering**: layers are composited (source-over with per-layer opacity) into a
  native-resolution offscreen canvas, then drawn scaled with `imageSmoothingEnabled = false`
  for crisp pixels.
- **Type safety**: strict TypeScript, no `any`, ESLint-clean.

## Security notes

- No backend, no `localStorage` for primary storage — projects are explicit file downloads/uploads.
- Image imports are validated by MIME type, extension, and size before decoding.
- Project files are parsed defensively, with dimension and structure validation.

## License

[MIT](LICENSE) © 2026 noisyloop
