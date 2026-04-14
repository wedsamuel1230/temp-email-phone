# Temp Inbox Manager (Scaffold)

Production-ready scaffold generated for:
- Tauri 2 desktop shell
- SvelteKit frontend
- TypeScript strict mode

## Quick Start

1. Install dependencies:

```powershell
npm install
```

2. Run frontend only:

```powershell
npm run dev
```

3. Run desktop app (requires Rust toolchain + Tauri prerequisites):

```powershell
npm run tauri:dev
```

## Export for Windows and macOS

### Local export (current machine)

```powershell
npm run export:local
# or
& .\scripts\export-local.ps1
```

If you run the script via an absolute path and the path contains `&`, quote it and use the call operator:

```powershell
& "D:\projects\node.js\temp-email&phone\scripts\export-local.ps1"
```

Output folder:

```text
src-tauri/target/release/bundle/
```

### Cross-platform export (recommended)

Use GitHub Actions workflow:

- Workflow file: `.github/workflows/export-desktop.yml`
- Builds native bundles on:
	- `windows-latest`
	- `macos-latest`
- Uploads artifacts:
	- `tauri-windows-bundle`
	- `tauri-macos-bundle`

macOS artifacts include usable `.app` and `.dmg` bundles (configured by `src-tauri/tauri.macos.conf.json`).

## Quality Gates

```powershell
npm run test -- src/lib/utils/phonePoolParser.test.ts
npm run check
npm run lint
npm run build
```

## Scaffold Layout

- src/routes: SvelteKit routes
- src/lib/api: typed contracts
- src/lib/services: Mail.tm, local persistence, refresh loop services
- src/lib/utils: parser, OTP extraction, URL masking utilities
- src-tauri: Tauri Rust app and desktop config

## Notes

- `.npmrc` sets `script-shell=powershell` to avoid script issues with `&` in workspace path.
- Local memory state is tracked in `memory-bank/` per workflow requirements.
