#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_NAME="月之暗面.app"
APP_OUTPUT="/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.app"
DMG_OUTPUT="/Users/pareo/Documents/月之暗面-v0.4.1-macos-test.dmg"
BUILD_DIR="$SCRIPT_DIR/build"
APP_STAGE="$BUILD_DIR/$APP_NAME"
CONTENTS_DIR="$APP_STAGE/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
WWW_DIR="$RESOURCES_DIR/www"
DMG_STAGING="/tmp/moon-macos-dmg-staging"

echo "== Moon macOS test wrapper build =="
echo "Repo: $REPO_ROOT"
echo "App:  $APP_OUTPUT"
echo "DMG:  $DMG_OUTPUT"

rm -rf "$BUILD_DIR" "$APP_OUTPUT" "$DMG_OUTPUT" "$DMG_STAGING"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR" "$WWW_DIR" "$DMG_STAGING"

echo "== Compile Swift AppKit/WKWebView app =="
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
swiftc \
  -sdk "$SDK_PATH" \
  -target arm64-apple-macos12.0 \
  -framework AppKit \
  -framework WebKit \
  "$SCRIPT_DIR/MoonDarkside/Sources/main.swift" \
  -o "$MACOS_DIR/MoonDarkside"

echo "== Copy bundle resources =="
cp "$SCRIPT_DIR/MoonDarkside/Resources/Info.plist" "$CONTENTS_DIR/Info.plist"

if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1 && [ -f "$REPO_ROOT/app_icon_512.png" ]; then
  ICONSET="$BUILD_DIR/AppIcon.iconset"
  mkdir -p "$ICONSET"
  sips -z 16 16 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_16x16.png" >/dev/null
  sips -z 32 32 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
  sips -z 32 32 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_32x32.png" >/dev/null
  sips -z 64 64 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
  sips -z 128 128 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_128x128.png" >/dev/null
  sips -z 256 256 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
  sips -z 256 256 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_256x256.png" >/dev/null
  sips -z 512 512 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
  sips -z 512 512 "$REPO_ROOT/app_icon_512.png" --out "$ICONSET/icon_512x512.png" >/dev/null
  iconutil -c icns "$ICONSET" -o "$RESOURCES_DIR/AppIcon.icns"
else
  echo "Icon tools unavailable; building without AppIcon.icns."
fi

echo "== Copy web app shell =="
for item in index.html styles.css manifest.webmanifest sw.js favicon.ico app_icon.png app_icon_192.png app_icon_512.png; do
  if [ -f "$REPO_ROOT/$item" ]; then
    cp "$REPO_ROOT/$item" "$WWW_DIR/$item"
  fi
done
ditto "$REPO_ROOT/js" "$WWW_DIR/js"

find "$WWW_DIR" \( \
  -name ".DS_Store" -o \
  -name "*.zip" -o \
  -name "*.apk" -o \
  -name "*.aab" -o \
  -name "*.dmg" -o \
  -name "*.ipa" -o \
  -name "*.app" -o \
  -name "*.xcarchive" -o \
  -name "*.moonenc.json" -o \
  -name "*backup*.json" -o \
  -name "*.tmp" -o \
  -name "*.bak" -o \
  -name "*.log" \
\) -print -delete

echo "== Ad-hoc sign app =="
codesign --force --deep --sign - "$APP_STAGE"
codesign --verify --deep --strict "$APP_STAGE"

echo "== Copy app to output path =="
ditto "$APP_STAGE" "$APP_OUTPUT"

echo "== Create DMG =="
ditto "$APP_OUTPUT" "$DMG_STAGING/$APP_NAME"
ln -s /Applications "$DMG_STAGING/Applications"
hdiutil create \
  -volname "月之暗面 v0.4.1 Test" \
  -srcfolder "$DMG_STAGING" \
  -ov \
  -format UDZO \
  "$DMG_OUTPUT"
hdiutil verify "$DMG_OUTPUT"

echo "== Build complete =="
ls -lh "$APP_OUTPUT" "$DMG_OUTPUT"
