# Cloud Security & Config Refactor

## Improvements

- **Safer Cloud Config Upload**
  Cloud upload now uses a centralized Firebase base URL injected at build time and read via environment variables, instead of hard‑coded or encoded strings in the code. This simplifies configuration and reduces the risk of accidentally exposing sensitive endpoints.

## Internal Changes

- **Centralized Main Config Module**
  All JSON config read/write logic (`client-config`, `buttons`, `cycles`, `image-cycles`, `party`, `timestamp`, `settings`) has been consolidated into a single `main/config.ts` module, using a generic `Validator<T>` and safe helpers `readJsonWithSchema` / `writeJsonSafe` for consistent validation and error handling.

- **Async Settings API**
  Legacy synchronous `loadSettings` / `saveSettings` have been replaced with asynchronous `readSettings` / `writeSettings`, and `readFiltersState` can now rely on the shared `Settings` validator, reducing duplication and improving code clarity.
