/* Pruebas del motor de DOOM (ejecutar con: node tools/test_ray.js) */
'use strict';

var fs = require('fs');
var path = require('path');

/* entorno mínimo de navegador simulado */
global.window = {};

var ROOT = path.dirname(__dirname);
function load(rel) {
  var code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // eslint-disable-next-line no-eval
  (0, eval)(code);
}

load('js/util.js');
load('js/maps.js');
load('js/raycaster.js');
load('js/entities.js');

var D = global.window.DOOM;
var failures = 0;

function ok(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
  } else {
    failures++;
    console.error('  ✗ ' + msg);
  }
}

function close(a, b, eps, msg) {
  ok(Math.abs(a - b) < eps, msg + ' (esperado ' + b + ', obtenido ' + a + ')');
}

/* ---------------- mapas ---------------- */
console.log('MAPAS:');
var VALID = { '#': 1, '%': 1, '&': 1, 'X': 1, 'G': 1, 'D': 1, 'E': 1, ' ': 1, '.': 1, 'P': 1, 'i': 1, 'm': 1, 't': 1, 'h': 1, 'a': 1, 's': 1, 'v': 1, 'w': 1, 'b': 1 };
var SOLID_BORDER = { '#': 1, '%': 1, '&': 1, 'X': 1, 'G': 1 };

D.maps.forEach(function (map, mi) {
  var rows = map.grid;
  var w = rows[0].length;
  var okLen = rows.every(function (r) { return r.length === w; });
  ok(okLen, 'mapa ' + (mi + 1) + ': todas las filas miden ' + w);

  var pCount = 0, eCount = 0, bad = false;
  rows.forEach(function (r, y) {
    r.split('').forEach(function (ch, x) {
      if (ch === 'P') pCount++;
      if (ch === 'E') eCount++;
      if (!VALID[ch]) bad = true;
      var border = (x === 0 || y === 0 || x === w - 1 || y === rows.length - 1);
      if (border && !SOLID_BORDER[ch]) bad = true;
    });
  });
  ok(!bad, 'mapa ' + (mi + 1) + ': tiles válidos y borde cerrado');
  ok(pCount === 1, 'mapa ' + (mi + 1) + ': exactamente un inicio P');
  ok(eCount >= 1, 'mapa ' + (mi + 1) + ': tiene salida E');

  /* inundación desde P: todo debe ser alcanzable */
  var startY = -1, startX = -1;
  rows.forEach(function (r, y) {
    var x = r.indexOf('P');
    if (x >= 0) { startX = x; startY = y; }
  });
  var passable = {};
  function isPass(x, y) {
    if (x < 0 || y < 0 || y >= rows.length || x >= w) return false;
    var ch = rows[y][x];
    return ch !== '#' && ch !== '%' && ch !== '&' && ch !== 'X' && ch !== 'G' && ch !== 'E';
  }
  var stack = [[startX, startY]];
  var seen = {};
  seen[startX + ',' + startY] = true;
  while (stack.length) {
    var cur = stack.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var nx = cur[0] + d[0], ny = cur[1] + d[1];
      var key = nx + ',' + ny;
      if (!seen[key] && isPass(nx, ny)) {
        seen[key] = true;
        stack.push([nx, ny]);
      }
    });
  }
  var unreach = [];
  rows.forEach(function (r, y) {
    r.split('').forEach(function (ch, x) {
      if ('imtvhawsb'.indexOf(ch) >= 0 && !seen[x + ',' + y]) unreach.push(ch + '@' + x + ',' + y);
      /* la salida necesita suelo adyacente alcanzable */
      if (ch === 'E') {
        var adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
          return seen[(x + d[0]) + ',' + (y + d[1])];
        });
        if (!adj) unreach.push('E@' + x + ',' + y);
      }
    });
  });
  ok(unreach.length === 0, 'mapa ' + (mi + 1) + ': todo alcanzable' + (unreach.length ? ' -> ' + unreach.join(' ') : ''));
});

