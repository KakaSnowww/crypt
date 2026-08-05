@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFICAR-BUSCA-GLOBAL.ps1"
