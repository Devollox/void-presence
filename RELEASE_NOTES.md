# v2.6.3-nightly – Automation Workflow Test & Stability

## Improvements

- **CI/CD Integration**: Implemented GitHub Actions for automated building, packaging, and publishing of Windows binaries.
- **Release Automation**: Verified GITHUB_TOKEN permissions and automated asset delivery to GitHub Releases.

## Internal Changes

- **Configuration Refactoring**: Migrated forge.config.js to improve compatibility with the CI/CD environment.
- **Deployment Mode**: Enabled the prerelease flag to ensure testing builds are isolated from the stable update channel.

## Dependencies

- Verified compatibility with **Node.js 22** (LTS) for the build pipeline and maintained **Electron 41.2.1** runtime.
