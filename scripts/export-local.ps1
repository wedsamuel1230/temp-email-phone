$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path

Push-Location $repoRoot
try {

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host 'Checking local export prerequisites...'

if (-not (Test-CommandExists -Name 'cargo')) {
    Write-Error 'Rust/Cargo is required. Install from https://rustup.rs and retry.'
}

if (-not (Test-CommandExists -Name 'npm')) {
    Write-Error 'npm is required. Install Node.js LTS and retry.'
}

if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
    Write-Host 'Installing dependencies...'
    npm install
}
else {
    Write-Host 'Dependencies already installed; skipping install.'
}

Write-Host 'Building Tauri bundle (unsigned)...'
$tauriCommand = Join-Path $repoRoot 'node_modules\@tauri-apps\cli\tauri.js'

if (-not (Test-Path $tauriCommand)) {
    Write-Error 'Tauri CLI is missing. Run npm install to restore node_modules, then retry.'
}

node $tauriCommand build --no-sign

Write-Host 'Done. Bundles are in src-tauri/target/release/bundle/'
}
finally {
    Pop-Location
}
