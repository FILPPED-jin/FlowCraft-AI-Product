param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runtime = Join-Path $root '.flowcraft-runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null

function Wait-Http([string]$url, $process) {
    $deadline = (Get-Date).AddSeconds(60)
    do {
        if ($process -and $process.HasExited) { throw "Service exited. Check logs in $runtime" }
        try {
            $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        } catch { }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "Service did not become ready: $url. Check logs in $runtime"
}

function Find-Service([int]$port, [string]$marker) {
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    if (!$listeners.Count) { return $null }
    $ownerIds = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($ownerId in $ownerIds) {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
        if (!$processInfo.CommandLine -or !$processInfo.CommandLine.Contains($marker)) {
            throw "Port $port is occupied by an unrecognized process ($ownerId). No process was stopped."
        }
    }
    return Get-Process -Id $ownerIds[0]
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (!(Test-Path $node)) { throw 'Node.js was not found.' }
$python = $null
$poetry = Get-Command poetry -ErrorAction SilentlyContinue
if ($poetry) {
    Push-Location (Join-Path $root 'backend')
    try {
        $venv = & $poetry.Source env info --path
        if ($LASTEXITCODE -eq 0) { $python = Join-Path $venv 'Scripts/python.exe' }
    } finally { Pop-Location }
}
if (!$python -or !(Test-Path $python)) {
    $virtualenvRoots = @(
        (Join-Path $env:LOCALAPPDATA 'pypoetry/Cache/virtualenvs'),
        (Join-Path $env:USERPROFILE 'AppData/Local/pypoetry/Cache/virtualenvs')
    ) | Select-Object -Unique
    $candidates = @(
        foreach ($virtualenvRoot in $virtualenvRoots) {
            Get-ChildItem $virtualenvRoot -Directory -Filter 'backend-*-py3.10' -ErrorAction SilentlyContinue
        }
    ) | Sort-Object LastWriteTime -Descending
    foreach ($candidate in $candidates) {
        $candidatePython = Join-Path $candidate.FullName 'Scripts/python.exe'
        if (Test-Path $candidatePython) {
            $python = $candidatePython
            break
        }
    }
}
if (!$python -or !(Test-Path $python)) { throw 'Backend Poetry environment not found. Run poetry install in backend first.' }
$vite = Join-Path $root 'frontend/node_modules/vite/bin/vite.js'
if (!(Test-Path $vite)) { throw 'Frontend dependencies missing. Run pnpm install in frontend first.' }

$backend = Find-Service 7001 $root
if (!$backend) {
    $backend = Start-Process $python -ArgumentList '-m','uvicorn','main:app','--app-dir',('"' + (Join-Path $root 'backend') + '"'),'--host','127.0.0.1','--port','7001' -WorkingDirectory (Join-Path $root 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'backend.log') -RedirectStandardError (Join-Path $runtime 'backend-error.log') -PassThru
}
Wait-Http 'http://127.0.0.1:7001/api/design-systems' $backend

# Force one browser origin and one proxy target, including when .env.local has old values.
$env:VITE_HTTP_BACKEND_URL = ''
$env:VITE_WS_BACKEND_URL = ''
$env:PROXY_CODEGEN_BACKEND = 'http://127.0.0.1:7001'
$frontend = Find-Service 5173 $root
if (!$frontend) {
    $frontend = Start-Process $node -ArgumentList ('"' + $vite + '"'),'--host','127.0.0.1','--port','5173','--strictPort' -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'frontend.log') -RedirectStandardError (Join-Path $runtime 'frontend-error.log') -PassThru
}
Wait-Http 'http://127.0.0.1:5173/' $frontend
Wait-Http 'http://127.0.0.1:5173/api/design-systems' $frontend
Write-Host 'FlowCraft ready: http://127.0.0.1:5173/'
Write-Host 'Startup checks passed. Model generation is not tested by this script.'
if (!$NoBrowser) { Start-Process 'http://127.0.0.1:5173/' }
