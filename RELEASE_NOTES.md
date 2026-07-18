# Security Hardening & View Routing Improvements

## Improved

- **Localized plugin install toasts** — plugin installation results now use localized toast messages (`pluginInstallFromUrlSuccess` / `pluginInstallFromUrlFailed`), with translations available in English, Russian, and Turkish for consistent feedback across languages.
- **Folder-only hot-load for plugins** — updated the `plugins:install-from-url` handler so hot reloading is applied only to folder-based plugins (GitHub tree/zip installs), while single-file `.js` plugins are downloaded and stored without immediate hot-load, reducing unnecessary runtime surface.

## Security

- **Reduced renderer attack surface for plugin installs** — the `onInstallPluginFromUrl` handler now accepts a single structured payload and routes it into a typed IPC call, preventing accidental extension of the deep link surface with unvalidated flags.

## Refactored

- **Unified view activation routing** — replaced ad-hoc DOM rewrites with unified view switching through the `setActiveView` shell controller, making all navigation state changes flow through a single, predictable code path.
