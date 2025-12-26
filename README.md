# Void Presence

<img width="1080" height="874" alt="readme-img1" src="https://github.com/user-attachments/assets/4e44a6f9-f11a-46c2-9c64-947d8048ee86" />

<h1 align="center">
  <div style="display: flex; gap: 10px; justify-content: center;">
    <img width="450" height="493" alt="demo" src="https://github.com/user-attachments/assets/b290bd68-2a95-4ac1-844a-f5f446136394" />
    <img width="450" height="493" alt="demo" src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXAxaWtpM2hxeW96MHJhNWVuZzN4MG4zdGRtZ2QwbnBtcDc1ODFmOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ks5t457f2MSwsYWjPV/giphy.gif" />
  </div>
</h1>


## Advanced Discord Rich Presence manager

Advanced Discord Rich Presence manager with customizable button pairs, text cycles, image rotation, drag‑and‑drop profile management, and easy config transfer. Status updates every 30 seconds with full control over your Discord activity display.

## Features

- **Custom Button Pairs** – Create multiple button sets with labels and URLs
- **Status Cycles** – Rotate between different status messages (details and state)
- **Image Rotation** – Cycle through different large and small Discord images
- **Drag & Drop Profiles** – Reorder and manage presence profiles with simple drag and drop
- **Config Import** – Move your setup between machines or profiles by dropping in a config file
- **Real-time Updates** – Status changes every 30 seconds automatically
- **Discord Integration** – Seamless RPC connection with Discord
- **Auto-launch** – Optional startup with system
- **Minimalist UI** – Dark theme, clean interface with real-time preview
- **System Tray** – Quick access from system tray, always running in background

## Installation

**Easy Setup:** Download the ZIP file from GitHub, extract it, run `Void Presence.exe`, and configure your Discord status in seconds.

### Detailed Steps

1. Click the green `Code` button → `Download ZIP`
2. Extract the ZIP file
3. Run `Void Presence.exe`
4. Enter your Discord Application ID (get it from the [Discord Developer Portal](https://discord.com/developers/applications))
5. Configure button pairs, status cycles, images, and profiles
6. Click the `SAVE` button
7. Your Discord Rich Presence is now active!

> **⏱️ Initial Delay:** When you first start Void Presence, there is an ~25 second delay before the status appears in Discord. This is normal and only happens on startup. After that, status updates every 30 seconds.

> **⏱️ Idle disconnect:** When the log shows `idle` followed by `disconnect`, it usually means Discord is restarting or reconnecting RPC rather than the app being broken. Seeing `idle` at startup is normal and just means the client is waiting for the first successful connection and presence update.

## Configuration

### Discord Application ID

Get your Application ID from the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create a new application  
2. Copy the Application ID from the **General Information** section  
3. Paste it into the `CLIENT ID` field in Void Presence  

### Button Pairs

- Create multiple button sets
- Each pair consists of two buttons with labels and URLs
- Buttons will appear on your Discord profile

### Status Cycles

- Add custom status messages
- Each cycle includes `Details` and `State` fields
- Messages rotate every 30 seconds

### Images

- **Large Image** – Main image displayed in Rich Presence
- **Small Image** – Badge/overlay image
- Use Discord asset keys or external image URLs
- Add multiple image cycles for rotation

### Drag & Drop Profiles

- Create multiple presence profiles for different scenarios (gaming, work, streaming, etc.)
- Change the order of profiles using **drag and drop** in the list
- Quickly switch between presets without rebuilding your configuration

### Config Import / Export

- Export your current setup to a config file
- Drop the config onto the app (or load it via file picker) to instantly apply the same settings
- Use this to move your Rich Presence configuration to another machine or user profile in seconds

## Config presets

Void Presence ships with ready‑to‑use Rich Presence presets so you can start in one click.

### Yuuka – Blue Archive

<details>
  <summary><strong>Show Yuuka config details</strong></summary>

Example used in the screenshot above is available as a JSON preset right in the repo.

<img width="280" height="166" alt="Yuuka preview" src="https://github.com/user-attachments/assets/7509f87b-3f8f-4535-bd6f-3e3b873e0ee2" />

- Config file: [`config/Yuuka.json`](config/Yuuka.json)
- Game: Blue Archive – Hayase Yuuka
- Use case: quick start with a themed Rich Presence profile  
- How to use: drag and drop this `.json` file **directly onto the `+Config` area** to instantly load the Yuuka setup into Void Presence.

</details>

## Usage

1. **Set Client ID** – Enter your Discord Application ID  
2. **Add Images** – Configure large and small images for rotation  
3. **Add Buttons** – Create button pairs with labels and URLs  
4. **Add Status Cycles** – Enter status messages to rotate  
5. **Create Profiles** – Store different combinations of buttons/statuses/images as profiles  
6. **Use Drag & Drop** – Drag profiles to reorder and prioritize them  
7. **Config Import/Export** – Save and load configs to reuse or share your setup  
8. **Auto Start** – Toggle automatic launch with system (optional)  
9. **Save** – Click `Save` to apply all changes and start Rich Presence  
10. **Restart** – Use the `Restart Presence` button to reload changes  

## Keyboard Shortcuts

- `Ctrl+,` – Show/hide window  
- `Ctrl+R` – Restart Rich Presence  
- `Ctrl+Q` – Quit application  

## Tech Stack

- **Frontend** – Vanilla JavaScript, HTML5, CSS3  
- **Backend** – Electron, Node.js  
- **RPC** – discord-rpc library  

## Author

Made with ❤️ by [Devollox](https://github.com/Devollox)

---
**Void Presence** – Control your Discord presence. Own your story.
