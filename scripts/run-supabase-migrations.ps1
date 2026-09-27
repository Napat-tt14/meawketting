$repoRoot = Split-Path -Parent $PSScriptRoot
$certificatePath = Join-Path $PSScriptRoot 'certs/supabase-prod-ca-2021.crt'
$securePassword = $null
$passwordBuffer = [IntPtr]::Zero
$plainPassword = $null
$previousMigrationUrl = $env:DATABASE_MIGRATION_URL
$previousCaBundle = $env:NODE_EXTRA_CA_CERTS
$migrationExitCode = 1

try {
  $securePassword = Read-Host 'Enter the new Supabase database password (input hidden)' -AsSecureString
  $passwordBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordBuffer)

  $escapedPassword = [uri]::EscapeDataString($plainPassword)
  $env:DATABASE_MIGRATION_URL = "postgresql://postgres.mgieoxfeqvcklhzxqnnl:$escapedPassword@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
  $env:NODE_EXTRA_CA_CERTS = $certificatePath
  $plainPassword = $null
  $escapedPassword = $null

  Push-Location $repoRoot
  try {
    npm.cmd run db:migrate
    $migrationExitCode = $LASTEXITCODE
  }
  finally {
    Pop-Location
  }
}
catch {
  Write-Error $_
}
finally {
  if ($passwordBuffer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordBuffer)
  }
  if ($null -ne $securePassword) {
    $securePassword.Dispose()
  }
  $plainPassword = $null
  $escapedPassword = $null
  if ($null -eq $previousMigrationUrl) {
    Remove-Item Env:DATABASE_MIGRATION_URL -ErrorAction SilentlyContinue
  }
  else {
    $env:DATABASE_MIGRATION_URL = $previousMigrationUrl
  }
  if ($null -eq $previousCaBundle) {
    Remove-Item Env:NODE_EXTRA_CA_CERTS -ErrorAction SilentlyContinue
  }
  else {
    $env:NODE_EXTRA_CA_CERTS = $previousCaBundle
  }
}

exit $migrationExitCode
