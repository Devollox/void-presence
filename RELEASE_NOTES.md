# Security

## New

- **Protected token storage** — the core plugin context API now explicitly blocks access to `discord-token-config` for both read and write operations, preventing third-party plugins from ever touching sensitive Discord token data by filename.

## Improved

- **Hardened config I/O API** — `readConfig` and `writeConfig` now enforce an explicit deny-list for sensitive configuration keys (including `discord-token-config`) and are ready for an allow-list-based policy, significantly reducing the risk of file-based data exfiltration through the plugin API surface.
