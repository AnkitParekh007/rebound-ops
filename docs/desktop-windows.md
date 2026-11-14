# ReboundOps for Windows — implementation and release acceptance

**Single source:** [desktop/app.cjs](../desktop/app.cjs) is shared with macOS. Windows-specific code should be limited to packaging and OS integration.

## Run the Windows developer desktop shell

In PowerShell:

```powershell
npm run doctor
npm install --prefix desktop
npm run test --prefix desktop
npm run start --prefix desktop
```

Use Node/npm from PATH, a cloned repository and the normal desktop UI. The Electron shell launches Node directly (without `shell:true` or `npm.cmd`), avoiding an extra command interpreter. Initial installation requires internet.

## Distribution readiness (not yet complete)

- [ ] Bundle the runtime and source dependencies in the installer, without requiring an external Node/npm installation.
- [ ] Store mutable data outside Program Files and prove path security and upgrade behavior.
- [ ] Build/test x64 and ARM64 (where supported), NSIS installation and uninstall.
- [ ] Sign binaries and installer with Windows code-signing credentials.
- [ ] Run clean Windows VM first-launch, restart, PDF export, backups, Defender and accessibility acceptance.
- [ ] Verify process-tree termination and that no orphan local API continues after quit.

Until these gates pass, this is a **developer preview from a checkout**, not a production Windows installer.
