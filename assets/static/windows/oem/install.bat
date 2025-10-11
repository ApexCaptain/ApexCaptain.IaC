@echo off

echo Running initial installation scripts...

powershell -ExecutionPolicy Bypass -File "%~dp0remove-unnecessary-apps.ps1"