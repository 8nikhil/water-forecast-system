@echo off
title Create AquaPulse Desktop Shortcut
echo ===================================================================
echo   Creating AquaPulse Desktop Shortcut...
echo ===================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$shortcutPath = [System.IO.Path]::Combine($desktop, 'AquaPulse Water Platform.lnk'); " ^
  "$shortcut = $ws.CreateShortcut($shortcutPath); " ^
  "$shortcut.TargetPath = [System.IO.Path]::Combine('%~dp0', 'run.bat'); " ^
  "$shortcut.WorkingDirectory = '%~dp0'; " ^
  "$shortcut.Description = 'One-click launch for AquaPulse Water Forecasting Platform'; " ^
  "$shortcut.IconLocation = 'shell32.dll,13'; " ^
  "$shortcut.Save(); " ^
  "Write-Host '[OK] Shortcut created on your Desktop: AquaPulse Water Platform.lnk'"

echo.
echo You can now double-click 'AquaPulse Water Platform' on your Desktop anytime!
echo.
pause
