@echo off
setlocal

set "SOURCE=%~dp0dejaos-app-dev-sdk2-0"
set "CODEX_TARGET=C:\Users\Administrator\.codex\skills\dejaos-app-dev-sdk2-0"
set "CURSOR_TARGET=C:\Users\Administrator\.cursor\skills\dejaos-app-dev-sdk2-0"

if not exist "%SOURCE%\SKILL.md" (
    echo [ERROR] Source skill was not found:
    echo         %SOURCE%
    exit /b 1
)

echo [1/2] Copying skill to Codex...
robocopy "%SOURCE%" "%CODEX_TARGET%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NP
if errorlevel 8 (
    echo [ERROR] Failed to copy the skill to Codex. Robocopy exit code: %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [2/2] Copying skill to Cursor...
robocopy "%SOURCE%" "%CURSOR_TARGET%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NP
if errorlevel 8 (
    echo [ERROR] Failed to copy the skill to Cursor. Robocopy exit code: %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo [OK] Skill copied successfully to:
echo      %CODEX_TARGET%
echo      %CURSOR_TARGET%
exit /b 0
