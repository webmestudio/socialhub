@echo off
chcp 65001 >nul
title SocialHub Media Poster (Instagram, TikTok, YouTube, dll)
cd /d "%~dp0"

echo ========================================================
echo        📸 SOCIALHUB MEDIA POSTER (FOTO / VIDEO)
echo ========================================================
echo.
echo Mode ini khusus untuk Instagram, TikTok, YouTube, dan platform lain
echo yang mewajibkan/mendukung lampiran foto atau video.
echo.

if not exist "cookies\instagram.json" if not exist "cookies\tiktok.json" if not exist "cookies\youtube.json" if not exist "cookies\threads.json" if not exist "cookies\facebook.json" (
    echo [PERHATIAN] Belum ada file cookie untuk platform media di folder 'cookies'.
    echo Pastikan minimal ada cookie instagram.json / tiktok.json / youtube.json / threads.json!
    echo.
    pause
    exit /b
)

echo Masukkan path lengkap file foto atau video yang ingin diposting:
echo (Contoh: C:\Users\azdev\Pictures\foto.png atau geser file ke jendela ini)
echo.
set /p MEDIA_INPUT="Path Media: "
set MEDIA_INPUT=%MEDIA_INPUT:"=%

if "%MEDIA_INPUT%"=="" (
    echo [Batal] Path file media tidak boleh kosong.
    echo.
    pause
    exit /b
)

if not exist "%MEDIA_INPUT%" (
    echo [Error] File media tidak ditemukan di: %MEDIA_INPUT%
    echo.
    pause
    exit /b
)

echo.
echo Ketik caption atau deskripsi postingan:
set /p CAPTION="Caption: "

echo.
echo Sedang memproses posting media di latar belakang...
echo.

node src/cli.js --text "%CAPTION%" --media "%MEDIA_INPUT%" --platforms instagram,tiktok,youtube,threads,facebook,linkedin

echo.
echo ========================================================
echo               Selesai! Silakan cek media sosial Anda.
echo ========================================================
echo.
pause
