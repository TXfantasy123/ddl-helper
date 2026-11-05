' ============================================
'  DDL XiaoGuanJia - hidden launcher
'  1) start server.js in background (no console window)
'  2) open the app in an Edge app window (no address bar, own taskbar icon)
'  If already running, just open the app window.
'  To stop: use the "stop" script.
' ============================================
Option Explicit
Dim fso, sh, dir, ret, running, edge, appUrl

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
appUrl = "http://localhost:3000/"

' Edge app-window path (x86 / x64 install)
edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"

' 1) Node.js installed?
ret = sh.Run("cmd /c where node >nul 2>nul", 0, True)
If ret <> 0 Then
    MsgBox "Node.js not found. Please install Node.js 18+ from https://nodejs.org", 48, "DDL XiaoGuanJia"
    WScript.Quit
End If

' 2) Server already running on port 3000? (findstr exits 0 when found)
running = False
ret = sh.Run("cmd /c netstat -ano | findstr "":3000"" | findstr ""LISTENING"" >nul 2>nul", 0, True)
If ret = 0 Then running = True

' 3) Start hidden if needed (0 = hidden window, False = do not wait)
If Not running Then
    sh.Run "node server.js", 0, False
    WScript.Sleep 1800
End If

' 4) Open as an app window: no tabs, no address bar, own taskbar icon
If fso.FileExists(edge) Then
    sh.Run """" & edge & """ --app=" & appUrl, 1, False
Else
    sh.Run appUrl, 1, False
End If
