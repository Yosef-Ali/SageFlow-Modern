' SageFlow Portable Launcher
' This script starts the standalone Next.js server and opens it in a browser
' No Admin privileges required!

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the folder where this script is located
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
StandaloneDir = ScriptDir & "\standalone"
ServerJS = StandaloneDir & "\server.js"

' Check if server.js exists
If Not FSO.FileExists(ServerJS) Then
    MsgBox "Error: standalone\server.js not found!" & vbCrLf & vbCrLf & _
           "Please run 'pnpm build' first to create the standalone build.", _
           vbCritical, "SageFlow Error"
    WScript.Quit 1
End If

' Set port
Port = "3000"

' Set environment variables
WshShell.Environment("PROCESS")("PORT") = Port
WshShell.Environment("PROCESS")("HOSTNAME") = "localhost"
WshShell.Environment("PROCESS")("NODE_ENV") = "production"

' Start the server
WshShell.Run "cmd /c cd /d """ & StandaloneDir & """ && node server.js", 0, False

' Wait for server to start
WScript.Sleep 3000

' Open in default browser
WshShell.Run "http://localhost:" & Port, 1, False

' Done!
WScript.Quit 0
