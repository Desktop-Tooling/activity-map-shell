# Usage: .\focus-window.ps1 <hwnd>
# Brings the window to foreground
param([string]$Hwnd)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32Focus {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    public const int SW_RESTORE = 9;
}
"@

$ptr = [IntPtr][long]$Hwnd
if ([Win32Focus]::IsIconic($ptr)) { [void][Win32Focus]::ShowWindow($ptr, [Win32Focus]::SW_RESTORE) }
[void][Win32Focus]::SetForegroundWindow($ptr)
