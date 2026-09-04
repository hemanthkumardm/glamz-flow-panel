param(
    [Parameter(Mandatory = $true)][string]$AppDir,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$Icon
)

$ErrorActionPreference = "Stop"
$name = "S M Glamz Salon"
$wsh = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = [Environment]::GetFolderPath("Programs")
$folder = Join-Path $startMenu $name

if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Path $folder | Out-Null
}

function New-AppShortcut([string]$path, [string]$targetPath, [string]$description) {
    $s = $wsh.CreateShortcut($path)
    $s.TargetPath = $targetPath
    $s.WorkingDirectory = $AppDir
    $s.IconLocation = "$Icon,0"
    $s.Description = $description
    if ($targetPath -like "*.vbs") { $s.WindowStyle = 1 }
    $s.Save()
}

New-AppShortcut (Join-Path $desktop "$name.lnk") $Target "S M Glamz Salon Management System"
New-AppShortcut (Join-Path $folder "$name.lnk") $Target "S M Glamz Salon Management System"
New-AppShortcut (Join-Path $folder "Setup (first time).lnk") (Join-Path $AppDir "setup.bat") "Run first-time salon setup"

Write-Host "Desktop shortcut created."
Write-Host "Start Menu folder created: Programs\$name"