@echo off
rem Kara Nal: yerel sunucuyu baslatir ve tarayicida acar (http://127.0.0.1:5220).
cd /d "%~dp0"
if not exist node_modules call npm install
node server.mjs --open
