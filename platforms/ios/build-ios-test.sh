#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT="$SCRIPT_DIR/MoonDarksideIOS.xcodeproj"
SCHEME="MoonDarksideIOS"
CONFIGURATION="Debug"
BUILD_DIR="$SCRIPT_DIR/build"
DERIVED_DATA="$BUILD_DIR/DerivedData"
WWW_DIR="$SCRIPT_DIR/MoonDarksideIOS/Resources/www"
ARCHIVE_PATH="/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.xcarchive"
EXPORT_PATH="/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test-export"
IPA_OUTPUT="/Users/pareo/Documents/月之暗面-v0.4.1-ios-selfsigned-test.ipa"

sync_web_assets() {
  echo "== Sync web app shell =="
  rm -rf "$WWW_DIR"
  mkdir -p "$WWW_DIR"

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
}

build_simulator() {
  sync_web_assets
  echo "== Build iOS simulator app =="
  xcodebuild \
    -project "$PROJECT" \
    -target "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphonesimulator \
    SYMROOT="$BUILD_DIR/SymRoot" \
    OBJROOT="$BUILD_DIR/ObjRoot" \
    CODE_SIGNING_ALLOWED=NO \
    build
}

build_device() {
  sync_web_assets
  echo "== Build iOS device app =="
  xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphoneos \
    -destination "generic/platform=iOS" \
    -derivedDataPath "$DERIVED_DATA" \
    -allowProvisioningUpdates \
    build
}

archive_device() {
  sync_web_assets
  echo "== Archive iOS app =="
  rm -rf "$ARCHIVE_PATH"
  xcodebuild archive \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphoneos \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    -derivedDataPath "$DERIVED_DATA" \
    -allowProvisioningUpdates
}

export_ipa() {
  echo "== Export iOS IPA =="
  if [ ! -d "$ARCHIVE_PATH" ]; then
    echo "Archive not found: $ARCHIVE_PATH" >&2
    exit 1
  fi
  rm -rf "$EXPORT_PATH" "$IPA_OUTPUT"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$SCRIPT_DIR/exportOptions.plist" \
    -allowProvisioningUpdates

  IPA_FOUND="$(find "$EXPORT_PATH" -name "*.ipa" -type f | head -1 || true)"
  if [ -z "$IPA_FOUND" ]; then
    echo "No IPA generated in $EXPORT_PATH" >&2
    exit 1
  fi
  cp "$IPA_FOUND" "$IPA_OUTPUT"
  ls -lh "$IPA_OUTPUT"
}

case "${1:-simulator}" in
  simulator)
    build_simulator
    ;;
  device)
    build_device
    ;;
  archive)
    archive_device
    ;;
  export)
    export_ipa
    ;;
  *)
    echo "Usage: $0 {simulator|device|archive|export}" >&2
    exit 2
    ;;
esac
