' Create a desktop shortcut that opens the deployed URL in an Edge app window.
' (ASCII only on purpose: cmd/wscript read these files as ANSI/GBK, UTF-8 Chinese shows garbled.)
Option Explicit
Dim fso, sh, dir, edge, url, desk, lnkPath, lnk

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then
    MsgBox "Microsoft Edge not found. Please create the shortcut to the URL manually.", 48, "DDL Helper"
    WScript.Quit
End If

url = InputBox("Paste your deployed URL (for example https://xxx.vercel.app):", "DDL Helper - Cloud Shortcut", "https://")
If Trim(url) = "" Then WScript.Quit
If Left(LCase(Trim(url)), 4) <> "http" Then
    MsgBox "The URL must start with http:// or https://", 48, "DDL Helper"
    WScript.Quit
End If
url = Trim(url)

desk = sh.SpecialFolders("Desktop")
lnkPath = desk & "\DDL Helper (Cloud).lnk"
Set lnk = sh.CreateShortcut(lnkPath)
lnk.TargetPath = edge
lnk.Arguments = "--app=" & url
lnk.WorkingDirectory = dir
lnk.IconLocation = dir & "\icons\app.ico,0"
lnk.Description = "DDL Helper (cloud edition, standalone window)"
lnk.Save()

MsgBox "Shortcut created on your Desktop: DDL Helper (Cloud)" & vbCrLf & vbCrLf & "Double-click it to open the app window (no local server needed).", 64, "DDL Helper"
