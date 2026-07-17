# Plugin System Overhaul & Native Module Support

## Added

- **Native module support in external plugins** — external plugins can now depend on native npm packages (`.node` binaries); the app automatically runs `npm install` followed by `electron-rebuild` to recompile native modules against the correct Electron ABI, with a `.rebuilt` marker to skip redundant rebuilds on subsequent launches.
- **Folder-based external plugins** — plugins can now ship as a directory (`plugin-name/index.js`) instead of a single `.js` file, enabling plugins to include a `worker.js`, `package.json` with dependencies, and a `manifest.json` with metadata.
- **Worker thread support for external plugins** — if a folder plugin includes a `worker.js`, it is automatically launched in a `Worker` thread (same pattern as the builtin hardware plugin), allowing CPU-intensive work to run off the main thread.
- **Per-plugin persistent storage** — `PluginContext` now exposes `writeConfig(name, data)` and a smart `readConfig(name)` that reads from `plugins-data/{pluginId}/` first, falling back to shared `userData` configs (`buttons`, `imageCycles`, etc.).
- **Plugin enabled state persistence** — external plugins now persist their enabled/disabled state across restarts via `external-plugins-state.json`; state is restored on `startAll` without needing a manual settings entry per plugin.
- **`pluginDir` in PluginContext** — plugins receive the path to their own folder via `ctx.pluginDir`, enabling them to resolve local worker scripts, assets, or config files relative to themselves.
- **GitHub-based plugin installation** — `voidpresence://install-plugin?zip=<github-tree-url>` now downloads a folder plugin directly from GitHub via the Contents API (no zip required), with a `markPluginInstalling` flag that prevents the file watcher from firing prematurely.
- **Button cycles in hardware plugin** — the builtin hardware plugin now supports `getNextButtons` and `readButtonsConfig`, cycling through button pairs the same way the default plugin does.
- **Bar style moved to plugin controls** — the bar style selector is now a `select` control on the hardware plugin card instead of a standalone section on the main config page.
- **More Plugins card on plugins page** — a new card at the bottom of the plugins view links to `voidpresence.site/plugins` (browse community plugins) and the GitHub plugins folder (submit your own).
- **`shell:open-external` IPC** — a generic `openExternal(url)` API is now available in the renderer for opening any validated `https://` URL in the system browser.

## Improved

- **`startAllPlugins` no longer blocks IPC registration** — plugin loading (including `npm install` and `electron-rebuild`) now runs in the background via `void startAllPlugins()`, so IPC handlers register immediately and the renderer never gets "no handler registered" errors on startup.
- **`spawn EINVAL` fix on Windows** — `npm install` and `electron-rebuild` now use `npm.cmd` / `npx.cmd` with `shell: false` on Windows, eliminating the `EINVAL` and `DEP0190` errors caused by passing `.cmd` executables with `shell: true` and an args array.
- **Watcher extended to folder plugins** — `startPluginsWatcher` now handles both `.js` files and directory-based plugins, triggering hot-load or unload correctly when a folder is added or removed from the `plugins` directory.
- **hardware-native external plugin** — a new external plugin using `systeminformation` replaces `wmic`/`powershell`/`nvidia-smi` calls; CPU load uses `os.cpus()` diff (no WMI), RAM uses `os.totalmem/freemem`, GPU stats are cached for 30 seconds, cutting CPU usage significantly.
- **All plugin manager log messages localized** — every `sendLog` and `sendToast` call in `plugin-manager.ts` and the install handler in `ipc.ts` now goes through `t()` with keys in `en`, `ru`, and `tr` locales.

## Web (voidpresence.site)

- **Plugins page card redesign** — plugin cards now match the status card style exactly: Discord-style preview with animated cycling slides, author GitHub avatar fetched server-side (SSR, 24h cache), progress bar, and dot indicators.
- **`build:manifest` script** — `node scripts/build-manifest.js` auto-generates `plugins-manifest.json` by scanning the `plugins/` folder and extracting metadata (`author`, `description`, `tags`, `preview.slides`) directly from `module.exports` in each plugin file.
- **Folder plugin support in manifest** — folder plugins get a `"folder": true` flag and a GitHub tree `sourceUrl`; the install button sends `?zip=<tree-url>` to the deep link handler.
- **Server-side GitHub avatar fetch** — author avatars are resolved on the server in `page.tsx` using the GitHub API before the page is sent to the client, eliminating avatar fetch waterfalls in the browser.
