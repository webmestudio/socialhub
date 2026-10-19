@echo off
chcp 65001 >nul
title SocialHub Web Dashboard
cd /d "%~dp0"

echo ========================================================
echo            🚀 MEMBUKA SOCIALHUB WEB DASHBOARD
echo ========================================================
echo.
echo Menjalankan server di http://localhost:3456 ...
echo Browser akan otomatis dibuka.
echo (Tekan Ctrl + C di terminal ini jika ingin menghentikan server)
echo.

start http://localhost:3456
node src/server.js
pause
