!macro customInit
!macroend

!macro customInstall
  MessageBox MB_ICONINFORMATION "Void Presence has been installed!$\nThank you for installing."
!macroend

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Delete all Void Presence data (profiles and cache)?" IDYES do_remove IDNO no_remove

do_remove:
  RMDir /r "$LOCALAPPDATA\VoidPresence"
  RMDir /r "$APPDATA\VoidPresence"

no_remove:
!macroend
