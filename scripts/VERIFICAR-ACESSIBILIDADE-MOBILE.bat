@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFICAR-ACESSIBILIDADE-MOBILE.ps1"
