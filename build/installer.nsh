; SageFlow Modern - Custom NSIS Installer Script
; This file is included by electron-builder's NSIS target

!macro customHeader
  !system "echo 'SageFlow Modern Installer'"
!macroend

!macro preInit
  ; Set default installation directory
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES64\SageFlow Modern"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LOCALAPPDATA\SageFlow Modern"
!macroend

!macro customInit
  ; Custom initialization
!macroend

!macro customInstall
  ; Create additional shortcuts
  CreateShortcut "$DESKTOP\SageFlow Modern.lnk" "$INSTDIR\SageFlow Modern.exe" "" "$INSTDIR\SageFlow Modern.exe" 0

  ; Register URL protocol for deep linking (sageflow://)
  WriteRegStr HKCU "Software\Classes\sageflow" "" "URL:SageFlow Protocol"
  WriteRegStr HKCU "Software\Classes\sageflow" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\sageflow\shell\open\command" "" '"$INSTDIR\SageFlow Modern.exe" "%1"'

  ; Add to Windows Apps list with proper info
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayIcon" "$INSTDIR\SageFlow Modern.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "URLInfoAbout" "https://sageflow.app"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "HelpLink" "https://sageflow.app/support"
!macroend

!macro customUnInstall
  ; Remove desktop shortcut
  Delete "$DESKTOP\SageFlow Modern.lnk"

  ; Remove URL protocol registration
  DeleteRegKey HKCU "Software\Classes\sageflow"
!macroend

!macro customInstallMode
  ; Allow both per-user and per-machine installation
  StrCpy $isForceCurrentInstall "1"
!macroend
