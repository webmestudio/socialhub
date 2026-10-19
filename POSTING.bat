@echo off
chcp 65001 >nul
title SocialHub Auto-Poster
cd /d "%~dp0"

echo ========================================================
echo              🚀 SOCIALHUB AUTO-POSTER
echo ========================================================
echo.

if not exist "cookies\threads.json" if not exist "cookies\twitter.json" if not exist "cookies\facebook.json" if not exist "cookies\linkedin.json" (
    echo [PERHATIAN] Belum ada file cookie platform teks di folder 'cookies'.
    echo Silakan paste file cookie (threads.json / twitter.json / facebook.json / linkedin.json) terlebih dahulu!
    echo.
    pause
    exit /b
)

echo Ketik status/postingan yang ingin Anda publish:
echo (Tekan Enter jika sudah selesai)
echo.
set /p POST_TEXT="Teks: "

if "%POST_TEXT%"=="" (
    echo [Batal] Teks postingan tidak boleh kosong.
    echo.
    pause
    exit /b
)

echo.
echo Sedang memproses postingan di latar belakang...
echo.

node src/cli.js --text "%POST_TEXT%"

echo.
echo ========================================================
echo               Selesai! Silakan cek media sosial Anda.
echo ========================================================
echo.
pause
