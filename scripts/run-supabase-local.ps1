$ErrorActionPreference = 'Stop'
$env:MEAWKETTING_AUTH_MODE = 'supabase'
$env:NODE_EXTRA_CA_CERTS = Join-Path $PSScriptRoot 'certs/supabase-prod-ca-2021.crt'
Push-Location (Split-Path -Parent $PSScriptRoot)
try { npm.cmd run dev -- --port 3000 }
finally { Pop-Location }
