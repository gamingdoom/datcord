# Taken from LibreWolf: https://gitlab.com/librewolf-community/browser/windows/-/blob/master/assets/setup.nsi

!include "MUI2.nsh"
!include "LogicLib.nsh"
!addplugindir .
!addplugindir x86-ansi

!define APPNAME "Datcord"
!define PROGNAME "datcord"
!define EXECUTABLE "${PROGNAME}.exe"
!define PROG_VERSION "0.3.2"
!define COMPANYNAME "Datcord"
!define ESTIMATED_SIZE 190000
!define MUI_ICON "datcord.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "banner.bmp"

Name "${APPNAME}"
OutFile "datcordSetup-win64.exe"
InstallDirRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "InstallLocation"
InstallDir $PROGRAMFILES64\${APPNAME}
RequestExecutionLevel admin

# Pages

!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "Welcome to the Datcord Setup"
!define MUI_WELCOMEPAGE_TEXT "This setup will guide you through the installation of Datcord.$\r$\n$\r$\n\
If you don't have it installed already, this will also install the latest Visual C++ Redistributable.$\r$\n$\r$\n\
Click Next to continue."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section

	# Make sure Datcord is closed before the installation
	nsProcess::_FindProcess "${EXECUTABLE}"
	Pop $R0
	${If} $R0 = 0
		IfSilent 0 +4
		DetailPrint "${APPNAME} is still running, aborting because of silent install."
		SetErrorlevel 2
		Abort

		DetailPrint "${APPNAME} is still running"
		MessageBox MB_OKCANCEL "Datcord is still running and has to be closed for the setup to continue." IDOK continue IDCANCEL break
break:
		SetErrorlevel 1
		Abort
continue:
		DetailPrint "Closing ${APPNAME} gracefully..."
		nsProcess::_CloseProcess "${EXECUTABLE}"
		Pop $R0
		Sleep 2000
		nsProcess::_FindProcess "${EXECUTABLE}"
		Pop $R0
		${If} $R0 = 0
			DetailPrint "Failed to close ${APPNAME}, killing it..."
			nsProcess::_KillProcess "${EXECUTABLE}"
			Sleep 2000
			nsProcess::_FindProcess "${EXECUTABLE}"
			Pop $R0
		${EndIf}
	${EndIf}

	# Install Visual C++ Redistributable (only if not silent)
	IfSilent +4 0
	InitPluginsDir
	File /oname=$PLUGINSDIR\vc_redist.x64.exe vc_redist.x64.exe
	ExecWait "$PLUGINSDIR\vc_redist.x64.exe /install /quiet /norestart"

	# Copy files
	SetOutPath $INSTDIR
	File /r datcord\*.*

	# Start Menu
	createDirectory "$SMPROGRAMS\${COMPANYNAME}"
	createShortCut "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}.lnk" "$INSTDIR\${PROGNAME}.exe" "" "$INSTDIR\${MUI_ICON}"
	createShortCut "$SMPROGRAMS\${COMPANYNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" ""

	# Uninstaller 
	writeUninstaller "$INSTDIR\uninstall.exe"

	# Registry information for add/remove programs
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayName" "${APPNAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayIcon" "$\"$INSTDIR\${MUI_ICON}$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "Publisher" "${COMPANYNAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "DisplayVersion" "${PROG_VERSION}"
	# There is no option for modifying or repairing the install
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "NoRepair" 1
	# Set the INSTALLSIZE constant (!defined at the top of this script) so Add/Remove Programs can accurately report the size
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}" "EstimatedSize" ${ESTIMATED_SIZE}

SectionEnd


# Uninstaller
section "Uninstall"

	# Kill Datcord if it is still running
	nsProcess::_FindProcess "${EXECUTABLE}"
	Pop $R0
	${If} $R0 = 0
		DetailPrint "${APPNAME} is still running, killing it..."
		nsProcess::_KillProcess "${EXECUTABLE}"
		Sleep 2000
	${EndIf}

	# Remove Start Menu launcher
	delete "$SMPROGRAMS\${COMPANYNAME}\${APPNAME}.lnk"
	delete "$SMPROGRAMS\${COMPANYNAME}\Uninstall.lnk"
	# Try to remove the Start Menu folder - this will only happen if it is empty
	rmDir "$SMPROGRAMS\${COMPANYNAME}"
 
	# Remove files
	rmDir /r $INSTDIR

	# Remove uninstaller information from the registry
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${COMPANYNAME} ${APPNAME}"

sectionEnd