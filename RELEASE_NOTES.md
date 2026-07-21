# Cross-Platform Support

## New

- **macOS support** — Void Presence now builds and runs natively on macOS. A `.dmg` installer and a portable `.zip` are published with every release.
- **Linux support** — Void Presence now builds and runs on Linux. A `.deb`, `.rpm`, and a portable `.zip` are published with every release.

## Improved

- **Platform-aware hardware monitor** — the hardware worker now detects CPU name, CPU temperature, and GPU stats on macOS (`sysctl`, `system_profiler`) and Linux (`/proc/cpuinfo`, `/sys/class/thermal`, `sensors`, `/sys/class/drm`) in addition to Windows.
- **Platform-aware updater** — `updates.ts` picks the correct installer extension (`.exe` / `.dmg` / `.deb`) and launch method per platform. The self-update flow opens the DMG on macOS and runs `pkexec dpkg -i` on Linux.
- **SMTC plugin guarded** — the Windows Media Session (SMTC) plugin and its worker now exit gracefully on macOS and Linux instead of crashing on the missing native module.
- **GitHub Actions matrix build** — the release workflow now builds all three platform bundles in parallel and publishes them in a single GitHub Release.
