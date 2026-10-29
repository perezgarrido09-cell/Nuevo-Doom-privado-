/* DOOM — texturas y sprites procedurales (100% originales, dibujados por código) */
(function (D) {
  'use strict';

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toImgData(canvas) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { w: canvas.width, h: canvas.height, data: img.data };
  }

  /* Crea una textura 64x64 a partir de una función de dibujo */
  function tex64(drawFn, seed) {
    var c = makeCanvas(64, 64);
    var ctx = c.getContext('2d');
    drawFn(ctx, D.rng(seed || 1));
    return toImgData(c);
  }

  function speckle(ctx, rnd, color, count, alpha) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    for (var i = 0; i < count; i++) {
      ctx.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 1 + ((rnd() * 2) | 0), 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- Texturas de muros ---------------- */

  function drawBrick(ctx, rnd) {
    ctx.fillStyle = '#5e2a19';
    ctx.fillRect(0, 0, 64, 64);
    var colors = ['#7a3620', '#6b2f1e', '#83402a', '#5e2a19'];
    for (var row = 0; row < 8; row++) {
      var off = (row % 2) * 8;
      for (var col = -1; col < 5; col++) {
        ctx.fillStyle = colors[(rnd() * colors.length) | 0];
        ctx.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
      }
    }
    ctx.fillStyle = '#24100a';
    for (var y = 0; y < 64; y += 8) ctx.fillRect(0, y, 64, 1);
    speckle(ctx, rnd, '#9a5238', 90, 0.35);
    speckle(ctx, rnd, '#1c0b06', 70, 0.4);
  }

  function drawStone(ctx, rnd) {
    ctx.fillStyle = '#4c4c54';
    ctx.fillRect(0, 0, 64, 64);
    for (var i = 0; i < 26; i++) {
      ctx.fillStyle = rnd() > 0.5 ? '#5a5a63' : '#404048';
      ctx.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 4 + ((rnd() * 12) | 0), 3 + ((rnd() * 10) | 0));
    }
    ctx.strokeStyle = '#2c2c32';
    ctx.lineWidth = 1;
    for (var c = 0; c < 5; c++) {
      ctx.beginPath();
      var x = (rnd() * 64) | 0, y = (rnd() * 64) | 0;
      ctx.moveTo(x, y);
      for (var s = 0; s < 5; s++) {
        x += (rnd() * 16 - 8) | 0;
        y += (rnd() * 14 - 4) | 0;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    speckle(ctx, rnd, '#767680', 110, 0.35);
    speckle(ctx, rnd, '#222228', 90, 0.45);
  }

  function drawTech(ctx, rnd) {
    ctx.fillStyle = '#2c3138';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#383f47';
    ctx.fillRect(2, 2, 60, 28);
    ctx.fillRect(2, 34, 60, 28);
    ctx.fillStyle = '#1c2025';
    ctx.fillRect(0, 31, 64, 3);
    ctx.fillRect(0, 0, 64, 1);
    ctx.fillRect(0, 63, 64, 1);
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#39c46a' : '#d43b2a';
      ctx.fillRect(8 + i * 14, 8, 4, 4);
      ctx.fillRect(8 + i * 14, 42, 4, 4);
    }
    ctx.fillStyle = '#12161a';
    for (var y = 12; y < 28; y += 6) ctx.fillRect(30, y, 28, 2);
    for (var y2 = 46; y2 < 62; y2 += 6) ctx.fillRect(6, y2, 24, 2);
    speckle(ctx, rnd, '#5b6672', 60, 0.3);
  }

  function drawMetal(ctx, rnd) {
    ctx.fillStyle = '#454a52';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#525862';
    ctx.fillRect(0, 4, 64, 10);
    ctx.fillRect(0, 26, 64, 12);
    ctx.fillRect(0, 50, 64, 10);
    ctx.fillStyle = '#2a2e34';
    ctx.fillRect(0, 0, 64, 3);
    ctx.fillRect(0, 23, 64, 2);
    ctx.fillRect(0, 47, 64, 2);
    ctx.fillRect(0, 61, 64, 3);
    ctx.fillStyle = '#6a707a';
    for (var x = 4; x < 64; x += 12) {
      ctx.fillRect(x, 7, 3, 3);
      ctx.fillRect(x, 29, 3, 3);
      ctx.fillRect(x, 53, 3, 3);
    }
    speckle(ctx, rnd, '#767d88', 70, 0.28);
    speckle(ctx, rnd, '#1c1f24', 70, 0.4);
  }

  function drawDoor(ctx, rnd) {
    ctx.fillStyle = '#565c66';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#69707c';
    ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(30, 4, 4, 56); /* costura central */
    ctx.fillStyle = '#474d57';
    ctx.fillRect(8, 12, 18, 8);
    ctx.fillRect(38, 12, 18, 8);
    ctx.fillRect(8, 44, 18, 8);
    ctx.fillRect(38, 44, 18, 8);
    /* franja de precaución */
    for (var i = -8; i < 72; i += 10) {
      ctx.fillStyle = '#c8a028';
      ctx.beginPath();
      ctx.moveTo(i, 60); ctx.lineTo(i + 5, 60); ctx.lineTo(i + 12, 26); ctx.lineTo(i + 7, 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20232a';
      ctx.beginPath();
      ctx.moveTo(i + 5, 60); ctx.lineTo(i + 10, 60); ctx.lineTo(i + 17, 26); ctx.lineTo(i + 12, 26);
      ctx.closePath(); ctx.fill();
    }
    speckle(ctx, rnd, '#8b929e', 50, 0.25);
  }

  function drawExit(ctx, rnd) {
    ctx.fillStyle = '#26292f';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3d434c';
    ctx.fillRect(6, 6, 52, 52);
    ctx.fillStyle = '#1a1d22';
    ctx.fillRect(14, 14, 36, 36);
    /* palanca de salida */
    ctx.fillStyle = '#1f7a3c';
    ctx.fillRect(22, 22, 20, 20);
    ctx.fillStyle = '#2fc462';
    ctx.fillRect(26, 26, 12, 12);
    ctx.fillStyle = '#0d3b1c';
    ctx.fillRect(28, 42, 8, 12);
    ctx.fillStyle = '#8b929e';
    ctx.fillRect(10, 10, 4, 4); ctx.fillRect(50, 10, 4, 4);
    ctx.fillRect(10, 50, 4, 4); ctx.fillRect(50, 50, 4, 4);
    speckle(ctx, rnd, '#5b6672', 40, 0.3);
  }

  function drawRock(ctx, rnd) {
    ctx.fillStyle = '#33261c';
    ctx.fillRect(0, 0, 64, 64);
    for (var i = 0; i < 30; i++) {
      ctx.fillStyle = rnd() > 0.5 ? '#413122' : '#281d14';
      ctx.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 3 + ((rnd() * 10) | 0), 2 + ((rnd() * 8) | 0));
    }
    speckle(ctx, rnd, '#5c4630', 110, 0.4);
    speckle(ctx, rnd, '#171009', 110, 0.5);
  }

  function drawFloor(ctx, rnd) {
    ctx.fillStyle = '#2c2c31';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#343439';
    ctx.fillRect(1, 1, 30, 30);
    ctx.fillRect(33, 1, 30, 30);
    ctx.fillRect(1, 33, 30, 30);
    ctx.fillRect(33, 33, 30, 30);
    ctx.fillStyle = '#1e1e22';
    ctx.fillRect(0, 31, 64, 2);
    ctx.fillRect(31, 0, 2, 64);
    speckle(ctx, rnd, '#45454c', 120, 0.35);
    speckle(ctx, rnd, '#141417', 100, 0.4);
  }

  function drawCeil(ctx, rnd) {
    ctx.fillStyle = '#1c1a1e';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#242228';
    ctx.fillRect(2, 2, 60, 28);
    ctx.fillRect(2, 34, 60, 28);
    ctx.fillStyle = '#121015';
    ctx.fillRect(0, 31, 64, 2);
    speckle(ctx, rnd, '#2e2b33', 90, 0.4);
    speckle(ctx, rnd, '#0c0a0e', 80, 0.5);
  }

  /* ---------------- Sprites (lienzo 64x64 con transparencia) ---------------- */

  /* Demonio procedural. frame: walk0 | walk1 | attack | pain */
  function drawDemon(ctx, frame, pal) {
    var skin = pal.skin, dark = pal.dark, bone = pal.bone, eye = pal.eye;
    var bob = (frame === 'walk1') ? 1 : 0;
    var legShift = (frame === 'walk1') ? 3 : 0;

    /* piernas */
    ctx.fillStyle = dark;
    ctx.fillRect(22 - legShift, 40, 8, 17 + bob);
    ctx.fillRect(34 + legShift, 40, 8, 17 - bob);
    /* pies */
    ctx.fillStyle = skin;
    ctx.fillRect(19 - legShift, 55 + bob, 13, 7);
    ctx.fillRect(33 + legShift, 55 - bob, 13, 7);

    /* cuerpo */
    ctx.fillStyle = skin;
    ctx.fillRect(20, 26, 24, 18);
    ctx.fillStyle = dark;
    ctx.fillRect(24, 33, 16, 9);

    /* brazos */
    ctx.fillStyle = skin;
    if (frame === 'attack') {
      ctx.fillRect(14, 22, 9, 15);
      ctx.fillRect(41, 22, 9, 15);
      ctx.fillStyle = bone;
      ctx.fillRect(14, 17, 9, 6);
      ctx.fillRect(41, 17, 9, 6);
    } else {
      ctx.fillRect(12, 27 + bob, 8, 15);
      ctx.fillRect(44, 27 + bob, 8, 15);
      ctx.fillStyle = bone;
      ctx.fillRect(12, 41 + bob, 8, 5);
      ctx.fillRect(44, 41 + bob, 8, 5);
    }

    /* cabeza */
    ctx.fillStyle = skin;
    ctx.fillRect(22, 10, 20, 16);
    ctx.fillStyle = dark;
    ctx.fillRect(22, 13, 20, 3);

    /* cuernos */
    ctx.fillStyle = bone;
    ctx.fillRect(15, 8, 6, 5); ctx.fillRect(17, 4, 5, 5); ctx.fillRect(19, 1, 4, 4);
    ctx.fillRect(43, 8, 6, 5); ctx.fillRect(42, 4, 5, 5); ctx.fillRect(41, 1, 4, 4);

    /* ojos */
    ctx.fillStyle = eye;
    ctx.fillRect(26, 17, 5, 4);
    ctx.fillRect(34, 17, 5, 4);

    /* boca */
    if (frame === 'attack' || frame === 'pain') {
      ctx.fillStyle = eye;
      ctx.fillRect(27, 21, 11, 5);
      ctx.fillStyle = '#1a0505';
      ctx.fillRect(29, 22, 7, 3);
    } else {
      ctx.fillStyle = '#1a0505';
      ctx.fillRect(27, 21, 11, 4);
      ctx.fillStyle = bone;
      ctx.fillRect(28, 21, 2, 2);
      ctx.fillRect(32, 21, 2, 2);
      ctx.fillRect(36, 21, 2, 2);
    }

    /* herido: destello claro */
    if (frame === 'pain') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(12, 1, 40, 61);
    }
  }

  function drawDemonDead(ctx, stage, pal) {
    /* charco de sangre */
    ctx.fillStyle = '#6d0f08';
    ctx.beginPath();
    ctx.ellipse(32, 58, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    if (stage === 0) {
      /* cayendo */
      ctx.translate(32, 60);
      ctx.scale(1, 0.55);
      ctx.translate(-32, -60);
      drawDemon(ctx, 'pain', pal);
    } else {
      /* cadáver tendido */
      ctx.translate(32, 62);
      ctx.scale(1, 0.3);
      ctx.translate(-32, -62);
      drawDemon(ctx, 'walk0', pal);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(80,8,6,0.75)';
    ctx.fillRect(8, 55, 48, 8);
  }

  function makeDemon(pal) {
    return {
      walk: [
        tex64(function (c) { drawDemon(c, 'walk0', pal); }, 11),
        tex64(function (c) { drawDemon(c, 'walk1', pal); }, 12)
      ],
      attack: tex64(function (c) { drawDemon(c, 'attack', pal); }, 13),
      pain: tex64(function (c) { drawDemon(c, 'pain', pal); }, 14),
      dead: [
        tex64(function (c) { drawDemonDead(c, 0, pal); }, 15),
        tex64(function (c) { drawDemonDead(c, 1, pal); }, 16)
      ]
    };
  }

  function drawFireball(ctx) {
    var g = ctx.createRadialGradient(32, 32, 2, 32, 32, 18);
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(0.35, '#ff9d21');
    g.addColorStop(0.75, '#d23a0c');
    g.addColorStop(1, 'rgba(120,20,4,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }

  function drawExplosion(ctx, frame) {
    var r = frame === 0 ? 16 : 24;
    var g = ctx.createRadialGradient(32, 32, 2, 32, 32, r);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(0.4, '#ff8a1e');
    g.addColorStop(0.8, frame === 0 ? '#a33208' : '#5c2408');
    g.addColorStop(1, 'rgba(40,12,4,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }

  function drawBarrel(ctx) {
    ctx.fillStyle = '#24272c';
    ctx.fillRect(18, 24, 28, 34);
    ctx.fillStyle = '#7c1d10';
    ctx.fillRect(20, 26, 24, 30);
    ctx.fillStyle = '#a02a16';
    ctx.fillRect(20, 32, 24, 5);
    ctx.fillRect(20, 44, 24, 5);
    ctx.fillStyle = '#17191d';
    ctx.fillRect(20, 24, 24, 3);
    ctx.fillRect(20, 55, 24, 3);
    ctx.fillStyle = '#d8b02c';
    ctx.beginPath();
    ctx.moveTo(32, 38); ctx.lineTo(38, 43); ctx.lineTo(26, 43);
    ctx.closePath(); ctx.fill();
  }

  function drawPickup(ctx, kind) {
    if (kind === 'health') {
      ctx.fillStyle = '#cfd4da';
      ctx.fillRect(16, 32, 32, 24);
      ctx.fillStyle = '#8d939c';
      ctx.fillRect(16, 54, 32, 3);
      ctx.fillStyle = '#c22b18';
      ctx.fillRect(29, 36, 6, 16);
      ctx.fillRect(24, 41, 16, 6);
    } else if (kind === 'ammo') {
      ctx.fillStyle = '#6b4a22';
      ctx.fillRect(16, 34, 32, 22);
      ctx.fillStyle = '#8a6231';
      ctx.fillRect(16, 34, 32, 5);
      ctx.fillStyle = '#e3c24c';
      for (var i = 0; i < 4; i++) ctx.fillRect(20 + i * 7, 38, 4, 10);
    } else if (kind === 'shells') {
      ctx.fillStyle = '#6e1610';
      ctx.fillRect(16, 34, 32, 22);
      ctx.fillStyle = '#8f1e14';
      ctx.fillRect(16, 34, 32, 5);
      ctx.fillStyle = '#e0b13a';
      for (var j = 0; j < 4; j++) ctx.fillRect(20 + j * 7, 39, 4, 9);
    } else if (kind === 'armor') {
      ctx.fillStyle = '#1f7a3c';
      ctx.fillRect(20, 30, 24, 26);
      ctx.fillStyle = '#2fc462';
      ctx.fillRect(24, 34, 16, 10);
      ctx.fillStyle = '#0d3b1c';
      ctx.fillRect(20, 52, 24, 4);
      ctx.fillRect(14, 32, 6, 14);
      ctx.fillRect(44, 32, 6, 14);
    } else if (kind === 'shotgun') {
      ctx.fillStyle = '#3c4048';
      ctx.fillRect(10, 40, 40, 7);
      ctx.fillStyle = '#5a5f68';
      ctx.fillRect(10, 40, 40, 3);
      ctx.fillStyle = '#6b4a22';
      ctx.fillRect(42, 38, 12, 12);
      ctx.fillStyle = '#22262c';
      ctx.fillRect(12, 47, 22, 5);
    }
  }

  /* ---------------- Armas (lienzo 128x96) ---------------- */

  function drawPistol(ctx) {
    ctx.fillStyle = '#22262c';
    ctx.fillRect(52, 56, 26, 40);           /* empuñadura */
    ctx.fillRect(46, 30, 38, 28);           /* corredera */
    ctx.fillStyle = '#4a4f58';
    ctx.fillRect(48, 32, 34, 10);
    ctx.fillRect(58, 20, 14, 12);           /* cañón */
    ctx.fillStyle = '#111417';
    ctx.fillRect(62, 16, 6, 8);
    ctx.fillStyle = '#33383f';
    ctx.fillRect(54, 58, 16, 30);
  }

  function drawShotgun(ctx) {
    ctx.fillStyle = '#3c4048';
    ctx.fillRect(22, 30, 78, 14);           /* cañón */
    ctx.fillStyle = '#565c66';
    ctx.fillRect(22, 30, 78, 5);
    ctx.fillStyle = '#22262c';
    ctx.fillRect(40, 44, 40, 10);           /* guardamanos */
    ctx.fillStyle = '#6b4a22';
    ctx.fillRect(88, 34, 30, 26);           /* culata */
    ctx.fillStyle = '#7d5a2c';
    ctx.fillRect(88, 34, 30, 8);
    ctx.fillStyle = '#111417';
    ctx.fillRect(18, 32, 8, 10);
  }

  function drawFlash(ctx, cx, cy) {
    var g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 26);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.35, '#ffd23f');
    g.addColorStop(0.8, 'rgba(255,120,20,0.55)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 30, cy - 30, 60, 60);
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(cx - 3, cy - 18, 6, 36);
    ctx.fillRect(cx - 18, cy - 3, 36, 6);
  }

  /* ---------------- Construcción final ---------------- */

  D.buildAssets = function () {
    D.tex = {
      brick: tex64(drawBrick, 101),
      stone: tex64(drawStone, 102),
      tech: tex64(drawTech, 103),
      metal: tex64(drawMetal, 104),
      door: tex64(drawDoor, 105),
      exit: tex64(drawExit, 106),
      rock: tex64(drawRock, 107),
      floor: tex64(drawFloor, 108),
      ceil: tex64(drawCeil, 109)
    };

    D.art = {
      enemies: {
        imp: makeDemon({ skin: '#8a4a2a', dark: '#5e2c16', bone: '#d8c8a0', eye: '#ff4422' }),
        fast: makeDemon({ skin: '#3f7a2e', dark: '#27501c', bone: '#d3dfb8', eye: '#ffe23f' }),
        tough: makeDemon({ skin: '#5a5f6b', dark: '#343841', bone: '#c9cede', eye: '#ff2222' })
      },
      fireball: tex64(drawFireball, 201),
      explosion: [tex64(function (c) { drawExplosion(c, 0); }, 202), tex64(function (c) { drawExplosion(c, 1); }, 203)],
      barrel: tex64(drawBarrel, 204),
      pickups: {
        health: tex64(function (c) { drawPickup(c, 'health'); }, 301),
        ammo: tex64(function (c) { drawPickup(c, 'ammo'); }, 302),
        shells: tex64(function (c) { drawPickup(c, 'shells'); }, 303),
        armor: tex64(function (c) { drawPickup(c, 'armor'); }, 304),
        shotgun: tex64(function (c) { drawPickup(c, 'shotgun'); }, 305)
      }
    };

    /* armas */
    var pistol = makeCanvas(128, 96);
    drawPistol(pistol.getContext('2d'));
    var pistolFlash = makeCanvas(128, 96);
    drawPistol(pistolFlash.getContext('2d'));
    drawFlash(pistolFlash.getContext('2d'), 65, 14);

    var shotgun = makeCanvas(128, 96);
    drawShotgun(shotgun.getContext('2d'));
    var shotgunFlash = makeCanvas(128, 96);
    drawShotgun(shotgunFlash.getContext('2d'));
    drawFlash(shotgunFlash.getContext('2d'), 20, 28);

    D.weapons = {
      pistol: { img: pistol, flash: pistolFlash },
      shotgun: { img: shotgun, flash: shotgunFlash }
    };
  };

})(window.DOOM = window.DOOM || {});
