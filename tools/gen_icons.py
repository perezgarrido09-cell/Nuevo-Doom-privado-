#!/usr/bin/env python3
"""Genera los iconos PNG de la PWA sin dependencias externas (diseño original)."""
import os
import struct
import zlib


def write_png(path, size, pixels):
    raw = b''.join(
        b'\x00' + bytes(v for px in row for v in px) for row in pixels
    )

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
           chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


# Glifos 5x7 estilo píxel para "DOOM"
GLYPHS = {
    'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    'M': ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
}


def draw_icon(size, maskable=False):
    s = size / 512.0
    content = 0.72 if maskable else 1.0

    def C(v):
        # coordenadas de diseño (512) -> píxeles reales, centradas si maskable
        return int((v - 256) * s * content + size / 2)

    px = [[(0, 0, 0)] * size for _ in range(size)]

    # fondo: degradado rojo oscuro + franjas diagonales sutiles
    for y in range(size):
        t = y / max(1, size - 1)
        base = (int(96 - 50 * t), int(12 + 6 * t), int(12 + 4 * t))
        for x in range(size):
            stripe = 10 if ((x + y) // max(1, size // 16)) % 2 == 0 else 0
            px[y][x] = (base[0] + stripe, base[1], base[2])

    def fill_rect(x0, y0, x1, y1, col):
        for y in range(max(0, y0), min(size, y1)):
            row = px[y]
            for x in range(max(0, x0), min(size, x1)):
                row[x] = col

    def fill_circle(cx, cy, r, col):
        r2 = r * r
        for y in range(max(0, cy - r), min(size, cy + r + 1)):
            dy = y - cy
            row = px[y]
            for x in range(max(0, cx - r), min(size, cx + r + 1)):
                dx = x - cx
                if dx * dx + dy * dy <= r2:
                    row[x] = col

    def fill_triangle(p0, p1, p2, col):
        xs = [p0[0], p1[0], p2[0]]
        ys = [p0[1], p1[1], p2[1]]
        x0, x1 = max(0, min(xs)), min(size, max(xs) + 1)
        y0, y1 = max(0, min(ys)), min(size, max(ys) + 1)
        d = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if d == 0:
            return
        for y in range(y0, y1):
            for x in range(x0, x1):
                w0 = ((p1[1] - p2[1]) * (x - p2[0]) + (p2[0] - p1[0]) * (y - p2[1])) / d
                w1 = ((p2[1] - p0[1]) * (x - p2[0]) + (p0[0] - p2[0]) * (y - p2[1])) / d
                w2 = 1 - w0 - w1
                if w0 >= 0 and w1 >= 0 and w2 >= 0:
                    px[y][x] = col

    def draw_text(text, cx, top, scale, col, shadow=None):
        w = sum((5 if ch != ' ' else 3) * scale for ch in text) + \
            (len(text) - 1) * scale * 2
        x = cx - w // 2
        for ch in text:
            if ch == ' ':
                x += 3 * scale
                continue
            g = GLYPHS[ch]
            for gy, row in enumerate(g):
                for gx, bit in enumerate(row):
                    if bit == '1':
                        if shadow:
                            fill_rect(x + gx * scale + shadow, top + gy * scale + shadow,
                                      x + gx * scale + scale + shadow,
                                      top + gy * scale + scale + shadow, shadow_col)
                        fill_rect(x + gx * scale, top + gy * scale,
                                  x + gx * scale + scale, top + gy * scale + scale, col)
            x += 7 * scale + 2 * scale

    # --- composición ---
    # cuernos
    horn = (216, 200, 160)
    fill_triangle((C(150), C(190)), (C(105), C(60)), (C(215), C(155)), horn)
    fill_triangle((C(362), C(190)), (C(407), C(60)), (C(297), C(155)), horn)
    # cabeza
    head = (43, 34, 38)
    fill_circle(C(256), C(255), C(256 + 122) - C(256), head)
    fill_rect(C(150), C(255), C(362), C(368), head)
    # ceño
    fill_rect(C(160), C(210), C(352), C(232), (30, 22, 26))
    # ojos
    eye = (255, 68, 34)
    fill_circle(C(212), C(250), C(256 + 30) - C(256), eye)
    fill_circle(C(300), C(250), C(256 + 30) - C(256), eye)
    fill_circle(C(218), C(256), C(256 + 13) - C(256), (26, 5, 5))
    fill_circle(C(306), C(256), C(256 + 13) - C(256), (26, 5, 5))
    # boca con dientes
    fill_rect(C(196), C(308), C(316), C(346), (26, 5, 5))
    for i in range(5):
        fill_rect(C(204 + i * 23), C(308), C(218 + i * 23), C(324), (216, 200, 160))

    # texto DOOM
    shadow_col = (60, 8, 4)
    scale = max(2, int(size * 0.030 * content))
    draw_text('DOOM', size // 2, C(398), scale, (255, 92, 40), shadow=scale // 2)

    return px


def main():
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, 'icon-192.png'), 192, draw_icon(192))
    write_png(os.path.join(out, 'icon-512.png'), 512, draw_icon(512))
    write_png(os.path.join(out, 'icon-512-maskable.png'), 512, draw_icon(512, maskable=True))
    print('Iconos generados en', out)


if __name__ == '__main__':
    main()
