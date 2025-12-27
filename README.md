<h1 align="center">Void Presence</h1> 

<p align="center">
  <img width="1080" height="874" alt="Void Presence preview" src="https://github.com/user-attachments/assets/4e44a6f9-f11a-46c2-9c64-947d8048ee86" />
</p>

<p align="center">
  <img width="450" height="493" alt="Void Presence demo" src="https://github.com/user-attachments/assets/b290bd68-2a95-4ac1-844a-f5f446136394" />
  <img width="450" height="493" alt="Void Presence demo animated" src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXAxaWtpM2hxeW96MHJhNWVuZzN4MG4zdGRtZ2QwbnBtcDc1ODFmOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ks5t457f2MSwsYWjPV/giphy.gif" />
</p>

> **Void Presence** – Advanced Discord Rich Presence manager with full control over your activity display.

---

## Overview

Void Presence is an advanced Discord Rich Presence manager with customizable button pairs, text cycles, image rotation, drag‑and‑drop profile management, and easy config transfer between machines. Status updates every 30 seconds, giving you complete control over how your Discord activity looks.

---

## Features

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

---

## Installation

### Quick setup

1. Click the **releases** button → **Download ZIP** - [Last Releases](https://github.com/Devollox/void-presence/releases)
2. Extract the ZIP archive  
3. Run `Void Presence.exe`  
4. Enter your Discord **Application ID** (from the [Discord Developer Portal](https://discord.com/developers/applications))  
5. Configure buttons, status cycles, images, and profiles  
6. Click **Save** to start Rich Presence

> **⏱️ Initial delay** – On first launch, status may appear in Discord after ~25 seconds. This is normal and only happens on startup.  

---

## Configuration

### Discord Application ID

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)  
2. Create a new application  
3. Copy the **Application ID** from **General Information**  
4. Paste it into the `CLIENT ID` field in Void Presence  

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

---

## Preset: Yuuka – Blue Archive

Void Presence ships with a ready‑to‑use Rich Presence preset for **Yuuka (Blue Archive)**.

<details>
  <summary><strong>Show Yuuka preset details</strong></summary>

<p align="left">
  <img width="280" height="166" alt="Yuuka preview" src="https://github.com/user-attachments/assets/7509f87b-3f8f-4535-bd6f-3e3b873e0ee2" />
</p>

- Config file: [`config/Yuuka.json`](config/Yuuka.json)  
- Game: Blue Archive – Hayase Yuuka  
- Use case: quick start with a themed Rich Presence profile  
- How to use: drag and drop `Yuuka.json` **onto the `+Config` area** to instantly load the preset.
</details>

---

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

---

## Keyboard shortcuts

- `Ctrl+,` – Show / hide window  
- `Ctrl+R` – Restart Rich Presence  
- `Ctrl+Q` – Quit application  

---

## Tech stack

- **Frontend** – Vanilla JavaScript, HTML5, CSS3  
- **Backend** – Electron, Node.js  
- **RPC** – `discord-rpc` library for Discord Rich Presence

---

## Author

Made with ❤️ by [Devollox](https://github.com/Devollox)

<p align="left">
  <img width="128" height="128" alt="выфвфы" src="https://github.com/user-attachments/assets/f5c3c406-552b-412e-a2a9-3ff0fdddf400" />
</p>

**Void Presence** – Control your Discord presence. Own your story.
