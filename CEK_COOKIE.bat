@echo off
chcp 65001 >nul
title SocialHub - Cek Status Cookie
cd /d "%~dp0"

echo ========================================================
echo         🔍 SOCIALHUB - PEMERIKSA STATUS COOKIE
echo ========================================================
echo.
echo Pilih jenis pengecekan:
echo [1] Pengecekan Cepat (Expiry & Kelengkapan Token - Instan)
echo [2] Pengecekan Live Browser (Tes Sesi Login Langsung dengan Playwright)
echo.
set /p pilihan="Pilihan Anda (1/2, default 1): "

if "%pilihan%"=="2" (
    echo.
    echo Menjalankan live verification dengan Playwright...
    echo.
    node src/cli.js --check-cookies --live
) else (
    echo.
    echo Menjalankan analisis statis cookie...
    echo.
    node src/cli.js --check-cookies
)

echo.
pause
