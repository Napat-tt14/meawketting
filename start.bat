@echo off
setlocal EnableExtensions
title Meawketting - Local Front-end

set "PROJECT_DIR=%~dp0"
set "APP_URL=http://localhost:3000/"

pushd "%PROJECT_DIR%" >nul 2>&1
if errorlevel 1 (
  echo Could not open the project folder:
  echo   "%PROJECT_DIR%"
  pause
  exit /b 1
)

if not exist "package.json" (
  echo package.json was not found in:
  echo   "%PROJECT_DIR%"
  popd
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd was not found. Please install Node.js and try again.
  popd
  pause
  exit /b 1
)

echo Starting Meawketting dev server...
start "Meawketting Dev Server" /D "%PROJECT_DIR%" "%ComSpec%" /d /k "call npm.cmd run dev"
popd

echo Waiting for the server to start...
ping 127.0.0.1 -n 7 >nul
start "" "%APP_URL%"
endlocal
