# Security Update: Enhanced Discord Token Safety in Tutorial

## Security improvements

- Added prominent security warning in the Custom status tutorial: users are now explicitly told to **never share their Discord token with anyone**, never show it, never send it, and never paste it anywhere except the dedicated token field.
- The warning emphasizes that the Discord token gives **full access to your Discord account**, making the risk clear and immediate.
- Security warning is visually highlighted with orange-yellow gradient text for maximum visibility.

## Tutorial updates

- Updated Custom status tutorial with clearer security messaging in the hints section.
- All important terms in the tutorial (Discord token, Custom status, F12, Network, authorization, user token, RESTART STATUS, update intervals) are now highlighted with gradient text for better readability.
- Security warning placed alongside existing Terms of Service disclaimer for complete context.

## Local storage clarification

- Your Discord token is stored **locally only** on your machine at:
  `\AppData\Roaming\Void Presence\discord-token-config`
- The token is **never sent to any server**, never stored in the cloud, and never accessed by anyone except your local application.
- This file contains only your token configuration and is never transmitted over the network.

## What this means

Your Discord token is now safer — the tutorial makes it crystal clear that this sensitive credential should never be shared. The app continues to store your token locally on your machine only, with no server storage.
