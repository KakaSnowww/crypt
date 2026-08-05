@echo off
set "ROOT=%USERPROFILE%\Documents\Crypt\public\arcana"
if not exist "%ROOT%\tiers" mkdir "%ROOT%\tiers"
if not exist "%ROOT%\runes" mkdir "%ROOT%\runes"
start "" explorer "%ROOT%"
