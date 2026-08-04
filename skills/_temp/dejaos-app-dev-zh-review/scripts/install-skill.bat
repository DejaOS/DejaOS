@echo off
setlocal

for %%I in ("%~dp0..") do set "DEJAOS_SKILL_SOURCE=%%~fI"

call :copy_skill "%USERPROFILE%\.codex\skills\dejaos-app-dev"
if errorlevel 1 exit /b 1

call :copy_skill "%USERPROFILE%\.cursor\skills\dejaos-app-dev"
if errorlevel 1 exit /b 1

call :copy_skill "%USERPROFILE%\.workbuddy\skills\dejaos-app-dev"
if errorlevel 1 exit /b 1

echo DejaOS App Skill copied successfully.
exit /b 0

:copy_skill
set "DEJAOS_SKILL_TARGET=%~1"
echo Copying to "%DEJAOS_SKILL_TARGET%"...
robocopy "%DEJAOS_SKILL_SOURCE%" "%DEJAOS_SKILL_TARGET%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XD ".git" ".skill-init-temp" >nul
if errorlevel 8 (
  echo Copy failed: "%DEJAOS_SKILL_TARGET%"
  exit /b 1
)
exit /b 0
