<img width="3844" height="793" alt="banner" src="https://github.com/user-attachments/assets/ff426959-a128-41bc-922c-a971a877fce9" />

<img width="1920" height="1080" alt="screenshot" src="https://github.com/user-attachments/assets/ad409ce8-4dd0-4d3e-bc16-1d04ea0c4318" />
<img width="1920" height="1032" alt="screenshot2" src="https://github.com/user-attachments/assets/daba103b-8fdf-4153-99ab-18d8bb019da8" />

https://github.com/user-attachments/assets/57fffa33-626d-467f-80a1-0df338f0f65a

> **Void Presence** – Advanced Discord Rich Presence manager with a plugin system, hardware monitoring, music detection, and full control over your activity display.

---

## Overview

Void Presence is an Electron-based Discord Rich Presence manager built around a **plugin architecture**. Each feature (default presence, hardware stats, SMTC music/video) is a plugin — you can install external plugins from the community or write your own in plain JavaScript.

---

## Features

- **Plugin system** — hot-loadable `.js` plugins, no restart required. Install from URL with one click via `voidpresence://install-plugin?url=…`
- **Builtin plugins** — `default` (text cycles), `hardware` (CPU / GPU / RAM overlay), `smtc` (music & video via Windows SMTC)
- **Priority-based presence** — multiple plugins can be active; highest priority with a non-null payload wins
- **Exclusive plugins** — a plugin marked `exclusive` blocks all lower-priority fallbacks when it has data
- **Plugin controls** — plugins expose UI controls (input fields) that render automatically on the plugin card
- **Custom button pairs** — multiple button sets with labels and URLs, rotated automatically
- **Status cycles** — rotate between `details` / `state` text pairs on a configurable interval
- **Image rotation** — cycle through large and small Rich Presence images
- **Activity type** — playing / watching / listening / competing
- **Timestamp modes** — now, range, persist (survives restarts), progress bar, custom cycles
- **Party size** — show current / max party size on the presence card
- **Profiles with drag & drop** — create, reorder, and switch between presence profiles
- **Config import / export** — JSON files, drag-and-drop, cloud sync via Author ID
- **Custom Discord status** — dynamic status cycling in Discord (works without Discord.exe via browser)
- **Bar styles** — 6 styles for hardware load bars: unicode, cmd, block, soft, retro, cyber
- **Auto-launch / auto-hide** — start with the system, minimize to tray on launch
- **Minimalist dark UI** — real-time presence preview, in-app logs, keyboard shortcuts
- **Multilingual** — English, Russian, Turkish

---

<img width="3844" height="302" alt="divider" src="https://github.com/user-attachments/assets/4d1b2728-9b48-4327-862e-b6613cf87e8f" />

## Quick setup

1. Download the latest release → [Releases](https://github.com/Devollox/void-presence/releases)
2. Extract and run `Void Presence.exe`
3. Open the [Discord Developer Portal](https://discord.com/developers/applications), create an application, copy the **Application ID**
4. Paste it into the `CLIENT ID` field in Void Presence
5. Configure cycles, images, and buttons — click **Save**

> **⏱️ Initial delay** — On first launch Discord presence may appear after ~25 seconds. This is normal.

---

## Plugin system

Plugins live in `%APPDATA%\Void Presence\plugins\`. Drop a `.js` file or a folder with `index.js` there — the app hot-loads it instantly.

```js
// hello.js — minimal plugin
module.exports = {
  id: 'hello',
  nameKey: 'Hello Plugin',
  version: '1.0.0',
  builtin: false,
  priority: 60,
  locked: false,
  controls: [],

  start(ctx) { /* ctx.readSettings(), ctx.sendLog(), ctx.writeConfig()… */ },
  stop() {},
  onUpdate(cb) { this._cb = cb },
  getPayload() {
    return { source: 'hello', details: 'Hello', state: 'from plugin', activityType: 'playing', priority: 60 }
  },
}
```

Full plugin API docs → [voidpresence.site/plugins/docs](https://voidpresence.site/plugins/docs)

### Builtin plugin priorities

| Plugin | Priority | Exclusive |
|---|---|---|
| `default` | 0 | No |
| `hardware` | 50 | Yes |
| `smtc` | 70 | No |

Use `priority > 70` to override everything.

---

## RPC update intervals

| Interval | Discord rate limit | Notes |
|---|---|---|
| **30 s** (default) | Safe | Smooth rotation, no limits |
| **5–15 s** | Safe | Good for frequent status changes |
| **< 5 s** | May throttle | Discord drops rapid updates |

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+,` | Show / hide window |
| `Ctrl+R` | Restart Rich Presence |
| `Ctrl+Q` | Quit |
| `Ctrl+U` | Check for updates |

---

## Tech stack

- **Electron** + **Node.js** (main process)
- **TypeScript** + **HTML / CSS** (renderer)
- **Vite** + **Electron Forge** (build)
- **discord-rpc** — Discord Rich Presence API
- **@coooookies/windows-smtc-monitor** — Windows SMTC for music/video detection
- **worker_threads** — hardware stats and SMTC run in separate threads

---

<img width="3844" height="302" alt="security" src="https://github.com/user-attachments/assets/3d30ecf9-8487-4caf-a281-db079659dea2" />

## Security & data

Void Presence uploads only **Rich Presence configuration data** when you use cloud features.

**What is stored:**
- Config data — button pairs, status cycles, image cycles (`buttonPairs`, `cycles`, `imageCycles`)
- Metadata — title, description, upload timestamp, download counter
- Author name — your display handle

**What is never stored:**
- Discord tokens, passwords, or OAuth keys
- Personal messages or Discord account data
- System files or arbitrary local data

Plugins run in the Electron **main process**. Only install plugins from sources you trust.

---

<img width="3844" height="302" alt="author" src="https://github.com/user-attachments/assets/ac80d92e-eb98-4f3e-85ab-bf354e3b11ea" />

Made with ❤️ by [Devollox](https://github.com/Devollox)

<p align="left">
  <img width="128" height="128" alt="avatar" src="https://github.com/user-attachments/assets/32b65183-a39c-4871-bb37-5fbe01ecaade" />
</p>

> **Void Presence** – Control your Discord presence. Own your story.
