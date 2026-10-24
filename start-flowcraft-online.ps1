param(
    [switch]$NoPublish,
    [string]$EnvFile = (Join-Path $PSScriptRoot 'backend\.env')
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runtime = Join-Path $root '.flowcraft-runtime'
$backendUrl = 'http://127.0.0.1:7001'
$productionUrl = 'https://flowcraft-ai-product.pages.dev/'
$productionEnv = Join-Path $root 'frontend\.env.production'

New-Item -ItemType Directory -Path $runtime -Force | Out-Null

function Import-DotEnv([string]$path) {
    if (!(Test-Path -LiteralPath $path)) {
        throw "Missing backend environment file: $path"
    }

    foreach ($line in Get-Content -LiteralPath $path) {
        if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            continue
        }
        $name = $matches[1]
        $value = $matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

function Test-Http([string]$url, [int]$timeoutSeconds = 5) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec $timeoutSeconds
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Find-BackendPython {
    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'pypoetry\Cache\virtualenvs'),
        (Join-Path $env:USERPROFILE 'AppData\Local\pypoetry\Cache\virtualenvs')
    ) | Select-Object -Unique

    foreach ($candidate in @(
        foreach ($venvRoot in $roots) {
            Get-ChildItem $venvRoot -Directory -Filter 'backend-*-py3.10' -ErrorAction SilentlyContinue
        }
    ) | Sort-Object LastWriteTime -Descending) {
        $python = Join-Path $candidate.FullName 'Scripts\python.exe'
        if (Test-Path -LiteralPath $python) { return $python }
    }
    throw 'Backend Python environment not found.'
}

function Find-Cloudflared {
    $command = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $candidates = @(
        'C:\Program Files (x86)\cloudflared\cloudflared.exe',
        'C:\Program Files\cloudflared\cloudflared.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    throw 'cloudflared is not installed. Install Cloudflare.cloudflared with winget first.'
}

Import-DotEnv $EnvFile
$env:FLOWCRAFT_DATA_DIR = $runtime
$env:LOCAL_ASSET_DIR = Join-Path $runtime 'local-assets'

if (!(Test-Http "$backendUrl/")) {
    $python = Find-BackendPython
    $backend = Start-Process $python `
        -ArgumentList '-m','uvicorn','main:app','--host','127.0.0.1','--port','7001' `
        -WorkingDirectory (Join-Path $root 'backend') `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $runtime 'backend.log') `
        -RedirectStandardError (Join-Path $runtime 'backend-error.log') `
        -PassThru
    $backend.Id | Set-Content -LiteralPath (Join-Path $runtime 'backend.pid')

    $deadline = (Get-Date).AddSeconds(60)
    while (!(Test-Http "$backendUrl/")) {
        if ($backend.HasExited) { throw "Backend exited. See $runtime\backend-error.log" }
        if ((Get-Date) -ge $deadline) { throw 'Backend did not become ready within 60 seconds.' }
        Start-Sleep -Milliseconds 500
    }
}
Write-Host 'Backend ready.' -ForegroundColor Green

$tunnelUrlFile = Join-Path $runtime 'tunnel-url.txt'
$tunnelUrl = if (Test-Path -LiteralPath $tunnelUrlFile) {
    (Get-Content -LiteralPath $tunnelUrlFile -Raw).Trim()
} else { '' }

if (!$tunnelUrl -or !(Test-Http "$tunnelUrl/api/capabilities" 10)) {
    $cloudflared = Find-Cloudflared
    $tunnelLog = Join-Path $runtime 'cloudflared.log'
    $tunnelErrorLog = Join-Path $runtime 'cloudflared-error.log'
    Clear-Content -LiteralPath $tunnelLog -ErrorAction SilentlyContinue
    Clear-Content -LiteralPath $tunnelErrorLog -ErrorAction SilentlyContinue

    $tunnel = Start-Process $cloudflared `
        -ArgumentList 'tunnel','--url',$backendUrl,'--no-autoupdate' `
        -WindowStyle Hidden `
        -RedirectStandardOutput $tunnelLog `
        -RedirectStandardError $tunnelErrorLog `
        -PassThru
    $tunnel.Id | Set-Content -LiteralPath (Join-Path $runtime 'cloudflared.pid')

    $deadline = (Get-Date).AddSeconds(60)
    do {
        if ($tunnel.HasExited) { throw "Tunnel exited. See $tunnelErrorLog" }
        $combined = @(
            Get-Content -LiteralPath $tunnelLog -Raw -ErrorAction SilentlyContinue
            Get-Content -LiteralPath $tunnelErrorLog -Raw -ErrorAction SilentlyContinue
        ) -join "`n"
        $match = [regex]::Match($combined, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $tunnelUrl = $match.Value }
        if (!$tunnelUrl) { Start-Sleep -Milliseconds 500 }
    } while (!$tunnelUrl -and (Get-Date) -lt $deadline)

    if (!$tunnelUrl) { throw 'Tunnel URL was not created within 60 seconds.' }
    $tunnelUrl | Set-Content -LiteralPath $tunnelUrlFile
}

if (!(Test-Http "$tunnelUrl/api/capabilities" 20)) {
    throw "Public backend health check failed: $tunnelUrl"
}
Write-Host "Public backend ready: $tunnelUrl" -ForegroundColor Green

$wsUrl = $tunnelUrl -replace '^https://', 'wss://'
$envContents = @(
    "VITE_HTTP_BACKEND_URL=$tunnelUrl"
    "VITE_WS_BACKEND_URL=$wsUrl"
    'VITE_IS_DEPLOYED=true'
    'VITE_DISABLE_CHECKER=true'
) -join "`r`n"
[System.IO.File]::WriteAllText($productionEnv, "$envContents`r`n")

if (!$NoPublish) {
    & git -C $root add -f frontend/.env.production
    & git -C $root diff --cached --quiet -- frontend/.env.production
    if ($LASTEXITCODE -ne 0) {
        & git -C $root commit -m 'deploy: refresh temporary backend tunnel'
        if ($LASTEXITCODE -ne 0) { throw 'Could not commit the refreshed tunnel URL.' }
        & git -C $root push origin main
        if ($LASTEXITCODE -ne 0) { throw 'Could not push the refreshed tunnel URL.' }
        Write-Host 'Cloudflare Pages deployment triggered. Allow about one minute for it to finish.' -ForegroundColor Yellow
    } else {
        Write-Host 'Tunnel URL is unchanged; no frontend deployment was needed.'
    }
}

Write-Host "Share: $productionUrl" -ForegroundColor Cyan
Write-Host 'Keep this computer online and do not stop the backend or cloudflared processes.'
