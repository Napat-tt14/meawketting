$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$supabaseUrl = 'https://mgieoxfeqvcklhzxqnnl.supabase.co'
$publishableKey = 'sb_publishable_xKSRSgAlE9ozFXqnGWdKsw_EWtA13nN'
$certificatePath = Join-Path $PSScriptRoot 'certs/supabase-prod-ca-2021.crt'
$tempDirectory = Join-Path $env:TEMP ('meawketting-pilot-' + [guid]::NewGuid().ToString('N'))
$secretFile = Join-Path $tempDirectory 'secrets.json'
$oldValues = @{}
$envNames = @('DATABASE_MIGRATION_URL', 'NODE_EXTRA_CA_CERTS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
$dbSecure = $null
$keySecure = $null
$dbBuffer = [IntPtr]::Zero
$keyBuffer = [IntPtr]::Zero
$dbPassword = $null
$serviceKey = $null
$runtime = $null
$resultCode = 1

foreach ($name in $envNames) { $oldValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }

try {
  $dbSecure = Read-Host 'Supabase database password (hidden)' -AsSecureString
  $dbBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSecure)
  $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbBuffer)
  $keySecure = Read-Host 'Supabase server secret key (hidden; do not paste it in chat)' -AsSecureString
  $keyBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
  $serviceKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyBuffer)

  $escapedPassword = [uri]::EscapeDataString($dbPassword)
  $env:DATABASE_MIGRATION_URL = "postgresql://postgres.mgieoxfeqvcklhzxqnnl:$escapedPassword@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
  $env:NODE_EXTRA_CA_CERTS = $certificatePath
  $env:SUPABASE_URL = $supabaseUrl
  $env:SUPABASE_SERVICE_ROLE_KEY = $serviceKey
  $escapedPassword = $null
  $dbPassword = $null
  $serviceKey = $null

  Push-Location $repoRoot
  try {
    npm.cmd run storage:setup
    if ($LASTEXITCODE -ne 0) { throw 'Supabase private media bucket setup failed.' }

    $runtimeOutput = & node (Join-Path $PSScriptRoot 'provision-pilot-role.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Supabase runtime role setup failed.' }
    $runtime = (($runtimeOutput -join [Environment]::NewLine) | ConvertFrom-Json)
    if (-not $runtime.databaseUrl) { throw 'Supabase runtime connection verification did not return a URL.' }

    New-Item -ItemType Directory -Path $tempDirectory | Out-Null
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $grant = '{0}:(F)' -f $identity
    & icacls.exe $tempDirectory /inheritance:r /grant:r $grant | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not protect the temporary Worker secret file.' }

    $secrets = [ordered]@{
      DATABASE_URL = $runtime.databaseUrl
      SUPABASE_URL = $supabaseUrl
      SUPABASE_PUBLISHABLE_KEY = $publishableKey
      SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyBuffer)
    }
    $json = ConvertTo-Json -InputObject $secrets -Compress
    [IO.File]::WriteAllText($secretFile, $json, [Text.UTF8Encoding]::new($false))
    $json = $null
    $secrets = $null

    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Application build failed; the staging Worker was not deployed.' }

    & (Join-Path $repoRoot 'node_modules/.bin/wrangler.cmd') deploy --config (Join-Path $repoRoot 'wrangler.pilot.json') --secrets-file $secretFile
    if ($LASTEXITCODE -ne 0) { throw 'Cloudflare staging deployment failed.' }
    $resultCode = 0
  }
  finally { Pop-Location }
}
catch { Write-Error $_ }
finally {
  if (Test-Path -LiteralPath $secretFile) {
    try {
      $length = (Get-Item -LiteralPath $secretFile).Length
      if ($length -gt 0) { [IO.File]::WriteAllBytes($secretFile, [byte[]]::new([int]$length)) }
      Remove-Item -LiteralPath $secretFile -Force
    } catch { Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue }
  }
  if (Test-Path -LiteralPath $tempDirectory) { Remove-Item -LiteralPath $tempDirectory -Force -ErrorAction SilentlyContinue }
  if ($dbBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbBuffer) }
  if ($keyBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyBuffer) }
  if ($null -ne $dbSecure) { $dbSecure.Dispose() }
  if ($null -ne $keySecure) { $keySecure.Dispose() }
  $dbPassword = $null
  $serviceKey = $null
  $escapedPassword = $null
  $runtimeOutput = $null
  $json = $null
  $secrets = $null
  $runtime = $null
  foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $oldValues[$name], 'Process') }
}

if ($resultCode -eq 0) { Write-Host 'Pilot Worker deployed with server secrets and staging-only settings.' }
exit $resultCode
