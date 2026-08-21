@echo off
chcp 65001 >nul
cd /d "%~dp0.."
node scripts\verify-release.mjs
echo.
pause
