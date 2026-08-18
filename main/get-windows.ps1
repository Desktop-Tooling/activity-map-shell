# Outputs JSON array of visible windows: hwnd, title, processId, processName
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class Win32 {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentProcessId();

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static List<string> Results = new List<string>();

    public static bool EnumCallback(IntPtr hWnd, IntPtr lParam) {
        if (!IsWindowVisible(hWnd)) return true;
        int len = GetWindowTextLength(hWnd);
        if (len == 0) return true;
        var sb = new StringBuilder(len + 1);
        GetWindowText(hWnd, sb, sb.Capacity);
        string title = sb.ToString().Trim();
        if (string.IsNullOrEmpty(title)) return true;
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        string line = hWnd.ToInt64().ToString() + "|" + pid.ToString() + "|" + title.Replace("|", "_").Replace("\r", "").Replace("\n", " ");
        Results.Add(line);
        return true;
    }
}
"@

[void][Win32]::EnumWindows([Win32]::EnumWindowsProc([Win32]::EnumCallback), IntPtr::Zero)

$items = @()
foreach ($line in [Win32]::Results) {
    $parts = $line -split '\|', 3
    if ($parts.Length -ge 3) {
        $hwnd = $parts[0]
        $pid = $parts[1]
        $title = $parts[2]
        $startTime = $null
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            $pname = if ($proc) { $proc.ProcessName } else { "Unknown" }
            if ($proc -and $proc.StartTime) { $startTime = $proc.StartTime.ToString("o") }
        } catch { $pname = "Unknown" }
        $items += [PSCustomObject]@{ hwnd = $hwnd; processId = [int]$pid; title = $title; processName = $pname; startTime = $startTime }
    }
}
$items | ConvertTo-Json -Compress
