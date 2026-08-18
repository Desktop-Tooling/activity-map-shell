# Outputs JSON array of { path, name } from Start Menu and common locations.
# Uses WScript.Shell to resolve .lnk targets. Dedupes by normalized path.
$shell = New-Object -ComObject WScript.Shell
$seen = @{}
$results = [System.Collections.ArrayList]@()

function Add-App {
  param([string]$Path, [string]$Name)
  if (-not $Path) { return }
  if ($Path -notmatch '\.(exe|bat|cmd|msc)$') { return }
  $norm = $Path.ToLowerInvariant().Replace('\', '/').TrimEnd('/')
  if ($seen[$norm]) { return }
  $seen[$norm] = $true
  $nameSafe = if ($Name) { $Name.Trim() } else { [System.IO.Path]::GetFileNameWithoutExtension($Path) }
  if (-not $nameSafe) { $nameSafe = [System.IO.Path]::GetFileNameWithoutExtension($Path) }
  [void]$results.Add([PSCustomObject]@{ path = $Path; name = $nameSafe })
}

$linkDirs = @(
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
  "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('CommonDesktopDirectory')
)
foreach ($dir in $linkDirs) {
  if (-not (Test-Path -LiteralPath $dir -ErrorAction SilentlyContinue)) { continue }
  Get-ChildItem -Path $dir -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $shortcut = $shell.CreateShortcut($_.FullName)
      $target = $shortcut.TargetPath
      $name = if ($shortcut.Description) { $shortcut.Description } else { $_.BaseName }
      if ($target -and $target -match '\.(exe|bat|cmd|msc)$') {
        if (Test-Path -LiteralPath $target -PathType Leaf -ErrorAction SilentlyContinue) {
          Add-App -Path $target -Name $name
        } else {
          Add-App -Path $target -Name $name
        }
      }
    } catch {}
  }
}

# Common executables by path or name (Get-Command resolves from PATH)
$extraPaths = @(
  (Join-Path $env:LOCALAPPDATA "Programs\cursor\Cursor.exe"),
  (Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\cursor.exe"),
  (Join-Path ${env:ProgramFiles} "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\msedge.exe"),
  (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe")
)
$extraNames = @("notepad", "explorer", "calc", "mspaint", "cmd", "powershell", "Code", "Cursor", "chrome", "msedge")
foreach ($p in $extraPaths) {
  if ($p -and (Test-Path -LiteralPath $p -PathType Leaf -ErrorAction SilentlyContinue)) {
    Add-App -Path $p -Name ([System.IO.Path]::GetFileNameWithoutExtension($p))
  }
}
foreach ($name in $extraNames) {
  $exe = (Get-Command $name -ErrorAction SilentlyContinue).Source
  if ($exe) { Add-App -Path $exe -Name ([System.IO.Path]::GetFileNameWithoutExtension($exe)) }
}

# Ensure JSON array (PowerShell outputs single object when count is 1)
@($results | Sort-Object -Property name) | ConvertTo-Json -Compress