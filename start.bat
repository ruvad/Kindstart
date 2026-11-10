@echo off
rem Starts Kindstart on this computer.
rem JavaScript modules don't load from a double-clicked file (file://), so the app needs a
rem small web server (http://). Python has one built in. Close the server window to stop it.
cd /d "%~dp0"
start "Kindstart server - close this window to stop" python -m http.server 5560 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:5560/
