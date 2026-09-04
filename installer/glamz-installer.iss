; S M Glamz Salon - Windows installer (Inno Setup 6)
; Build on Windows: build-installer.bat
; Or manually: ISCC.exe installer\glamz-installer.iss

#define MyAppName "S M Glamz Salon"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "S M Glamz"
#define MyAppExeName "GlamzLauncher.exe"
#define MyAppURL "http://localhost:4000"

[Setup]
AppId={{A7B3C9D1-4E2F-5A6B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=no
OutputDir=output
OutputBaseFilename=GlamzSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\public\favicon.ico
SetupIconFile=..\public\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &Desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: checkedonce

[Files]
; Application root
Source: "..\GlamzLauncher.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\GlamzLauncher.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-app.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\upgrade.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\backup-database.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dev.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\install-shortcut.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\.env"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "..\smg.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*,public\*,.env"
Source: "..\backend\public\*"; DestDir: "{app}\backend\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\backend\.env.example"; DestDir: "{app}\backend"; DestName: ".env"; Flags: onlyifdoesntexist

[Dirs]
Name: "{app}\backups"; Permissions: users-modify
Name: "{app}\node_modules"; Permissions: users-modify

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"
Name: "{group}\Setup (first time)"; Filename: "{app}\setup.bat"; WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"
Name: "{group}\Upgrade (keep existing data)"; Filename: "{app}\upgrade.bat"; WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"
Name: "{group}\Backup database"; Filename: "{app}\backup-database.bat"; WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\setup.bat"; Description: "Run first-time setup (install Node packages)"; Flags: postinstall skipifsilent unchecked
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName} now"; Flags: postinstall nowait skipifsilent unchecked

[Code]
function NodeInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c node --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function InitializeSetup: Boolean;
begin
  Result := True;
  if not NodeInstalled then
    if MsgBox('Node.js was not detected on this PC.' + #13#10 + #13#10 +
      'Install Node.js LTS from https://nodejs.org before using the salon panel.' + #13#10 + #13#10 +
      'Continue installer anyway?', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
end;