# Drag Handles & List DnD

## Improvements

- Added **drag handle dots** (`···`) on the left side of all list rows:
  - Details & State cycles
  - Image cycles
  - Button pairs
  - Party size
  - Time cycles
  - Recent apps
- Visual drag‑handle dots are styled in a minimal “Vercel‑like” style:
  - Two small dots `··` rotated 90° so they appear vertical on the left.
  - `draggable` attribute now lives only on `.drag-handle`, not on the whole row.
- Standardized `drag‑handle` across all list‑rendering helpers:
  - `createRow` generic helper now includes `.drag-handle`.
  - `renderRecentApps` now includes `.drag-handle` for recent app entries.
- Drag‑and‑drop sorting now starts **only when dragging on the dots**, preventing accidental drag from inputs or buttons.

## Fixed

- Fixed drag‑and‑drop not working when `dragstart` was triggered somewhere other than the handle.
- Ensured drag handle is visually aligned and consistent across all lists and themes.
