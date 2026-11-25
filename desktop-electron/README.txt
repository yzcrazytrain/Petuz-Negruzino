НЕГРУЗИНО.EXE // 1994 — Десктоп-сборка (Electron) и оффлайн HTML
================================================================

1. БЫСТРЫЙ ЗАПУСК БЕЗ УСТАНОВКИ (HTML):
   Откройте файл app.html двойным кликом в любом современном браузере
   (Chrome, Edge, Firefox, Яндекс.Браузер). Все 3D-текстуры, сюжетные
   иллюстрации, звуки и музыка вшиты внутрь файла — интернет не нужен.

2. СБОРКА ОТДЕЛЬНОГО WINDOWS .EXE ФАЙЛА (NEGRUZINO.exe):
   - Установите Node.js LTS (https://nodejs.org/), если его еще нет.
   - Распакуйте этот архив в любую папку на ПК.
   - Запустите build-exe.bat двойным кликом (или выполните в терминале:
     npm install && npm run dist).
   - Через ~1 минуту в папке dist\ появится готовый автономный
     NEGRUZINO.exe с аппаратным ускорением WebGL2 и полным экраном (F11).

3. ЗАПУСК ЧЕРЕЗ ELECTRON БЕЗ СБОРКИ .EXE:
   npm install
   npm start

================================================================
ENGLISH INSTRUCTIONS:
- Offline play immediately: open app.html in any modern browser.
- Build standalone Windows NEGRUZINO.exe: install Node.js LTS, then
  double-click build-exe.bat (or run `npm install && npm run dist`).
  Output: dist\NEGRUZINO.exe (press F11 for fullscreen).
