@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFICAR-CORRECAO-TYPESCRIPT.ps1"
