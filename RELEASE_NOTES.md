# Cloud Configs: Discord Token Excluded from Cloud Uploads

## Security fix

- **Discord token is now automatically excluded** when uploading configurations to the cloud. The token never leaves your local machine and is never stored in Firebase.
- When you upload a config to share with others, the `discordToken` field is automatically removed from `configData` before uploading.
- This prevents accidental token leaks when sharing presets, status cycles, or RPC configurations with other users.

## What changes

- Config uploads now strip the Discord token automatically in the main process.
- Users can safely share configs without worrying about exposing their account token.
- The token remains stored locally only at `\AppData\Roaming\Void Presence\discord-token-config`.

## What stays the same

- All other config data (title, description, cycles, intervals, RPC settings, etc.) uploads normally.
- Downloaded configs will apply all settings except the token — users must set their own token separately.
- Your local token storage is unchanged.

## Why this matters

Your Discord token gives full access to your account. This fix ensures that even if you share a config publicly, your token stays private and local.
