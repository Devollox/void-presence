# Localization & Interval Control

## New

- **Multi-language support** — Void Presence now natively supports English, Russian, and Turkish. All UI strings and toast notifications adapt dynamically based on the selected user locale via `i18next`.
- **Enforced interval initialization** — added absolute structural validation for the core activity update cycle. The system now guarantees a safe fallback by actively forcing a 30-second default if settings are missing or invalid.
- **Cross-platform Discord detection** — the RPC core and custom status worker now correctly detect native Discord clients on Windows, macOS, and Linux, eliminating the infinite "SEARCHING DISCORD PROCESS" state for non-Windows setups.

## Improved

- **Strict storage correction** — rebuilt `setupIntervalControl` to eliminate silent failures. The logic now directly overwrites corrupted or non-numeric `localStorage` entries with valid parameters.
- **Synchronized backend state** — the runtime interval now triggers an immediate `window.electronAPI.setActivityInterval` broadcast during initialization, completely removing timing gaps between UI states and the background process.
- **Custom status stability** — the status worker now shares the same resilient Discord presence detection and interval handling, making token-based custom statuses more reliable across all platforms.
