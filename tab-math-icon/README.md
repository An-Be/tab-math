# TabMath icon kit

The "Split tab" mark: a single receipt cut diagonally into two pieces. One bill, divided.

## Install (Next.js App Router)

Copy the contents of `nextjs/` into the project root so the files land at:

```
app/favicon.ico          -> /favicon.ico (16, 32, 48 px; 16 is pixel-tuned)
app/apple-icon.png       -> iOS home screen (180 px)
app/manifest.ts          -> PWA manifest, points at the PNGs below
public/icon-192.png
public/icon-512.png
public/icon-maskable-192.png
public/icon-maskable-512.png
```

Next.js picks up `favicon.ico`, `apple-icon.png` and `manifest.ts` automatically from file conventions. No changes to `layout.tsx` metadata are needed. If the project already has an `app/icon.*` or a `metadata.icons` entry, remove it so it doesn't override these.

There is intentionally no `app/icon.svg`. Browsers prefer an SVG favicon when one exists, and the full-detail SVG blurs at 16 px. The `.ico` carries a hand-tuned 16 px version instead.

## In-app usage

`svg/mark.svg` is the mark alone, no tile, using `fill="currentColor"`. Use it inline in the header next to the wordmark so it inherits text color:

```tsx
<svg viewBox="28 16 44 69" width={14} height={22} fill="currentColor" aria-hidden="true">
  <polygon points="28,16 72,16 72,40 28,56" />
  <polygon points="28,63 72,47 72,80 66.5,85 61,80 55.5,85 50,80 44.5,85 39,80 33.5,85 28,80" />
</svg>
```

Pair with "TabMath" in Space Grotesk 600, tight tracking (about -0.04em).

## Files

| File | Use |
|---|---|
| `svg/icon.svg` | Master. White mark on black square tile. |
| `svg/icon-inverse.svg` | Black mark on white tile, for dark backgrounds or print. |
| `svg/mark.svg` | Mark only, `currentColor`, cropped to its bounds. |
| `svg/icon-16.svg` | Pixel-snapped redraw for 16 px. Use only at 16 px. |
| `svg/icon-maskable.svg` | Mark scaled to 78% so it survives Android circle/squircle masks. |
| `png/icon-{16..1024}.png` | Square renders of the master (16 uses the tuned version). |
| `png/apple-touch-icon.png` | 180 px, same as `icon-180.png`. |
| `png/favicon.ico` | 16 + 32 + 48 px. |

## Spec

- Grid: 100 x 100 units. Tile is the full square, no corner radius (iOS and Android apply their own masks; don't pre-round).
- Colors: `#000000` and `#FFFFFF` only. No gray, no accent color, no gradients or shadows.
- Top piece: `28,16 72,16 72,40 28,56`
- Bottom piece: `28,63 72,47 72,80` then a zigzag of 8 teeth (5.5 units wide, 5 deep) back to `28,80`
- Cut: parallel diagonal, 7 units of vertical gap, rising left to right.
- Below 24 px use the 16 px tuned file, not a downscale of the master.

## Don't

- Don't round the corners of the tile or the mark.
- Don't add color, including for states or seasonal variants.
- Don't close the gap or change the cut angle. The split is the whole idea.
