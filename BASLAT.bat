@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js kurulu degil. https://nodejs.org adresinden LTS surumunu kurun. & pause & exit /b)
if not exist node_modules (echo Ilk kurulum yapiliyor, birkac dakika surebilir... & call npm install)
rem Sunucu simge durumunda acilir. Bu pencereyi KAPATMAYIN ve ICINE TIKLAMAYIN (tiklanirsa program duraklar, Esc ile devam eder).
start "Satis Servis SUNUCU - kapatmayin" /min cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" http://localhost:5173
exit
