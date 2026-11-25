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

4. LAN КООПЕРАТИВ (ДО 4 ИГРОКОВ ПО WI-FI / ETHERNET):
   Запустите сервер на одном ПК (`npm run dev` или `npm start`), откройте
   в меню «LAN Кооп» и передайте друзьям показанный адрес `http://<IP>:3000`
   и код комнаты — они могут зайти с любого ПК или смартфона в вашей сети.

================================================================
ENGLISH INSTRUCTIONS:
- Offline play immediately: open app.html in any modern browser.
- Build standalone Windows NEGRUZINO.exe: install Node.js LTS, then
  double-click build-exe.bat (or run `npm install && npm run dist`).
  Output: dist\NEGRUZINO.exe (press F11 for fullscreen).
- LAN Co-op (up to 4 players): start the server (`npm run dev` or
  `npm start`), open "LAN Co-op", and share the displayed `http://<IP>:3000`
  URL + room code with teammates on your Wi-Fi / LAN.
