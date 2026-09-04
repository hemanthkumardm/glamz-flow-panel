' S M Glamz Salon - double-click launcher (no console flash)
Option Explicit

Dim shell, fso, appDir, startBat

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
startBat = fso.BuildPath(appDir, "start-app.bat")

If Not fso.FileExists(startBat) Then
    MsgBox "start-app.bat was not found." & vbCrLf & vbCrLf & _
           "Keep this launcher in the S M Glamz salon folder.", vbCritical, "S M Glamz Salon"
    WScript.Quit 1
End If

shell.CurrentDirectory = appDir
shell.Run "cmd /c """ & startBat & """", 1, False