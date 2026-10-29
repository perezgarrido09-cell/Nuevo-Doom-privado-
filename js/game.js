/* DOOM — juego principal: bucle, estados, HUD y menús (original) */
(function (D) {
  'use strict';

  var W = 320, H = 180;
  var HUD_H = 26;

  var canvas, ctx2d, imgData, buf;
  var state = 'menu';           // menu | playing | paused | dead | complete | win
  var world = null;
  var lastT = 0;
  var clock = 0;

  var OVERLAYS = ['menu', 'controls', 'pause', 'dead', 'complete', 'win'];

  function $(id) { return document.getElementById(id); }

  function setState(s) {
    state = s;
    for (var i = 0; i < OVERLAYS.length; i++) {
      var el = $(OVERLAYS[i]);
      if (el) el.classList.toggle('hidden', OVERLAYS[i] !== s);
    }
    D.input.showTouchUI(s === 'playing');
    if (s !== 'playing' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) { /* sin pointer lock */ }
    }
  }

  function fmtTime(t) {
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function statsText() {
    return 'BAJAS ' + world.kills + '/' + world.totalEnemies + ' · TIEMPO ' + fmtTime(world.time);
  }

  /* ---------------- flujo de niveles ---------------- */

  function startLevel(idx) {
    world = D.spawnWorld(idx);
    setState('playing');
    D.audio.play && D.audio.play('switchOn');
  }

  function completeLevel() {
    D.audio.play('switchOn');
    $('complete-stats').textContent = statsText();
    if (world.index + 1 >= D.maps.length) {
      $('win-stats').textContent = 'Has sobrevivido a todos los niveles · ' + statsText();
      setState('win');
    } else {
      setState('complete');
    }
  }

  function goToMenu() {
    setState('menu');
  }

  /* ---------------- jugador ---------------- */

  function switchWeapon() {
    var p = world.player;
    if (p.weapons.shotgun && p.weapon === 'pistol') {
      p.weapon = 'shotgun';
    } else {
      p.weapon = 'pistol';
    }
    D.audio.play('switchWeapon');
  }

  function useAction() {
    var p = world.player;
    var gx = Math.floor(p.x + Math.cos(p.angle) * 0.95);
    var gy = Math.floor(p.y + Math.sin(p.angle) * 0.95);
    var tile = D.tileAt(world, gx + 0.5, gy + 0.5);
    if (tile === 'D') {
      D.openDoorAt(world, gx, gy);
    } else if (tile === 'E') {
      completeLevel();
    }
  }

  function fireWeapon() {
    var p = world.player;
    if (p.cooldown > 0 || p.dead) return;
    var w = D.WEAPONS[p.weapon];
    if (p.ammo[w.ammo] <= 0) {
      D.audio.play('empty');
      p.cooldown = 0.25;
      return;
    }
    p.ammo[w.ammo]--;
    p.cooldown = w.cooldown;
    p.flash = w.flash;
    p.recoil = 1;
    D.audio.play(w.sound);
    D.alertEnemies(world, p.x, p.y, 11);

    for (var i = 0; i < w.pellets; i++) {
      var ang = p.angle + (Math.random() - 0.5) * w.spread * 2;
      D.tryHitScan(world, ang, w.dmg * D.rand(0.85, 1.15));
    }
  }

  function updatePlayer(dt) {
    var p = world.player;
    var i = D.input;
    if (p.dead) return;

    /* giro */
    p.angle += i.turnKey * 2.7 * dt;
    p.angle += i.turnMouse;
    i.turnMouse = 0;

    /* movimiento */
    var speed = 3.1 * (i.run ? 1.45 : 1);
    var fwd = i.forward * speed * dt;
    var str = i.strafe * speed * dt;
    var dx = Math.cos(p.angle) * fwd - Math.sin(p.angle) * str;
    var dy = Math.sin(p.angle) * fwd + Math.cos(p.angle) * str;
    if (dx !== 0 || dy !== 0) {
      var r = 0.24;
      if (D.canMoveTo(world, p.x + dx, p.y, r)) p.x += dx;
      if (D.canMoveTo(world, p.x, p.y + dy, r)) p.y += dy;
      p.bob += dt * (i.run ? 13 : 9) * (Math.abs(i.forward) + Math.abs(i.strafe));
    }

    /* temporizadores */
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.recoil = Math.max(0, p.recoil - dt * 4.5);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt * 1.3);
    p.pickupFlash = Math.max(0, p.pickupFlash - dt * 1.7);

    if (i.wantSwitch) { i.wantSwitch = false; switchWeapon(); }
    if (i.wantUse) { i.wantUse = false; useAction(); }
    if (i.fire) fireWeapon();
  }

  /* ---------------- render ---------------- */

  function drawWeapon() {
    var p = world.player;
    var art = D.weapons[p.weapon];
    var img = (p.flash > 0 && art.flash) ? art.flash : art.img;
    var wh = H * 0.55;
    var ww = wh * (img.width / img.height);
    var bobX = Math.sin(p.bob) * 5;
    var bobY = Math.abs(Math.cos(p.bob)) * 3;
    var recoilY = p.recoil * 14;
    var x = W / 2 - ww / 2 + bobX;
    var y = H - HUD_H - wh * 0.88 + bobY + recoilY;
    ctx2d.drawImage(img, x, y, ww, wh);

    if (p.flash > 0) {
      var g = ctx2d.createRadialGradient(W / 2, H * 0.55, 4, W / 2, H * 0.55, W * 0.55);
      g.addColorStop(0, 'rgba(255,230,150,0.30)');
      g.addColorStop(1, 'rgba(255,180,80,0)');
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, W, H - HUD_H);
    }
  }

  function drawFace(x, y) {
    var p = world.player;
    var hp = p.hp;
    /* fondo según salud */
    ctx2d.fillStyle = hp > 60 ? '#c8956a' : hp > 30 ? '#b06a48' : '#8d4432';
    ctx2d.fillRect(x, y, 18, 18);
    /* ojos */
    ctx2d.fillStyle = '#fff';
    ctx2d.fillRect(x + 4, y + 6, 3, 3);
    ctx2d.fillRect(x + 11, y + 6, 3, 3);
    ctx2d.fillStyle = '#221108';
    ctx2d.fillRect(x + 5, y + 7, 2, 2);
    ctx2d.fillRect(x + 12, y + 7, 2, 2);
    /* boca según estado */
    ctx2d.fillStyle = '#3a1208';
    if (hp <= 0) {
      ctx2d.fillRect(x + 4, y + 13, 10, 2);
    } else if (hp < 40) {
      ctx2d.fillRect(x + 5, y + 12, 8, 4);
    } else {
      ctx2d.fillRect(x + 6, y + 13, 6, 2);
    }
  }

  function drawHUD() {
    var p = world.player;
    var w = D.WEAPONS[p.weapon];

    /* barra inferior */
    ctx2d.fillStyle = 'rgba(10,7,7,0.92)';
    ctx2d.fillRect(0, H - HUD_H, W, HUD_H);
    ctx2d.fillStyle = '#6b2a18';
    ctx2d.fillRect(0, H - HUD_H, W, 2);

    drawFace(8, H - HUD_H + 4);

    ctx2d.textBaseline = 'top';
    ctx2d.fillStyle = '#c99';
    ctx2d.font = 'bold 7px monospace';
    ctx2d.fillText('SALUD', 32, H - HUD_H + 4);
    ctx2d.fillText('ARMADURA', 92, H - HUD_H + 4);
    ctx2d.fillText('MUNICIÓN', 162, H - HUD_H + 4);
    ctx2d.fillText('ARMA', 232, H - HUD_H + 4);

    ctx2d.font = 'bold 11px monospace';
    ctx2d.fillStyle = p.hp > 30 ? '#ffd9b0' : '#ff5540';
    ctx2d.fillText(String(Math.ceil(p.hp)), 32, H - HUD_H + 12);
    ctx2d.fillStyle = '#9fd8a8';
    ctx2d.fillText(String(Math.ceil(p.armor)), 92, H - HUD_H + 12);
    ctx2d.fillStyle = '#ffd9b0';
    ctx2d.fillText(String(p.ammo[w.ammo]), 162, H - HUD_H + 12);
    ctx2d.font = 'bold 8px monospace';
    ctx2d.fillStyle = '#e8b98a';
    ctx2d.fillText(w.name, 232, H - HUD_H + 13);

    /* rótulo superior */
    ctx2d.font = 'bold 8px monospace';
    ctx2d.fillStyle = 'rgba(255,80,50,0.85)';
    ctx2d.fillText('DOOM', 6, 5);
    ctx2d.fillStyle = 'rgba(230,190,150,0.85)';
    ctx2d.fillText(world.name, 40, 5);
    ctx2d.textAlign = 'right';
    ctx2d.fillStyle = 'rgba(230,190,150,0.85)';
    ctx2d.fillText('BAJAS ' + world.kills + '/' + world.totalEnemies, W - 6, 5);
    ctx2d.textAlign = 'left';

    /* mira */
    ctx2d.fillStyle = 'rgba(255,220,180,0.8)';
    ctx2d.fillRect(W / 2 - 1, (H - HUD_H) / 2 - 4, 2, 3);
    ctx2d.fillRect(W / 2 - 1, (H - HUD_H) / 2 + 2, 2, 3);
    ctx2d.fillRect(W / 2 - 4, (H - HUD_H) / 2 - 1, 3, 2);
    ctx2d.fillRect(W / 2 + 2, (H - HUD_H) / 2 - 1, 3, 2);
  }

  function drawFlashes() {
    var p = world.player;
    if (p.hurtFlash > 0) {
      ctx2d.fillStyle = 'rgba(200,10,0,' + (p.hurtFlash * 0.55).toFixed(3) + ')';
      ctx2d.fillRect(0, 0, W, H);
    }
    if (p.pickupFlash > 0) {
      ctx2d.fillStyle = 'rgba(255,220,110,' + (p.pickupFlash * 0.35).toFixed(3) + ')';
      ctx2d.fillRect(0, 0, W, H);
    }
  }

  function render() {
    if (!world) {
      /* fondo de menú */
      ctx2d.fillStyle = '#120404';
      ctx2d.fillRect(0, 0, W, H);
      ctx2d.fillStyle = 'rgba(120,10,4,0.35)';
      for (var i = 0; i < 8; i++) {
        var yy = ((clock * 12 + i * 26) % (H + 40)) - 20;
        ctx2d.fillRect(0, yy, W, 12);
      }
      return;
    }

    var p = world.player;
    var horizon = Math.round((H - HUD_H) / 2 + Math.sin(p.bob) * 2.2);

    var view = {
      x: p.x, y: p.y,
      dirX: Math.cos(p.angle), dirY: Math.sin(p.angle),
      planeX: -Math.sin(p.angle) * 0.66, planeY: Math.cos(p.angle) * 0.66,
      horizon: horizon
    };

    var sprites = D.collectSprites(world);
    D.renderWorld(buf, W, H, view, world, sprites);
    ctx2d.putImageData(imgData, 0, 0);

    drawWeapon();
    drawHUD();
    drawFlashes();
  }

  /* ---------------- bucle principal ---------------- */

  function frame(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    clock += dt;

    if (state === 'playing' && world) {
      updatePlayer(dt);
      D.updateWorld(world, dt);
      if (world.player.dead && state === 'playing') {
        $('dead-stats').textContent = statsText();
        setState('dead');
      }
    }

    render();
    window.requestAnimationFrame(frame);
  }

  function resize() {
    var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = Math.floor(W * scale) + 'px';
    canvas.style.height = Math.floor(H * scale) + 'px';
  }

  /* ---------------- interfaz ---------------- */

  function bindUI() {
    $('btn-play').addEventListener('click', function () {
      D.audio.unlock();
      D.audio.startMusic && D.audio.startMusic();
      startLevel(0);
    });
    $('btn-controls').addEventListener('click', function () {
      setState('controls');
    });
    $('btn-controls-back').addEventListener('click', function () {
      setState('menu');
    });
    $('btn-sound').addEventListener('click', function () {
      D.audio.unlock();
      var muted = D.audio.toggleMute();
      $('btn-sound').textContent = muted ? '🔇 SONIDO: OFF' : '🔊 SONIDO: ON';
    });
    $('btn-resume').addEventListener('click', function () {
      setState('playing');
    });
    $('btn-pause-menu').addEventListener('click', goToMenu);
    $('btn-retry').addEventListener('click', function () {
      startLevel(world.index);
    });
    $('btn-dead-menu').addEventListener('click', goToMenu);
    $('btn-next').addEventListener('click', function () {
      startLevel(world.index + 1);
    });
    $('btn-complete-menu').addEventListener('click', goToMenu);
    $('btn-win-menu').addEventListener('click', goToMenu);
  }

  D.game = {
    init: function () {
      canvas = $('screen');
      ctx2d = canvas.getContext('2d');
      imgData = ctx2d.createImageData(W, H);
      buf = imgData.data;

      D.buildAssets();
      D.input.init(canvas);
      bindUI();
      resize();

      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', resize);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden && state === 'playing') setState('paused');
      });

      /* desbloquear audio en el primer gesto */
      var unlock = function () {
        D.audio.unlock();
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });

      setState('menu');
      window.requestAnimationFrame(frame);
    },

    isPlaying: function () { return state === 'playing'; },

    togglePause: function () {
      if (state === 'playing') setState('paused');
      else if (state === 'paused') setState('playing');
    },

    onEnter: function () {
      if (state === 'menu') {
        $('btn-play').click();
      } else if (state === 'dead') {
        $('btn-retry').click();
      } else if (state === 'complete') {
        $('btn-next').click();
      } else if (state === 'paused') {
        setState('playing');
      }
    },

    onMuteChanged: function (muted) {
      var el = $('btn-sound');
      if (el) el.textContent = muted ? '🔇 SONIDO: OFF' : '🔊 SONIDO: ON';
    }
  };

})(window.DOOM = window.DOOM || {});
