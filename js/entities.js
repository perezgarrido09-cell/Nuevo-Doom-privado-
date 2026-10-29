/* DOOM — mundo y entidades: enemigos, proyectiles, pickups, barriles (original) */
(function (D) {
  'use strict';

  var SOLID_WALLS = { '#': 1, '%': 1, '&': 1, 'X': 1, 'G': 1, 'E': 1 };

  var ENEMY_TYPES = {
    imp: {
      art: 'imp', hp: 45, speed: 1.55, radius: 0.38, scale: 0.92,
      ranged: true, fireDmg: [10, 16], meleeDmg: [6, 10],
      attackCd: 2.1, sight: 12, painChance: 0.7
    },
    fast: {
      art: 'fast', hp: 30, speed: 2.65, radius: 0.34, scale: 0.8,
      ranged: false, fireDmg: [0, 0], meleeDmg: [7, 12],
      attackCd: 0.9, sight: 13, painChance: 0.5
    },
    tough: {
      art: 'tough', hp: 110, speed: 1.35, radius: 0.45, scale: 1.05,
      ranged: true, fireDmg: [14, 22], meleeDmg: [12, 20],
      attackCd: 2.6, sight: 14, painChance: 0.25
    }
  };

  D.WEAPONS = {
    pistol: {
      name: 'PISTOLA', dmg: 18, pellets: 1, spread: 0.02, cooldown: 0.34,
      ammo: 'bullets', sound: 'shootPistol', flash: 0.09
    },
    shotgun: {
      name: 'ESCOPETA', dmg: 11, pellets: 7, spread: 0.15, cooldown: 0.85,
      ammo: 'shells', sound: 'shootShotgun', flash: 0.13
    }
  };

  function snd(name) {
    if (D.audio && D.audio.play) D.audio.play(name);
  }

  /* ---------------- construcción del mundo ---------------- */

  D.spawnWorld = function (mapIndex) {
    var def = D.maps[mapIndex];
    var grid = [];
    var x, y, row, ch;

    for (y = 0; y < def.grid.length; y++) {
      row = def.grid[y].split('');
      grid.push(row);
    }

    var world = {
      index: mapIndex,
      name: def.name,
      grid: grid,
      w: grid[0].length,
      h: grid.length,
      doors: {},
      enemies: [],
      pickups: [],
      barrels: [],
      projectiles: [],
      effects: [],
      exit: null,
      kills: 0,
      totalEnemies: 0,
      time: 0,
      player: {
        x: 1.5, y: 1.5, angle: def.playerAngle || 0,
        hp: 100, armor: 0,
        ammo: { bullets: 50, shells: 0 },
        weapons: { pistol: true, shotgun: false },
        weapon: 'pistol',
        cooldown: 0, flash: 0, recoil: 0, bob: 0,
        hurtFlash: 0, pickupFlash: 0,
        dead: false
      }
    };

    for (y = 0; y < grid.length; y++) {
      for (x = 0; x < grid[y].length; x++) {
        ch = grid[y][x];
        if (ch === 'P') {
          world.player.x = x + 0.5;
          world.player.y = y + 0.5;
          grid[y][x] = '.';
        } else if (ch === 'D') {
          world.doors[x + ',' + y] = { x: x, y: y, open: 0, target: 0, timer: 0 };
        } else if (ch === 'E') {
          world.exit = { x: x, y: y };
        } else if (ch === 'i' || ch === 'm' || ch === 't') {
          var typeKey = ch === 'i' ? 'imp' : (ch === 'm' ? 'fast' : 'tough');
          world.enemies.push(makeEnemy(typeKey, x + 0.5, y + 0.5));
          grid[y][x] = '.';
        } else if (ch === 'h' || ch === 'a' || ch === 's' || ch === 'v' || ch === 'w') {
          var kind = ch === 'h' ? 'health' : ch === 'a' ? 'ammo' : ch === 's' ? 'shells'
            : ch === 'v' ? 'armor' : 'shotgun';
          world.pickups.push({ kind: kind, x: x + 0.5, y: y + 0.5, taken: false });
          grid[y][x] = '.';
        } else if (ch === 'b') {
          world.barrels.push({ x: x + 0.5, y: y + 0.5, hp: 25, dead: false });
          grid[y][x] = '.';
        }
      }
    }

    world.totalEnemies = world.enemies.length;

    world.doorOpen = function (gx, gy) {
      var d = world.doors[gx + ',' + gy];
      return d ? d.open : 1;
    };
    world.raySolid = function (gx, gy, tile) {
      if (SOLID_WALLS[tile]) return true;
      if (tile === 'D') {
        var d = world.doors[gx + ',' + gy];
        return !d || d.open < 0.99;
      }
      return false;
    };

    return world;
  };

  function makeEnemy(typeKey, x, y) {
    var t = ENEMY_TYPES[typeKey];
    return {
      type: t,
      x: x, y: y,
      hp: t.hp,
      state: 'idle',          // idle | chase | attack | pain | dead
      stateTime: 0,
      attackCd: D.rand(0.4, 1.4),
      pendingAttack: null,
      animTime: Math.random() * 10,
      deadTime: 0,
      wander: 0
    };
  }

  /* ---------------- consultas de colisión ---------------- */

  D.tileAt = function (world, x, y) {
    var gx = Math.floor(x), gy = Math.floor(y);
    var row = world.grid[gy];
    return row ? (row[gx] || '#') : '#';
  };

  D.isSolid = function (world, x, y) {
    return world.raySolid(Math.floor(x), Math.floor(y), D.tileAt(world, x, y));
  };

  D.canMoveTo = function (world, x, y, r) {
    if (D.isSolid(world, x - r, y - r)) return false;
    if (D.isSolid(world, x + r, y - r)) return false;
    if (D.isSolid(world, x - r, y + r)) return false;
    if (D.isSolid(world, x + r, y + r)) return false;
    return true;
  };

  function hasLOS(world, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return true;
    dx /= len; dy /= len;
    var hit = D.castRay(world.grid, ax, ay, dx, dy, world.raySolid);
    return hit.dist > len - 0.35;
  }

  D.alertEnemies = function (world, x, y, radius) {
    var r2 = radius * radius;
    for (var i = 0; i < world.enemies.length; i++) {
      var e = world.enemies[i];
      if (e.state === 'dead') continue;
      if (D.dist2(e.x, e.y, x, y) < r2 && e.state === 'idle') {
        e.state = 'chase';
      }
    }
  };

  /* ---------------- daño ---------------- */

  D.damagePlayer = function (world, dmg) {
    var p = world.player;
    if (p.dead) return;
    if (p.armor > 0) {
      var absorbed = Math.min(p.armor, dmg * 0.5);
      p.armor -= absorbed;
      dmg -= absorbed;
    }
    p.hp -= dmg;
    p.hurtFlash = Math.min(0.9, p.hurtFlash + 0.3 + dmg * 0.012);
    snd('playerHurt');
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
    }
  };

  D.damageEnemy = function (world, e, dmg) {
    if (e.state === 'dead') return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.state = 'dead';
      e.deadTime = 0;
      world.kills++;
      snd('enemyDeath');
    } else {
      if (Math.random() < e.type.painChance) {
        e.state = 'pain';
        e.stateTime = 0.55;
      }
      if (e.state === 'idle') e.state = 'chase';
      snd('pain');
    }
  };

  D.explode = function (world, x, y, radius, maxDmg) {
    snd('explosion');
    world.effects.push({ x: x, y: y, art: 'explosion', ttl: 0.5, life: 0.5, scale: 1.7, yOff: -0.15 });

    var p = world.player;
    var dp = D.dist(x, y, p.x, p.y);
    if (dp < radius) {
      D.damagePlayer(world, maxDmg * (1 - dp / radius));
    }
    for (var i = 0; i < world.enemies.length; i++) {
      var e = world.enemies[i];
      if (e.state === 'dead') continue;
      var de = D.dist(x, y, e.x, e.y);
      if (de < radius) {
        D.damageEnemy(world, e, maxDmg * (1 - de / radius));
      }
    }
    for (var b = 0; b < world.barrels.length; b++) {
      var bar = world.barrels[b];
      if (bar.dead) continue;
      var db = D.dist(x, y, bar.x, bar.y);
      if (db < radius && db > 0.01) {
        D.damageBarrel(world, bar, maxDmg * (1 - db / radius) + 1);
      }
    }
  };

  D.damageBarrel = function (world, barrel, dmg) {
    if (barrel.dead) return;
    barrel.hp -= dmg;
    if (barrel.hp <= 0) {
      barrel.dead = true;
      D.explode(world, barrel.x, barrel.y, 2.6, 42);
    }
  };

  /* ---------------- disparo hitscan ---------------- */

  D.tryHitScan = function (world, angle, dmg) {
    var p = world.player;
    var dx = Math.cos(angle), dy = Math.sin(angle);
    var hit = D.castRay(world.grid, p.x, p.y, dx, dy, world.raySolid);
    var wallDist = hit.dist;

    var best = null, bestT = Infinity;
    for (var i = 0; i < world.enemies.length; i++) {
      var e = world.enemies[i];
      if (e.state === 'dead') continue;
      var ex = e.x - p.x, ey = e.y - p.y;
      var t = ex * dx + ey * dy;
      if (t < 0.12 || t > wallDist + e.type.radius) continue;
      var perp = Math.abs(ex * dy - ey * dx);
      if (perp < e.type.radius * 1.2 && t < bestT) {
        best = e;
        bestT = t;
      }
    }
    /* barriles también reciben disparos */
    for (var b = 0; b < world.barrels.length; b++) {
      var bar = world.barrels[b];
      if (bar.dead) continue;
      var bx = bar.x - p.x, by = bar.y - p.y;
      var tb = bx * dx + by * dy;
      if (tb < 0.12 || tb > wallDist + 0.35) continue;
      var perpB = Math.abs(bx * dy - by * dx);
      if (perpB < 0.42 && tb < bestT) {
        /* si el barril está más cerca que el mejor enemigo, impacta el barril */
        if (!best || tb < bestT) {
          D.damageBarrel(world, bar, dmg);
          return;
        }
      }
    }
    if (best) D.damageEnemy(world, best, dmg);
  };

  /* ---------------- proyectiles ---------------- */

  function spawnFireball(world, e) {
    var p = world.player;
    var ang = Math.atan2(p.y - e.y, p.x - e.x);
    world.projectiles.push({
      x: e.x + Math.cos(ang) * 0.45,
      y: e.y + Math.sin(ang) * 0.45,
      dx: Math.cos(ang) * 4.6,
      dy: Math.sin(ang) * 4.6,
      dmg: D.randInt(e.type.fireDmg[0], e.type.fireDmg[1]),
      ttl: 5,
      time: 0
    });
    snd('fireball');
  }

  function updateProjectiles(world, dt) {
    var p = world.player;
    for (var i = world.projectiles.length - 1; i >= 0; i--) {
      var pr = world.projectiles[i];
      pr.time += dt;
      pr.ttl -= dt;
      var dead = pr.ttl <= 0;
      var steps = 3;
      for (var s = 0; s < steps && !dead; s++) {
        pr.x += pr.dx * dt / steps;
        pr.y += pr.dy * dt / steps;
        if (D.isSolid(world, pr.x, pr.y)) {
          world.effects.push({ x: pr.x, y: pr.y, art: 'explosion', ttl: 0.25, life: 0.25, scale: 0.7, yOff: -0.1 });
          dead = true;
          break;
        }
        if (D.dist2(pr.x, pr.y, p.x, p.y) < 0.22) {
          D.damagePlayer(world, pr.dmg);
          world.effects.push({ x: pr.x, y: pr.y, art: 'explosion', ttl: 0.25, life: 0.25, scale: 0.7, yOff: -0.1 });
          dead = true;
          break;
        }
      }
      if (dead) world.projectiles.splice(i, 1);
    }
  }

  /* ---------------- IA de enemigos ---------------- */

  function updateEnemy(world, e, dt) {
    if (e.state === 'dead') {
      e.deadTime += dt;
      return;
    }
    var p = world.player;
    var d = D.dist(e.x, e.y, p.x, p.y);
    e.animTime += dt;

    if (e.state === 'pain') {
      e.stateTime -= dt;
      if (e.stateTime <= 0) e.state = 'chase';
      return;
    }

    var canSee = d < e.type.sight && hasLOS(world, e.x, e.y, p.x, p.y);

    if (e.state === 'idle') {
      if (canSee) {
        e.state = 'chase';
        if (Math.random() < 0.7) snd('impSight');
      }
      return;
    }

    e.attackCd -= dt;

    if (e.state === 'attack') {
      e.stateTime -= dt;
      if (e.stateTime <= 0) {
        if (e.pendingAttack === 'ranged') {
          spawnFireball(world, e);
        } else {
          if (d < 1.8) {
            D.damagePlayer(world, D.randInt(e.type.meleeDmg[0], e.type.meleeDmg[1]));
            snd('impAttack');
          }
        }
        e.pendingAttack = null;
        e.state = 'chase';
      }
      return;
    }

    /* estado chase: atacar o acercarse */
    if (canSee && e.attackCd <= 0 && d < 9.5) {
      if (e.type.ranged && d > 1.7) {
        e.state = 'attack';
        e.stateTime = 0.42;
        e.pendingAttack = 'ranged';
        e.attackCd = e.type.attackCd * D.rand(0.85, 1.25);
        return;
      }
      if (d <= 1.55) {
        e.state = 'attack';
        e.stateTime = 0.32;
        e.pendingAttack = 'melee';
        e.attackCd = e.type.attackCd * D.rand(0.8, 1.2);
        snd('impAttack');
        return;
      }
    }

    /* movimiento hacia el jugador (con deslizamiento y jitter) */
    if (d > 0.75) {
      var ang = Math.atan2(p.y - e.y, p.x - e.x) + e.wander;
      e.wander += (Math.random() - 0.5) * 0.25;
      e.wander *= 0.9;
      var speed = e.type.speed * dt;
      var nx = e.x + Math.cos(ang) * speed;
      var ny = e.y + Math.sin(ang) * speed;
      var moved = false;
      if (D.canMoveTo(world, nx, e.y, e.type.radius)) {
        e.x = nx;
        moved = true;
      }
      if (D.canMoveTo(world, e.x, ny, e.type.radius)) {
        e.y = ny;
        moved = true;
      }
      if (!moved) e.wander += (Math.random() < 0.5 ? -0.9 : 0.9);
    }
  }

  /* ---------------- pickups y puertas ---------------- */

  function updatePickups(world) {
    var p = world.player;
    for (var i = 0; i < world.pickups.length; i++) {
      var pk = world.pickups[i];
      if (pk.taken) continue;
      if (D.dist2(pk.x, pk.y, p.x, p.y) > 0.36) continue;

      var took = false;
      if (pk.kind === 'health' && p.hp < 100) {
        p.hp = Math.min(100, p.hp + 25);
        took = true;
      } else if (pk.kind === 'ammo' && p.ammo.bullets < 200) {
        p.ammo.bullets = Math.min(200, p.ammo.bullets + 20);
        took = true;
      } else if (pk.kind === 'shells' && p.ammo.shells < 50) {
        p.ammo.shells = Math.min(50, p.ammo.shells + 8);
        took = true;
      } else if (pk.kind === 'armor' && p.armor < 100) {
        p.armor = Math.min(100, p.armor + 50);
        took = true;
      } else if (pk.kind === 'shotgun') {
        p.weapons.shotgun = true;
        p.ammo.shells = Math.min(50, p.ammo.shells + 8);
        if (p.weapon !== 'shotgun') p.weapon = 'shotgun';
        took = true;
      }
      if (took) {
        pk.taken = true;
        p.pickupFlash = Math.min(0.7, p.pickupFlash + 0.4);
        snd('pickup');
      }
    }
  }

  function entityNear(world, x, y, r) {
    var p = world.player;
    if (D.dist2(p.x, p.y, x, y) < r * r) return true;
    for (var i = 0; i < world.enemies.length; i++) {
      var e = world.enemies[i];
      if (e.state === 'dead') continue;
      if (D.dist2(e.x, e.y, x, y) < r * r) return true;
    }
    return false;
  }

  function updateDoors(world, dt) {
    for (var k in world.doors) {
      var d = world.doors[k];
      var cx = d.x + 0.5, cy = d.y + 0.5;
      if (d.target === 1) {
        d.open = Math.min(1, d.open + dt * 1.7);
        if (d.open >= 1) {
          d.timer -= dt;
          if (d.timer <= 0 && !entityNear(world, cx, cy, 1.15)) d.target = 0;
        }
      } else {
        if (entityNear(world, cx, cy, 1.15)) {
          d.target = 1;
          d.timer = 2.2;
        } else {
          d.open = Math.max(0, d.open - dt * 1.4);
        }
      }
    }
  }

  D.openDoorAt = function (world, gx, gy) {
    var d = world.doors[gx + ',' + gy];
    if (!d) return false;
    if (d.target !== 1) {
      d.target = 1;
      d.timer = 3;
      snd('door');
    } else {
      d.timer = 3;
    }
    return true;
  };

  /* ---------------- actualización global ---------------- */

  D.updateWorld = function (world, dt) {
    world.time += dt;
    var i;
    for (i = 0; i < world.enemies.length; i++) {
      updateEnemy(world, world.enemies[i], dt);
    }
    updateProjectiles(world, dt);
    updatePickups(world);
    updateDoors(world, dt);
    for (i = world.effects.length - 1; i >= 0; i--) {
      var fx = world.effects[i];
      fx.ttl -= dt;
      if (fx.ttl <= 0) world.effects.splice(i, 1);
    }
  };

  /* ---------------- sprites del mundo para el render ---------------- */

  D.collectSprites = function (world) {
    var out = [];
    var i, e, art;

    for (i = 0; i < world.enemies.length; i++) {
      e = world.enemies[i];
      art = D.art.enemies[e.type.art];
      if (e.state === 'dead') {
        out.push({
          x: e.x, y: e.y,
          tex: art.dead[e.deadTime < 0.35 ? 0 : 1],
          scale: e.type.scale, yOff: 0
        });
      } else {
        var tex;
        if (e.state === 'attack') tex = art.attack;
        else if (e.state === 'pain') tex = art.pain;
        else tex = art.walk[Math.floor(e.animTime * 3.2) % 2]; /* alternar frames */
        out.push({ x: e.x, y: e.y, tex: tex, scale: e.type.scale, yOff: 0 });
      }
    }

    for (i = 0; i < world.barrels.length; i++) {
      var b = world.barrels[i];
      if (b.dead) continue;
      out.push({ x: b.x, y: b.y, tex: D.art.barrel, scale: 0.62, yOff: 0 });
    }

    for (i = 0; i < world.pickups.length; i++) {
      var pk = world.pickups[i];
      if (pk.taken) continue;
      out.push({
        x: pk.x, y: pk.y, tex: D.art.pickups[pk.kind],
        scale: 0.5, yOff: -0.02
      });
    }

    for (i = 0; i < world.projectiles.length; i++) {
      var pr = world.projectiles[i];
      out.push({
        x: pr.x, y: pr.y, tex: D.art.fireball,
        scale: 0.3 + Math.sin(pr.time * 18) * 0.03, yOff: -0.28
      });
    }

    for (i = 0; i < world.effects.length; i++) {
      var fx = world.effects[i];
      out.push({
        x: fx.x, y: fx.y,
        tex: D.art.explosion[fx.ttl > fx.life * 0.5 ? 0 : 1],
        scale: fx.scale * (1.25 - 0.4 * (fx.ttl / fx.life)), yOff: fx.yOff || -0.15
      });
    }

    return out;
  };

})(window.DOOM = window.DOOM || {});
