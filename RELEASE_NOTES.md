# Bug Fixes & Plugin System Improvements

## Fixed

- **Double SET_ACTIVITY push** — all plugin update callbacks now go through a single 50ms global debounce in plugin-manager, collapsing simultaneous updates from default + hardware plugins into one push.
- **Payload signature check** — rpc.ts now skips redundant pushes when the active payload has not changed between ticks.
- **Button/image index overflow** — indices are clamped to array bounds after every config read; deleting an element no longer causes skips or out-of-range access.
- **Double index increment** — getNextImageCycle and getNextButtons in hardware-plugin no longer advance indices on read; indices advance only in the rotate timer tick via dedicated dvanceImageCycle / dvanceButtons helpers.

## Added

- **onConfigChanged(key) hook** — plugins can implement this optional method to react when buttons, imageCycles, cycles or party config changes. Default and hardware plugins reset their indices and re-render payload immediately on change.
- **
otifyConfigChanged(key)** — plugin-manager broadcasts config changes to all active plugins when set-buttons, set-image-cycles or set-cycles IPC handlers fire.
- **exclusive plugin flag** — a plugin with exclusive: true takes full control when it has a payload; all other plugins are bypassed in getActivePayload regardless of priority.
- **dirtyWhilePushing flag in rpc.ts** — if a new update arrives while a push is in flight, a single follow-up push is queued after the current one completes instead of being silently dropped.

