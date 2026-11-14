# ReboundOps desktop shared shell (developer preview)

One **Electron** application source is used by macOS and Windows. Both platform branches should configure packaging around this directory; do not duplicate business logic, backend APIs or frontend code.

## Current implementation
- Native window with isolated renderer, sandbox, navigation lockdown, denied browser permissions and external web links opened in the system browser.
- Starts the existing ReboundOps integrated launcher from a **source checkout**; waits for localhost health before showing the UI.
- Stops its child launcher on application shutdown.
- Uses the same ReboundOps web, API and engine source as the browser version.

## Developer run
1. Install supported Node/npm and initialize ReboundOps with `npm start` once, then stop the launcher.
2. Run `npm install --prefix desktop`.
3. Run `npm run start --prefix desktop` from the repository root.

You can set `REBOUNDOPS_SOURCE_ROOT` to an external source checkout. The launcher uses ports 4317 and 4174; stop any other process using them.

## Not yet a distributable standalone app

The Electron builder configuration is scaffolding. A standalone .dmg/.exe needs a **bundled, read-only-safe runtime**, explicit user-data migration, security review, offline startup tests, app icons, and release signing/notarization (Apple Developer ID and Windows code signing). A packaged Electron shell without those artifacts is not a usable standalone application. Do **not** advertise the builder output as a production release or upload it as an installer. The shell also requires a review of child-process termination across macOS and Windows.

The platform branches must share this directory. Details: [macOS](../docs/desktop-macos.md) and [Windows](../docs/desktop-windows.md) after their respective branches are merged.
