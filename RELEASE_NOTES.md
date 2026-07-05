# Backend Image Color Extraction & Stability

## Dependencies

- **Removed electron-squirrel-startup** — completely dropped the redundant windows startup package from dependencies, as the application setup and distribution are now fully managed by the custom Go-based installer.
- **Removed Squirrel installer maker** — uninstalled `@electron-forge/maker-squirrel`, removing legacy installation pipeline configs and preventing unneeded NuGet tools overhead during project setup.
- **Cleaned up devDependencies** — removed unused native rebuild utilities (`@electron/rebuild`), hot-reloaders (`electron-reloader`), cross-platform environment helpers (`cross-env`), and unnecessary Linux distribution makers (`maker-deb`, `maker-rpm`) to minimize the project setup size and drastically speed up `npm install` execution times.
- **Streamlined linting ecosystem** — optimized configuration by dropping `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, and `eslint-plugin-import`, leaving only the core `eslint` setup for simplified code quality maintenance.
