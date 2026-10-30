#!/usr/bin/env bash
# DOOM — construye el APK instalable usando el Android SDK preinstalado
# (pensado para ejecutarse en GitHub Actions: ubuntu-latest con ANDROID_HOME)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Localizando herramientas del Android SDK..."
BT_VER=$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)
PLAT_VER=$(ls "$ANDROID_HOME/platforms" | sort -V | tail -1)
BT="$ANDROID_HOME/build-tools/$BT_VER"
ANDROID_JAR="$ANDROID_HOME/platforms/$PLAT_VER/android.jar"
echo "    build-tools: $BT_VER | platform: $PLAT_VER"

echo "==> Preparando estructura..."
rm -rf out build
mkdir -p out build/assets build/res/mipmap-xxxhdpi build/classes build/dex

# El juego completo pasa a assets/ del APK
cp ../index.html ../manifest.webmanifest ../sw.js build/assets/
cp -r ../css ../js ../icons build/assets/

# Icono de la app (192px = mipmap-xxxhdpi)
cp ../icons/icon-192.png build/res/mipmap-xxxhdpi/ic_launcher.png

echo "==> Compilando recursos y manifiesto (aapt2)..."
"$BT/aapt2" compile --dir build/res -o build/res.zip
"$BT/aapt2" link -o build/base.apk \
  -I "$ANDROID_JAR" \
  --manifest AndroidManifest.xml \
  build/res.zip \
  -A build/assets \
  --min-sdk-version 21 \
  --target-sdk-version 28 \
  --version-code 1 \
  --version-name 1.0 \
  --auto-add-overlay

echo "==> Compilando MainActivity.java..."
javac --release 11 \
  -classpath "$ANDROID_JAR" \
  -d build/classes \
  MainActivity.java

echo "==> Generando classes.dex (d8)..."
"$BT/d8" --release \
  --lib "$ANDROID_JAR" \
  --min-api 21 \
  --output build/dex \
  build/classes/com/doomretro/app/MainActivity.class
cp build/dex/classes.dex build/classes.dex

echo "==> Insertando classes.dex en el APK..."
(cd build && zip -0 -q base.apk classes.dex)

echo "==> Alineando y firmando..."
"$BT/zipalign" -f -p 4 build/base.apk build/aligned.apk
keytool -genkeypair -keystore build/keystore.jks -alias doom \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass doomretro -keypass doomretro \
  -dname "CN=DOOM Personal, OU=Personal, O=Personal, C=GT" >/dev/null 2>&1
"$BT/apksigner" sign \
  --ks build/keystore.jks \
  --ks-key-alias doom \
  --ks-pass pass:doomretro \
  --key-pass pass:doomretro \
  --out out/DOOM.apk \
  build/aligned.apk

echo "==> Verificando firma..."
"$BT/apksigner" verify --print-certs out/DOOM.apk | head -5

echo "==> LISTO: android/out/DOOM.apk ($(du -h out/DOOM.apk | cut -f1))"
