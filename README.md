<img width="3844" height="793" alt="484064966-2c662772-bca231-4de4-988f-5304d7dfd87d" src="https://github.com/user-attachments/assets/ff426959-a128-41bc-922c-a971a877fce9" />

<img width="1920" height="1080" alt="Композиция2-1_1" src="https://github.com/user-attachments/assets/ad409ce8-4dd0-4d3e-bc16-1d04ea0c4318" />



https://github.com/user-attachments/assets/57fffa33-626d-467f-80a1-0df338f0f65a



> **Void Presence** – Advanced Discord Rich Presence manager with full control over your activity display.

---

## Overview

Void Presence is an advanced Discord Rich Presence manager with **two RPC Modes** (`Basic` / `Music and Youtube`), customizable button pairs, text cycles, image rotation, drag‑and‑drop profile management, and easy config transfer between machines. **Advanced mode** intelligently detects **Music** and **YouTube** activity!

---

## Features
- **RPC Modes** – `Basic` (lightweight) / `Music and Video` (**Music + Video**)
- **Custom button pairs** – Create multiple button sets with labels and URLs  
- **Custom update interval** – Control how often activity is refreshed (in seconds)  
- **Status cycles** – Rotate between different status messages (`details` and `state`)  
- **Image rotation** – Cycle through multiple large and small Rich Presence images  
- **Profiles with drag & drop** – Create, reorder, and switch between presence profiles  
- **Config import / export** – Move your setup between machines via JSON config files  
- **Real-time updates** – Activity refreshes every 30 seconds automatically  
- **Discord RPC integration** – Uses Discord Rich Presence RPC API under the hood
- **Auto-launch (optional)** – Start with the system  
- **Auto-hide (optional)** – Start minimized to tray  
- **Minimalist UI** – Dark, clean interface with real-time preview  
- **System tray** – Quick access while running in the background  

## 
<img width="3844" height="302" alt="2" src="https://github.com/user-attachments/assets/4d1b2728-9b48-4327-862e-b6613cf87e8f" />

## 

### Quick setup

