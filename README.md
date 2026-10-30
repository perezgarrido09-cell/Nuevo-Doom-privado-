# DOOM

Shooter retro en primera persona (estilo años 90) para navegador, jugable en **celular** y **computadora**. Hecho con HTML5 + Canvas + Web Audio, sin librerías externas. **Uso personal — todos los recursos (código, gráficos, sonidos) son originales y procedurales; no incluye nada del juego comercial.**

## Cómo ejecutarlo

**Opción A — APP para Android (recomendado en celular):** descarga **`DOOM.apk`** desde la sección [Releases](https://github.com/perezgarrido09-cell/Nuevo-Doom-privado-/releases) del repositorio e instálalo (ver "Instalar el APK" más abajo). Queda como app con su icono "DOOM", sin navegador.

**Opción B — directo:** abre `index.html` en el navegador (doble clic). Ya funciona.

**Opción C — servidor local:**

```bash
python3 -m http.server 8000
# o: npx serve .
```

Luego entra a `http://localhost:8000`.

**En el celular (PWA):** abre la URL del servidor y usa el menú del navegador → **"Instalar aplicación"** / **"Añadir a pantalla de inicio"**. Después de la primera carga funciona **sin conexión** (PWA con service worker).

## Instalar el APK (Android)

1. Descarga `DOOM.apk` desde [Releases](https://github.com/perezgarrido09-cell/Nuevo-Doom-privado-/releases) (link directo de descarga).
2. Toca el archivo descargado. Si Android pide permiso para **instalar apps desconocidas**, actívalo para tu navegador/archivos.
3. Si Play Protect avisa ("app no reconocida"), elige **"Instalar de todos modos"** — es normal en apps personales sin publicar en Play Store.
4. Abre el ícono **DOOM**. Funciona 100% sin conexión.

El APK se construye automáticamente con **GitHub Actions** (`.github/workflows/build-apk.yml` + `android/build-apk.sh`) y se publica en Releases en cada cambio.

## Controles

| Acción | Computadora | Celular |
|---|---|---|
| Moverse | `W A S D` / flechas | Joystick izquierdo |
| Girar vista | Ratón (clic para capturar) | Arrastrar a la derecha |
| Disparar | Clic | Botón **FUEGO** |
| Abrir puertas / palanca | `E` / `Espacio` | Botón **USAR** |
| Cambiar arma | `1` / `2` / `Q` | Botón **ARMA** |
| Correr | `Shift` | — |
| Pausa | `Esc` / `P` | (auto al cambiar de app) |
| Silenciar | `M` | Botón de sonido del menú |

Llega a la **palanca verde de salida** y pulsa USAR para completar cada nivel. Tres niveles: *La Base*, *La Cripta* y *El Núcleo*.

## Estructura

```
index.html            pantalla y menús
css/style.css         estilos de interfaz y controles táctiles
js/util.js            utilidades
js/textures.js        texturas y sprites procedurales (gráficos originales)
js/audio.js           sonidos y música sintetizados (originales)
js/maps.js            mapas de los 3 niveles
js/raycaster.js       motor de raycasting (DDA)
js/entities.js        enemigos, IA, proyectiles, pickups, armas
js/input.js           teclado, ratón y táctil
js/game.js            bucle principal, HUD, estados
js/main.js            arranque y registro del service worker
manifest.webmanifest  metadatos PWA ("DOOM", pantalla completa)
sw.js                 caché para funcionar sin conexión
android/              app de Android (WebView) + script de compilación del APK
.github/workflows/    workflow que compila el APK en GitHub Actions
icons/                iconos de la app (generados por tools/gen_icons.py)
tools/gen_icons.py    generador de iconos (solo desarrollo)
tools/test_ray.js     pruebas del motor
```

## Pruebas

```bash
node tools/test_ray.js
```

Verifica mapas (formas, cierre, alcanzabilidad), raycasting, IA/puertas, daño y explosiones.

## Notas

- Título "DOOM" usado solo como etiqueta personal del proyecto. El juego es una obra original que no copia código, niveles ni recursos del juego comercial de id Software/ZeniMax. No está pensado para distribución.
