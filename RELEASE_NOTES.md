# Placeholder Translation Fix & Immediate Language Update & Stability

## Improvements

- **Added translation support for all input placeholders** — all input fields now use translation keys instead of hardcoded English text, covering Config, Status, and Activity pages.
- **Added new translation keys** — introduced 12+ new keys including `config.searchConfigsPlaceholder`, `status.discordTokenPlaceholder`, `activity.clientIdPlaceholder`, `recent.appNotFound`, and `recent.fetchFailed`.
- **Placeholders update immediately on language change** — no app restart required; placeholders refresh instantly when you switch language in settings or via timestamp mode buttons.

## Bug Fixes

- **Fixed placeholders not updating after language change** — previously placeholders required a full app restart to reflect the new language; now they update via `updatePlaceholders()` called in language change handlers.
- **Fixed button translation keys showing as raw text** — `details.add` and `buttons.add` now display their translated text normally instead of showing the key itself.

## Stability

- **Centralized placeholder management** — all placeholder logic is now in `updatePlaceholders()`, making it easier to maintain and extend.
- **Language handlers now refresh placeholders** — `timestamp-mode-btn` and `settings-language-selector` both call `updatePlaceholders()` after setting language.

## Dependencies

- Updated **Electron** to 42.4.1 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
