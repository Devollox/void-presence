# Void Presence

<h1 align="center">
<div style="display: flex; gap: 10px; justify-content: center;">
  
  <img width="450" height="493" alt="demo" src="https://github.com/user-attachments/assets/b290bd68-2a95-4ac1-844a-f5f446136394" />

  <img width="450" height="493" alt="demo" src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXAxaWtpM2hxeW96MHJhNWVuZzN4MG4zdGRtZ2QwbnBtcDc1ODFmOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ks5t457f2MSwsYWjPV/giphy.gif" />
  
</div>
</h1>



Advanced Discord Rich Presence manager with customizable button pairs, text cycles, and image rotation. Status updates every 30 seconds with full control over your Discord activity display.

## Features

- **Custom Button Pairs** – Create multiple button sets with labels and URLs
- **Status Cycles** – Rotate between different status messages (details and state)
- **Image Rotation** – Cycle through different large and small Discord images
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
4. Enter your Discord Application ID (get it from [Discord Developer Portal](https://discord.com/developers/applications))
5. Configure button pairs, status cycles, and images
6. Click `SAVE` button
7. Your Discord Rich Presence is now active!

> **⏱️ Initial Delay:** When you first start Void Presence, there's approximately a 25 second delay before the status appears in Discord. This is normal and only happens on startup. After that, status updates every 30 seconds.

## Configuration

### Discord Application ID
Get your Application ID from [Discord Developer Portal](https://discord.com/developers/applications):
1. Create a new application
2. Copy the Application ID from the General Information section
3. Paste it into the "CLIENT ID" field in Void Presence

### Button Pairs
- Create up to multiple button sets
- Each pair consists of two buttons with labels and URLs
- Buttons will appear in your Discord profile

### Status Cycles
- Add custom status messages
- Each cycle includes "Details" and "State" fields
- Messages rotate every 30 seconds

### Images
- **Large Image** – Main image displayed in Rich Presence
- **Small Image** – Badge/overlay image
- Use Discord asset keys or external image URLs
- Add multiple image cycles for rotation

## Usage

1. **Set Client ID** – Enter your Discord Application ID
2. **Add Images** – Configure large and small images for rotation
3. **Add Buttons** – Create button pairs with labels and URLs
4. **Add Status Cycles** – Enter status messages to rotate
5. **Auto Start** – Toggle automatic launch with system (optional)
6. **Save** – Click "Save" to apply all changes and start Rich Presence
7. **Restart** – Use "Restart Presence" button to reload changes

## Keyboard Shortcuts

- `Ctrl+,` – Show/hide window
- `Ctrl+R` – Restart Rich Presence
- `Ctrl+Q` – Quit application

## Tech Stack

- **Frontend** – Vanilla JavaScript, HTML5, CSS3
- **Backend** – Electron, Node.js
- **RPC** – discord-rpc library
- **Process Management** – ps-node

## Author

Made with ❤️ by [Devollox](https://github.com/Devollox)

---

**Void Presence** – Control your Discord presence. Own your story.