1. Click the **releases** button → **Download ZIP** - [Last Releases](https://github.com/Devollox/void-presence/releases)
2. Extract the ZIP archive  
3. Run `Void Presence.exe`  
4. Enter your Discord **Application ID** (from the [Discord Developer Portal](https://discord.com/developers/applications))  
5. Configure buttons, status cycles, images, and profiles  
6. Click **Save** to start Rich Presence

> **⏱️ Initial delay** – On first launch, status may appear in Discord after ~25 seconds. This is normal and only happens on startup.  

## 
<img width="3844" height="302" alt="1" src="https://github.com/user-attachments/assets/f37380e9-d67d-43c9-aaa9-6bcc1f486541" />

## 

### Discord Application ID

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)  
2. Create a new application  
3. Copy the **Application ID** from **General Information**  
4. Paste it into the `CLIENT ID` field in Void Presence

##  RPC Modes Explained

| Mode | Features | CPU | Spotify/YouTube | Use Case |
|------|----------|-----|-----------------|----------|
| **Basic** |  Core RPC<br> Lightweight | **0.1%** |  None | Gaming, coding, minimal |
| **Advanced** |  All Basic +<br> **Music detection**<br> **YouTube activity** | **0.4%** | **Full** | Streaming, music, YouTube |


## RPC Update Intervals

### Recommended Settings

| Use Case | Interval | Discord Rate Limit | CPU Usage | Notes |
|----------|----------|-------------------|-----------|-------|
| **Default** | **30 sec** | Safe | 0.1% | **Perfect balance** — smooth rotation, no limits |
| **Fast cycles** | **5-15 sec** | Safe | 0.3% | Good for frequent status changes |
| **Aggressive** | **2 sec** | 60/min limit | 0.8% | Works but Discord may throttle |
| **Avoid** | **<1 sec** | Rate limited | 2%+ | Discord drops updates |

### Best Practices

```typescript
// Your current minimum (5 sec) is perfect
setActivityInterval(sec) {
  if (sec < 5) activityIntervalMs = 5000  // Safe default
}
```

Recommended user presets:
- 30s — Gaming/Streaming (default)
- 15s — Coding sessions  
- 5s  — Rapid status changes

### Button pairs

- Each pair contains two buttons with labels and URLs  
- You can create multiple pairs and reuse them across profiles  
- Buttons will appear on your Discord Rich Presence card

### Status cycles

- Add multiple status items with `Details`, `State`, `Image` and `Button`
- Items rotate every N seconds (default: 30)  
- Great for showcasing what you are doing (gaming, coding, streaming, etc.)

### Images

- **Large image** – Main Rich Presence artwork  
- **Small image** – Badge/overlay image  
- Use Discord asset keys from your application or external URLs  
- Add several images and enable rotation for more dynamic presence

### Profiles (drag & drop)

- Create separate profiles for gaming, work, streaming, etc.  
- Reorder profiles with drag and drop to prioritize them  
- Switch between presets without rebuilding configuration

### Config import / export

- Export your current setup to a JSON config  
- Import by dropping the file onto the app or using the file picker  
- Perfect for backup or sharing setups across machines or accounts  
- Upload your profiles to the cloud and restore them on any machine using your **Author ID** from the Void Presence profile page: [+ Author ID](https://www.voidpresence.site/profile)  

## Presets & Community Configs

Void Presence ships with ready‑to‑use Rich Presence presets and supports importing custom configurations.

You can **browse, search, and download community configs here**:  
[+ Configs](https://www.voidpresence.site/configs)

## Usage

1. Set **Client ID** – Enter your Discord Application ID  
2. Set **update interval** – Choose how often to refresh activity (seconds)  
3. Add **images** – Configure large and small image rotation  
4. Add **buttons** – Create button pairs with labels and URLs  
5. Add **status cycles** – Define messages to rotate  
6. Create **profiles** – Combine buttons, statuses, and images into presets  
7. Use **drag & drop** – Reorder profiles in the list  
8. Use **config import/export** – Save or load JSON presets  
9. Toggle **auto start** – Enable/disable on system startup  
10. Toggle **auto hide** – Start minimized to tray  
11. Click **Save** – Apply all changes and start Rich Presence  
12. Click **Restart Presence** – Reload the current configuration  
13. Click **Stop Presence** – Disable Rich Presence
14. Click **Upload Current** – Send the active config to the Void Presence website


## Keyboard shortcuts

- `Ctrl+,` – Show / hide window  
- `Ctrl+R` – Restart Rich Presence  
- `Ctrl+Q` – Quit application
- `Ctrl+U` – Check Updates

## Tech stack

- **Frontend** – TypeScript, HTML5, CSS3  
- **Backend** – Electron, Node.js  
- **RPC** – `discord-rpc` library for Discord Rich Presence

##
<img width="3844" height="302" alt="Security   data" src="https://github.com/user-attachments/assets/3d30ecf9-8487-4caf-a281-db079659dea2" />

##

Void Presence uploads only **Rich Presence configuration data** when you use cloud features or share configs on the website.

What can be stored in the cloud:

- **Config data** – button pairs, status cycles, image cycles and related settings (`configData`, `buttonPairs`, `cycles`, `imageCycles`)  
- **Metadata** – config title, description, upload timestamp, download counter (`title`, `description`, `uploadedAt`, `downloads`)  
- **Author name** – your display name or handle shown as the config author (`author`, for example `Devollox`)

What is **not** stored:

- No Discord tokens, passwords or OAuth keys  
- No personal messages or Discord account data  
- No system files or arbitrary local data

Configs are used only to render Rich Presence and to let you share presets between machines or with other users through the Void Presence website.

##
<img width="3844" height="302" alt="Author" src="https://github.com/user-attachments/assets/ac80d92e-eb98-4f3e-85ab-bf354e3b11ea" />

##

Made with ❤️ by [Devollox](https://github.com/Devollox)

<p align="left">
  <img width="128" height="128" alt="выфвфы" src="https://github.com/user-attachments/assets/32b65183-a39c-4871-bb37-5fbe01ecaade" />
</p>


> **Void Presence** – Control your Discord presence. Own your story.
