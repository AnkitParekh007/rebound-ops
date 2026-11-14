# ReboundOps for macOS — implementation and release acceptance

**Single source:** [desktop/app.cjs](../desktop/app.cjs) is shared with Windows. No macOS-specific feature logic.

## Run the macOS developer desktop shell

```sh
npm run doctor
npm install --prefix desktop
npm run test --prefix desktop
npm run start --prefix desktop
```

Runs an Electron window over the existing localhost app and starts the shared Node launcher. Requires a **source checkout**, Node/npm and first-run network access. Stop other ReboundOps sessions before launching.

## Distribution readiness (not yet complete)

- [ ] Bundle compiled API, workspace dependencies, engine source/data, and Chromium runtime in a writable-safe app resource.
- [ ] Move user profile and session stores to an OS-specific user-data directory; prove clean upgrade/restore.
- [ ] Build and test Apple Silicon and Intel variants.
- [ ] Sign with Developer ID Application certificate, notarize and staple the .dmg.
- [ ] Test offline subsequent launch, first-run onboarding, stop/restart, CV PDF export, and keychain/provider behavior.
- [ ] Accessibility, hardened runtime, malware/privacy checks and release acceptance.

The source-host shell must not be marketed as a standalone signed macOS installer.
