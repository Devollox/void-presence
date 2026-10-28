# macOS Signature Fix

## Fixed

- **macOS "app is damaged" on Apple Silicon** — fixed malformed ad-hoc code signature that caused Gatekeeper to report the app as damaged (`code has no resources but signature indicates they must be present`). The build now force re-signs the `.app` bundle after packaging with a proper deep ad-hoc signature.
