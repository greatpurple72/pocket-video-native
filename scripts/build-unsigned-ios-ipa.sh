#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build-ios"
ARTIFACT_DIR="$ROOT_DIR/artifacts"

rm -rf "$BUILD_DIR" "$ARTIFACT_DIR" "$ROOT_DIR/ios"
mkdir -p "$BUILD_DIR" "$ARTIFACT_DIR"

cd "$ROOT_DIR"

echo "Generating the iOS project with Expo prebuild..."
npx expo prebuild --platform ios --non-interactive --no-install --clean

cd "$ROOT_DIR/ios"

echo "Installing CocoaPods dependencies..."
pod install

WORKSPACE_PATH="$(find . -maxdepth 1 -name '*.xcworkspace' ! -name 'Pods.xcworkspace' | head -n 1)"

if [[ -z "$WORKSPACE_PATH" ]]; then
  echo "No Xcode workspace was generated."
  exit 1
fi

SCHEME_NAME="$(
  xcodebuild -list -json -workspace "$WORKSPACE_PATH" |
    node -e '
      const fs = require("fs");
      const config = require(process.argv[1]);
      const input = JSON.parse(fs.readFileSync(0, "utf8"));
      const schemes = (input.workspace?.schemes || input.project?.schemes || []).filter(Boolean);
      const filtered = schemes.filter((name) => !/^Pods($|-)/.test(name));
      const hint = (config.expo?.name || config.expo?.slug || "")
        .replace(/[^A-Za-z0-9_-]/g, "")
        .toLowerCase();
      const normalized = (value) => value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
      const chosen =
        filtered.find((name) => normalized(name) === hint) ||
        filtered[0] ||
        schemes[0];
      if (!chosen) {
        process.exit(1);
      }
      process.stdout.write(chosen);
    ' "$ROOT_DIR/app.json"
)"

if [[ -z "$SCHEME_NAME" ]]; then
  echo "Unable to determine the Xcode scheme name."
  exit 1
fi

ARCHIVE_PATH="$BUILD_DIR/$SCHEME_NAME.xcarchive"
DERIVED_DATA_PATH="$BUILD_DIR/DerivedData"

echo "Building archive for scheme: $SCHEME_NAME"
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  clean archive \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER=""

APP_PATH="$(find "$ARCHIVE_PATH/Products/Applications" -maxdepth 1 -name '*.app' | head -n 1)"

if [[ -z "$APP_PATH" ]]; then
  echo "No .app bundle was found in the Xcode archive."
  exit 1
fi

PACKAGE_DIR="$BUILD_DIR/package"
IPA_PATH="$ARTIFACT_DIR/$SCHEME_NAME-unsigned.ipa"

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/Payload"
cp -R "$APP_PATH" "$PACKAGE_DIR/Payload/"

(
  cd "$PACKAGE_DIR"
  zip -qry "$IPA_PATH" Payload
)

echo "Unsigned IPA created at: $IPA_PATH"
