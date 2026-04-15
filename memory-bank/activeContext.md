# Active Context

## Agent Context
- Mode: compact execution
- Date: 2026-04-14

## Current Task
- Fix macOS GitHub release workflow failure for desktop bundle export.

## Pending
- Push/tag repository so GitHub Actions can publish `.exe`, `.zip`, `.app`, `.dmg` to Releases and validate macOS aarch64 build path.

## Recovery Instructions
- Windows export artifact: `src-tauri/target/release/bundle/nsis/Temp Inbox Manager_0.1.0_x64-setup.exe`.
- For macOS export, run GitHub workflow `.github/workflows/export-desktop.yml`.
- OTP extraction now prioritizes 6-digit codes for quick copy in both SMS and email panels.
- Drag-drop TXT zone and copy buttons for phone/email account fields are implemented in `src/routes/+page.svelte`.
- SMS fetch now prefers the Tauri backend command and falls back to browser fetch when needed.
- Workflow now uses explicit macOS bundle args `--bundles app,dmg --target aarch64-apple-darwin` on macos-latest.
- Phone pool supports direct remove action with active-phone fallback selection.
- Export workflow now publishes release assets automatically via `tauri-apps/tauri-action` on tag push.
- Export workflow now pins `tauri-apps/tauri-action` to commit `fce9c6108b31ea247710505d3aaaa893ee6768d4` to avoid mutable tag drift.
