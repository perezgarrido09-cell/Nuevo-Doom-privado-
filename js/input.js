/* DOOM — entrada: teclado, ratón y controles táctiles (original) */
(function (D) {
  'use strict';

  var keys = {};

  D.input = {
    forward: 0,     // -1..1
    strafe: 0,      // -1..1
    turnKey: 0,     // -1..1
    turnMouse: 0,   // delta acumulado de giro (rad)
    fire: false,
    run: false,
    wantUse: false,
    wantSwitch: false,
    isTouch: false
  };

  function recompute() {
    var i = D.input;
    i.forward = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    i.strafe = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    i.turnKey = (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0);
    i.run = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  }

  function onKey(e, down) {
    keys[e.code] = down;
    recompute();
    if (!down) return;

    if (e.code === 'KeyE' || e.code === 'Space') D.input.wantUse = true;
    if (e.code === 'KeyQ' || e.code === 'Digit1' || e.code === 'Digit2') D.input.wantSwitch = true;
    if (e.code === 'KeyM') {
      var muted = D.audio && D.audio.toggleMute ? D.audio.toggleMute() : false;
      if (D.game && D.game.onMuteChanged) D.game.onMuteChanged(muted);
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (D.game && D.game.togglePause) D.game.togglePause();
    }
    if (e.code === 'Enter' && D.game && D.game.onEnter) D.game.onEnter();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
  }

  /* ---------------- táctil ---------------- */

  var stickId = null, stickAnchorX = 0, stickAnchorY = 0;
  var lookId = null, lookLastX = 0;

  function initTouch() {
    var stickZone = document.getElementById('stick-zone');
    var lookZone = document.getElementById('look-zone');
    var knob = document.getElementById('stick-knob');
    var btnFire = document.getElementById('btn-fire');
    var btnUse = document.getElementById('btn-use');
    var btnSwitch = document.getElementById('btn-switch');

    function setKnob(dx, dy) {
      if (knob) knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    }

    if (stickZone) {
      stickZone.addEventListener('touchstart', function (e) {
        e.preventDefault();
        D.input.isTouch = true;
        var t = e.changedTouches[0];
        stickId = t.identifier;
        stickAnchorX = t.clientX;
        stickAnchorY = t.clientY;
        setKnob(0, 0);
      }, { passive: false });

      stickZone.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier !== stickId) continue;
          var dx = t.clientX - stickAnchorX;
          var dy = t.clientY - stickAnchorY;
          var max = 56;
          var len = Math.sqrt(dx * dx + dy * dy);
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          setKnob(dx, dy);
          D.input.strafe = dx / max;
          D.input.forward = -dy / max;
        }
      }, { passive: false });

      var stickEnd = function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === stickId) {
            stickId = null;
            D.input.forward = 0;
            D.input.strafe = 0;
            setKnob(0, 0);
          }
        }
      };
      stickZone.addEventListener('touchend', stickEnd);
      stickZone.addEventListener('touchcancel', stickEnd);
    }

    if (lookZone) {
      lookZone.addEventListener('touchstart', function (e) {
        e.preventDefault();
        D.input.isTouch = true;
        var t = e.changedTouches[0];
        lookId = t.identifier;
        lookLastX = t.clientX;
      }, { passive: false });

      lookZone.addEventListener('touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier !== lookId) continue;
          var dx = t.clientX - lookLastX;
          lookLastX = t.clientX;
          D.input.turnMouse += dx * 0.0052;
        }
      }, { passive: false });

      var lookEnd = function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookId) lookId = null;
        }
      };
      lookZone.addEventListener('touchend', lookEnd);
      lookZone.addEventListener('touchcancel', lookEnd);
    }

    if (btnFire) {
      btnFire.addEventListener('touchstart', function (e) {
        e.preventDefault();
        D.input.fire = true;
      }, { passive: false });
      var fireEnd = function (e) {
        e.preventDefault();
        D.input.fire = false;
      };
      btnFire.addEventListener('touchend', fireEnd);
      btnFire.addEventListener('touchcancel', fireEnd);
    }
    if (btnUse) {
      btnUse.addEventListener('touchstart', function (e) {
        e.preventDefault();
        D.input.wantUse = true;
      }, { passive: false });
    }
    if (btnSwitch) {
      btnSwitch.addEventListener('touchstart', function (e) {
        e.preventDefault();
        D.input.wantSwitch = true;
      }, { passive: false });
    }

    /* evitar menú contextual y scroll accidental */
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) {
      if (e.target && e.target.tagName !== 'INPUT') e.preventDefault();
    }, { passive: false });
  }

  D.input.init = function (canvas) {
    window.addEventListener('keydown', function (e) { onKey(e, true); });
    window.addEventListener('keyup', function (e) { onKey(e, false); });

    /* ratón (computadora) */
    canvas.addEventListener('mousedown', function (e) {
      if (D.input.isTouch) return;
      if (document.pointerLockElement !== canvas && D.game && D.game.isPlaying()) {
        canvas.requestPointerLock && canvas.requestPointerLock();
      }
      D.input.fire = true;
    });
    window.addEventListener('mouseup', function () {
      D.input.fire = false;
    });
    window.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement === canvas) {
        D.input.turnMouse += e.movementX * 0.0023;
      }
    });

    /* detectar dispositivo táctil */
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) {
      D.input.isTouch = true;
      document.body.classList.add('touch');
    }
    window.addEventListener('touchstart', function () {
      D.input.isTouch = true;
      document.body.classList.add('touch');
    }, { once: true, passive: true });

    initTouch();
  };

  D.input.showTouchUI = function (show) {
    var el = document.getElementById('touch-ui');
    if (!el) return;
    if (show && D.input.isTouch) el.classList.remove('hidden');
    else el.classList.add('hidden');
  };

})(window.DOOM = window.DOOM || {});
