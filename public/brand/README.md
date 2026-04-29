# NEXORA brand assets

Save each image from the design to this directory with the exact filename below.

| File | Use | Source image (as provided) |
| --- | --- | --- |
| `nexora-icon.png` | Square `N` mark only | 2nd image (the isolated N with up/down arrows + speed lines) |
| `nexora-wordmark.png` | Horizontal `nexora` wordmark (white text + stylised X) | 3rd image (the wide logo with "nexora" text) |
| `nexora-full.png` | Full vertical mark (icon on top, wordmark below) | 1st image |

The `NexoraIcon` and `NexoraWordmark` components in
`src/components/ui/NexoraLogo.tsx` expect these exact filenames at
`/brand/<name>.png` — so just save them here and everything picks up
the new logo automatically.

## Tips

- PNG with transparent background renders best on our dark theme.
- Export at ≥ 2× the intended display size for retina (e.g. the
  navbar icon is rendered at 24-30 px, so a 64-128 px source is
  fine).
- If you ever get SVG versions, drop them in and change the `.png`
  extensions in `NexoraLogo.tsx`.
