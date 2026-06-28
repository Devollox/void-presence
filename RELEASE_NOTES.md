# Update Overlay Close Text Fix

## Fixed

- **Localized close button text** — the update overlay close button now uses the translated `updateOverlay.close` value instead of a hardcoded label, so the text matches the active language.
- **Prevented text override** — removed the behavior that overwrote the button text with the wrong value during overlay setup.
- **Preserved close action** — the button still hides the update overlay when clicked, with no changes to the existing behavior.
