# Plugins System & Management Page

## Added

- **Plugins hot reload** — external plugins are now hot-reloaded from the user `plugins` directory: adding, editing, or removing a `.js` file automatically refreshes the plugin list and restarts the plugin without restarting the app.
- **Deep link plugin installation** — you can install plugins directly via custom protocol/deep links (for example from a website or shared config URL); the app consumes the URL, downloads the plugin file, places it into the `plugins` folder, and immediately makes it available in the plugins page.
- **Runtime plugin controls UI** — each plugin can declare its own `controls` (toggles, selects, inputs), which are rendered dynamically on the plugins page and wired to IPC methods, allowing plugins to expose rich configuration without touching core UI code.

## Improved

- **Consistent plugins state management** — enabling, disabling, and removing plugins now consistently updates both internal state and the UI via a dedicated update event, so the active plugin and its `PresencePayload` are always in sync with what you see on the plugins page.
- **Priority-based activity selection** — plugins declare priorities, and the presence engine now selects the active payload based on priority and data availability, making it easy to override the default activity with GitHub, hardware, or custom plugins.
- **Safer external plugin loading** — external plugins are validated on load (required fields and `getPayload` presence), conflict-checked against built-in plugins, and errors are surfaced in the logs and toast notifications instead of silently breaking the activity pipeline.

## Dependencies

- **Isolated plugin dependencies** — external plugins can ship with their own `package.json` and dependencies; the app runs `npm install` in the plugin’s directory when needed, keeping the core desktop bundle lean while letting plugins use heavier libraries if required.
- **No client-side image processing in plugins** — plugins that need images (for example GitHub activity using `image-cycles` GIFs) now rely on shared config data instead of bundling their own image processing code, reducing plugin startup overhead and keeping the client more stable.
