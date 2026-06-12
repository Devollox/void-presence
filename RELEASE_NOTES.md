# Cloud Config Fix & CPU Temperature Update & Layout Markup & Stability

## Improvements

- **Removed `statusCycles` from cloud upload** — the `statusCycles` field is now deleted before uploading config to cloud to prevent unnecessary data storage in `cloud:uploadConfig` IPC handler.
- **Fixed page layout markup** — adjusted `<div data-i18n="config.uploadCurrent">Upload Current</div>` to match the overall page styling.
- **Added second CPU temperature fallback** — added alternative PowerShell WMI method (`Get-WmiObject MSAcpi_ThermalZoneTemperature`) in `getCpuTemperature()` to improve CPU temp reading reliability on Windows when the first CimInstance method fails.

## Dependencies

- Updated **Electron** to 42.4.0 for improved runtime stability, performance, and up‑to‑date Chromium/Node.js versions.
  - **Chromium**: 148.0.7778.254
  - **Node.js**: 24.16.0
  - **V8**: 14.8.178.29