/* ---------------- raycasting ---------------- */
console.log('RAYCASTER:');
var box = [
  '#####',
  '#...#',
  '#...#',
  '#...#',
  '#####'
];
var solidFn = function (x, y, tile) { return tile === '#'; };
var hit = D.castRay(box, 2.5, 2.5, 1, 0, solidFn);
close(hit.dist, 1.5, 0.001, 'rayo al este choca a 1.5');
ok(hit.side === 0 && hit.tile === '#', 'lado y tile correctos');

var hit2 = D.castRay(box, 2.5, 2.5, 0, -1, solidFn);
close(hit2.dist, 1.5, 0.001, 'rayo al norte choca a 1.5');
ok(hit2.side === 1, 'lado Y para rayo vertical');

var hit3 = D.castRay(box, 2.5, 2.5, 0.7071, 0.7071, solidFn);
close(hit3.dist, 1.5 * 1.4142, 0.01, 'rayo diagonal');

/* ---------------- mundo y simulación ---------------- */
console.log('MUNDO:');
var world = D.spawnWorld(0);
ok(world.enemies.length === 5, 'nivel 1 tiene 5 enemigos (obtenidos ' + world.enemies.length + ')');
ok(world.totalEnemies === world.enemies.length, 'contador de enemigos coherente');
ok(world.pickups.length === 4, 'nivel 1 tiene 4 pickups (obtenidos ' + world.pickups.length + ')');
ok(world.barrels.length === 2, 'nivel 1 tiene 2 barriles (obtenidos ' + world.barrels.length + ')');
ok(world.exit !== null, 'nivel 1 tiene salida');
ok(world.player.x === 3.5 && world.player.y === 19.5, 'posición inicial del jugador');

var threw = false;
try {
  for (var f = 0; f < 180; f++) D.updateWorld(world, 1 / 60);
} catch (e) {
  threw = true;
  console.error(e);
}
ok(!threw, 'simulación de 3 s sin excepciones');
ok(world.time > 2.9 && world.time < 3.1, 'reloj del mundo avanza');

/* puertas */
var doorKey = Object.keys(world.doors)[0];
var door = world.doors[doorKey];
D.openDoorAt(world, door.x, door.y);
for (var f2 = 0; f2 < 150; f2++) D.updateWorld(world, 1 / 60);
ok(door.open > 0.9, 'la puerta se abre al usarla (open=' + door.open.toFixed(2) + ')');

/* hitscan: enemigo justo al este del jugador, sin muros de por medio */
var p = world.player;
var e = world.enemies[0];
e.x = p.x + 2;
e.y = p.y;
e.hp = 100;
e.state = 'chase';
D.tryHitScan(world, 0, 30);
close(e.hp, 70, 0.001, 'hitscan al frente daña al enemigo');

var e2 = world.enemies[1];
e2.x = p.x;
e2.y = p.y + 2;
e2.hp = 100;
e2.state = 'chase';
D.tryHitScan(world, 0, 30);
close(e2.hp, 100, 0.001, 'hitscan al frente NO daña enemigo al lado');

/* explosión encadenada de barriles */
var w2 = D.spawnWorld(0);
var b0 = w2.barrels[0], b1 = w2.barrels[1];
b1.x = b0.x + 1;
b1.y = b0.y;
D.damageBarrel(w2, b0, 30);
ok(b0.dead && b1.dead, 'explosión en cadena destruye barriles cercanos');

/* daño al jugador con armadura */
var w3 = D.spawnWorld(0);
w3.player.armor = 50;
D.damagePlayer(w3, 20);
close(w3.player.hp, 90, 0.001, 'armadura absorbe la mitad del daño (hp)');
close(w3.player.armor, 40, 0.001, 'armadura absorbe la mitad del daño (armor)');

console.log('');
if (failures === 0) {
  console.log('TODAS LAS PRUEBAS PASARON ✔');
} else {
  console.error(failures + ' PRUEBA(S) FALLARON ✘');
  process.exit(1);
}
