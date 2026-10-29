/* DOOM — arranque e instalación como PWA (original) */
(function (D) {
  'use strict';

  window.addEventListener('DOMContentLoaded', function () {
    D.game.init();

    /* Registrar el service worker para funcionar sin conexión */
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* sin service worker el juego sigue funcionando en línea */
      });
    }
  });

})(window.DOOM = window.DOOM || {});
