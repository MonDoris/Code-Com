# Runs the official tideorg/tidecloak-dev:latest distribution (TideCloak 0.14.41, Keycloak 26.7.5)
# directly on the host JVM, for machines without Docker.
#
# The server files in tidecloak-local/server were extracted unmodified from the image's layers
# (see scripts/fetch-tidecloak-image.sh). This script reproduces the image's ENTRYPOINT and the
# ENV values baked into the image config. It does NOT invent ORK/threshold settings: these are the
# image defaults, copied verbatim from its config blob (production Tide network, 14-of-20).
#
# Usage (PowerShell):   ./scripts/start-tidecloak.ps1
# Admin credentials are read from .env.tidecloak (gitignored), never hardcoded here.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'tidecloak-local\server'
$envFile = Join-Path $root '.env.tidecloak'
if (-not (Test-Path $envFile)) { throw ".env.tidecloak missing. Create it with KC_BOOTSTRAP_ADMIN_USERNAME / KC_BOOTSTRAP_ADMIN_PASSWORD." }
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object {
  $k, $v = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), 'Process')
}
if (-not $env:KC_BOOTSTRAP_ADMIN_PASSWORD) { throw "KC_BOOTSTRAP_ADMIN_PASSWORD is empty in .env.tidecloak" }

# Image ENV (from tideorg/tidecloak-dev:latest config, created 2026-10-19)
$env:KC_RUN_IN_CONTAINER = 'true'
$env:DOTNET_SYSTEM_GLOBALIZATION_INVARIANT = '1'
$env:USER_HOME_ORK = 'https://ork1.tideprotocol.com'
$env:SYSTEM_HOME_ORK = 'https://ork1.tideprotocol.com'
$env:THRESHOLD_T = '14'
$env:THRESHOLD_N = '20'
$env:PAYER_PUBLIC = '200000b967a7799ffd4476e1074777ebc83bec23a3843cb2e5ca43c83561802c8e646b'
if (-not $env:JAVA_HOME) {
  $jdk = Get-ChildItem 'C:\Program Files\Java' -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
  if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
Set-Location $server
# Image ENTRYPOINT: kc.sh start --import-realm --optimized
& (Join-Path $server 'bin\kc.bat') start --import-realm --optimized
