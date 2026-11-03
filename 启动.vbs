' ============================================
'  DDL XiaoGuanJia - hidden launcher
'  Double-click: start server.js in background (no console window)
'  and open the browser. If already running, just open the browser.
'  To stop: use "stop" script.
' ============================================
Option Explicit
Dim fso, sh, dir, ret, running

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

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

If running Then
    ' Already running: only open the browser, do not start a second instance
    sh.Run "http://localhost:3000/", 1, False
    WScript.Quit
End If

' 3) Start hidden (0 = hidden window, False = do not wait)
sh.Run "node server.js", 0, False

' 4) Wait for the server, then open the browser
WScript.Sleep 1800
sh.Run "http://localhost:3000/", 1, False
