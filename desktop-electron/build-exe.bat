@echo off
chcp 65001 >nul
echo ===================================================
echo   NEGRUZINO.EXE // 1994 — Сборка Windows .EXE
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ОШИБКА] Не найден Node.js. Установите Node.js LTS с https://nodejs.org/
  pause
  exit /b 1
)

echo [1/2] Установка движка Electron и сборщика...
call npm install
if %errorlevel% neq 0 (
  echo [ОШИБКА] Не удалось установить зависимости.
  pause
  exit /b 1
)

echo.
echo [2/2] Сборка автономного файла dist\NEGRUZINO.exe ...
call npm run dist
if %errorlevel% neq 0 (
  echo [ОШИБКА] Ошибка при сборке .EXE.
  pause
  exit /b 1
)

echo.
echo ===================================================
echo   ГОТОВО! Игровой файл создан: dist\NEGRUZINO.exe
echo ===================================================
explorer dist
pause
