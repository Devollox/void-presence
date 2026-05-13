# Config Load & List DnD

## Improvements

- Centralized drag‑and‑drop re‑attachment into a dedicated helper:
  - `reattachDnDForProfiles` rebinds DnD for all profile‑related lists after applying a config.
- Kept list rendering via `createListManager`, but wired it to the shared DnD helper so newly rendered rows automatically participate in sorting.

## Fixed

- Fixed an issue where drag‑and‑drop stopped working after loading a saved config by re‑initializing DnD after `applyStateToUIAndLists`.
- Resolved state mismatch problems so that, after loading a profile, all profile‑related lists update both their data and drag behavior consistently.
- Fixed an off‑by‑one bug in list reordering where dragging the first item onto the second would incorrectly place it at index 2 instead of 1.
- Corrected the drop index calculation so that when dragging an item downwards, the insert index is adjusted after removal, ensuring items land exactly where the drop indicator shows.
