' ============================================
'  DDL XiaoGuanJia - hidden launcher
'  Double-click to start server.js in background (no console window)
'  and open the browser. To stop: use "stop" script.
' ============================================
Option Explicit
Dim fso, sh, dir, ret

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

ret = sh.Run("cmd /c where node >nul 2>nul", 0, True)
If ret <> 0 Then
    MsgBox "Node.js not found. Please install Node.js 18+ from https://nodejs.org", 48, "DDL XiaoGuanJia"
    WScript.Quit
End If

' 0 = hidden window, False = do not wait
sh.Run "node server.js", 0, False

WScript.Sleep 1800
sh.Run "http://localhost:3000/", 1, False
