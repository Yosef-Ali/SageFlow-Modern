' SageFlow Shortcut Creator
' Creates a desktop shortcut with the SageFlow icon
' Run this once after copying the portable folder

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get paths
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
DesktopPath = WshShell.SpecialFolders("Desktop")
ShortcutPath = DesktopPath & "\SageFlow Accounting.lnk"

' Create shortcut
Set Shortcut = WshShell.CreateShortcut(ShortcutPath)
Shortcut.TargetPath = ScriptDir & "\SageFlow.vbs"
Shortcut.WorkingDirectory = ScriptDir
Shortcut.IconLocation = ScriptDir & "\icon.ico"
Shortcut.Description = "SageFlow Accounting - Modern accounting for Ethiopian businesses"
Shortcut.Save

MsgBox "Desktop shortcut created successfully!" & vbCrLf & vbCrLf & _
       "You can now launch SageFlow from your desktop.", _
       vbInformation, "SageFlow Setup"

WScript.Quit 0
