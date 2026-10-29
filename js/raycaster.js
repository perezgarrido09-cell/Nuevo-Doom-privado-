/* DOOM — motor de raycasting (algoritmo DDA, implementación original) */
(function (D) {
  'use strict';

  /* Lanza un rayo y devuelve {dist, side, mapX, mapY, wallX, tile}.
   * solidFn(x, y, tile) indica si el tile bloquea el rayo. */
  D.castRay = function (grid, px, py, rdx, rdy, solidFn) {
    var mapX = Math.floor(px);
    var mapY = Math.floor(py);
    var deltaX = Math.abs(1 / rdx);
    var deltaY = Math.abs(1 / rdy);
    var stepX, stepY, sideX, sideY;

    if (rdx < 0) { stepX = -1; sideX = (px - mapX) * deltaX; }
    else { stepX = 1; sideX = (mapX + 1 - px) * deltaX; }
    if (rdy < 0) { stepY = -1; sideY = (py - mapY) * deltaY; }
    else { stepY = 1; sideY = (mapY + 1 - py) * deltaY; }

    var side = 0;
    for (var i = 0; i < 256; i++) {
      if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
      else { sideY += deltaY; mapY += stepY; side = 1; }
      var row = grid[mapY];
      var tile = row ? row[mapX] : '#';
      if (solidFn(mapX, mapY, tile)) {
        var dist = (side === 0)
          ? (mapX - px + (1 - stepX) / 2) / rdx
          : (mapY - py + (1 - stepY) / 2) / rdy;
        if (!(dist > 0)) dist = 0.02;
        var wallX = (side === 0) ? py + dist * rdy : px + dist * rdx;
        wallX -= Math.floor(wallX);
        return { dist: dist, side: side, mapX: mapX, mapY: mapY, wallX: wallX, tile: tile };
      }
    }
    return { dist: 60, side: 0, mapX: mapX, mapY: mapY, wallX: 0, tile: '#' };
  };

  function brightness(dist, side) {
    var b = 1.3 / (1 + dist * dist * 0.05);
    if (b > 1) b = 1;
    if (side === 1) b *= 0.7;
    return b;
  }

  function tileTex(world, tile, mapX, mapY) {
    if (tile === 'D') return D.tex.door;
    if (tile === 'E') return D.tex.exit;
    if (tile === 'G') return D.tex.rock;
    if (tile === '%') return D.tex.stone;
    if (tile === '&') return D.tex.tech;
    if (tile === 'X') return D.tex.metal;
    var h = (mapX * 31 + mapY * 17 + world.index * 7) % 12;
    return h < 7 ? D.tex.brick : (h < 10 ? D.tex.metal : D.tex.stone);
  }

  /* Rendeiza suelo, techo, muros y sprites en un buffer RGBA.
   * view: {x, y, dirX, dirY, planeX, planeY, horizon}
   * sprites: [{x, y, tex, scale, yOff}]  */
  D.renderWorld = function (buf, W, H, view, world, sprites) {
    var grid = world.grid;
    var px = view.x, py = view.y;
    var dirX = view.dirX, dirY = view.dirY;
    var planeX = view.planeX, planeY = view.planeY;
    var horizon = view.horizon;

    var ray0X = dirX - planeX, ray0Y = dirY - planeY;
    var ray1X = dirX + planeX, ray1Y = dirY + planeY;

    /* ---- suelo y techo (floor casting) ---- */
    var floorTex = D.tex.floor, ceilTex = D.tex.ceil;
    var fd = floorTex.data, cd = ceilTex.data;

    for (var y = 0; y < H; y++) {
      var isFloor = y > horizon;
      var p = isFloor ? (y - horizon) : (horizon - y);
      var rowOff = y * W * 4;
      if (p <= 0) {
        for (var xz = 0; xz < W; xz++) {
          var oz = rowOff + xz * 4;
          buf[oz] = 8; buf[oz + 1] = 6; buf[oz + 2] = 8; buf[oz + 3] = 255;
        }
        continue;
      }
      var rowDist = (0.5 * H) / p;
      var stepX = rowDist * (ray1X - ray0X) / W;
      var stepY = rowDist * (ray1Y - ray0Y) / W;
      var fx = px + rowDist * ray0X;
      var fy = py + rowDist * ray0Y;
      var shadeB = brightness(rowDist, 0) * (isFloor ? 1 : 0.82);
      if (shadeB > 1) shadeB = 1;

      for (var x = 0; x < W; x++) {
        var tx = ((fx * 64) | 0) & 63;
        var ty = ((fy * 64) | 0) & 63;
        var ti = (ty * 64 + tx) * 4;
        var o = rowOff + x * 4;
        if (isFloor) {
          buf[o] = fd[ti] * shadeB;
          buf[o + 1] = fd[ti + 1] * shadeB;
          buf[o + 2] = fd[ti + 2] * shadeB;
        } else {
          buf[o] = cd[ti] * shadeB;
          buf[o + 1] = cd[ti + 1] * shadeB;
          buf[o + 2] = cd[ti + 2] * shadeB;
        }
        buf[o + 3] = 255;
        fx += stepX;
        fy += stepY;
      }
    }

    /* ---- muros ---- */
    var zBuffer = new Float32Array(W);
    for (var col = 0; col < W; col++) {
      var cameraX = 2 * col / W - 1;
      var rdx = dirX + planeX * cameraX;
      var rdy = dirY + planeY * cameraX;
      var hit = D.castRay(grid, px, py, rdx, rdy, world.raySolid);
      var dist = hit.dist;
      zBuffer[col] = dist;

      var lineH = (H / dist) | 0;
      var drawStart = -lineH / 2 + horizon;
      var drawEnd = lineH / 2 + horizon;
      var y0 = Math.max(0, Math.ceil(drawStart));
      var y1 = Math.min(H - 1, Math.floor(drawEnd));

      var tex = tileTex(world, hit.tile, hit.mapX, hit.mapY);
      var td = tex.data;
      var texX = (hit.wallX * 64) | 0;
      if (hit.tile === 'D') {
        var open = world.doorOpen(hit.mapX, hit.mapY);
        texX = (texX - ((open * 56) | 0)) & 63;
      } else {
        if (hit.side === 0 && rdx > 0) texX = 63 - texX;
        if (hit.side === 1 && rdy < 0) texX = 63 - texX;
      }
      if (texX < 0) texX = 0; else if (texX > 63) texX = 63;

      var texStep = 64 / lineH;
      var texPos = (y0 - drawStart) * texStep;
      var shadeB2 = brightness(dist, hit.side);
      var colBase = texX * 4;

      for (var yy = y0; yy <= y1; yy++) {
        var texY = texPos | 0;
        if (texY < 0) texY = 0; else if (texY > 63) texY = 63;
        texPos += texStep;
        var si = (texY * 64) * 4 + colBase;
        var oo = (yy * W + col) * 4;
        buf[oo] = td[si] * shadeB2;
        buf[oo + 1] = td[si + 1] * shadeB2;
        buf[oo + 2] = td[si + 2] * shadeB2;
        buf[oo + 3] = 255;
      }
    }

    /* ---- sprites (billboards con z-buffer) ---- */
    if (sprites && sprites.length) {
      var list = sprites.slice();
      for (var s = 0; s < list.length; s++) {
        list[s]._d = D.dist2(list[s].x, list[s].y, px, py);
      }
      list.sort(function (a, b) { return b._d - a._d; });

      var invDet = 1.0 / (planeX * dirY - dirX * planeY);

      for (var si2 = 0; si2 < list.length; si2++) {
        var sp = list[si2];
        var relX = sp.x - px, relY = sp.y - py;
        var trX = invDet * (dirY * relX - dirX * relY);
        var trY = invDet * (-planeY * relX + planeX * relY);
        if (trY < 0.18) continue;

        var screenX = ((W / 2) * (1 + trX / trY)) | 0;
        var scale = sp.scale || 1;
        var spriteH = Math.abs((H / trY)) * scale;
        var spriteW = spriteH;
        var yOff = sp.yOff || 0;
        var vStart = horizon + (H / trY) * (0.5 - scale + yOff);
        var xStart = screenX - spriteW / 2;
        var xEnd = screenX + spriteW / 2;
        var sy0 = Math.max(0, Math.ceil(vStart));
        var sy1 = Math.min(H - 1, Math.floor(vStart + spriteH));
        var sx0 = Math.max(0, Math.ceil(xStart));
        var sx1 = Math.min(W - 1, Math.floor(xEnd));
        if (sy1 < sy0 || sx1 < sx0) continue;

        var stex = sp.tex;
        var sd = stex.data;
        var shadeS = brightness(trY, 0);

        for (var sxs = sx0; sxs <= sx1; sxs++) {
          if (trY >= zBuffer[sxs]) continue;
          var tsx = (((sxs - xStart) / spriteW) * stex.w) | 0;
          if (tsx < 0) tsx = 0; else if (tsx >= stex.w) tsx = stex.w - 1;
          for (var sys = sy0; sys <= sy1; sys++) {
            var tsy = (((sys - vStart) / spriteH) * stex.h) | 0;
            if (tsy < 0) tsy = 0; else if (tsy >= stex.h) tsy = stex.h - 1;
            var idx = (tsy * stex.w + tsx) * 4;
            if (sd[idx + 3] < 128) continue;
            var o2 = (sys * W + sxs) * 4;
            buf[o2] = sd[idx] * shadeS;
            buf[o2 + 1] = sd[idx + 1] * shadeS;
            buf[o2 + 2] = sd[idx + 2] * shadeS;
            buf[o2 + 3] = 255;
          }
        }
      }
    }
  };

})(window.DOOM = window.DOOM || {});
