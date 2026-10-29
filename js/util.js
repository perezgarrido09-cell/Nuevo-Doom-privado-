/* DOOM — utilidades básicas (original) */
(function (D) {
  'use strict';

  D.TILE = 1;

  D.clamp = function (v, a, b) {
    return v < a ? a : (v > b ? b : v);
  };

  D.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  D.dist2 = function (ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  D.dist = function (ax, ay, bx, by) {
    return Math.sqrt(D.dist2(ax, ay, bx, by));
  };

  /* Diferencia de ángulos normalizada a [-PI, PI] */
  D.angleDiff = function (a, b) {
    var d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };

  /* PRNG determinista (mulberry32) para texturas estables */
  D.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* Número aleatorio uniforme entre a y b */
  D.rand = function (a, b) {
    return a + Math.random() * (b - a);
  };

  D.randInt = function (a, b) {
    return Math.floor(D.rand(a, b + 1));
  };

})(window.DOOM = window.DOOM || {});
