#!/bin/bash
set -euo pipefail

# Usage: ./scripts/inject-dmg-readme.sh <dmg-path> <readme-path>
# Injects a README.txt into an existing DMG while preserving its layout.

DMG_PATH="$1"
README_PATH="$2"

if [ ! -f "$DMG_PATH" ]; then
  echo "Error: DMG not found at $DMG_PATH" >&2
  exit 1
fi

if [ ! -f "$README_PATH" ]; then
  echo "Error: README not found at $README_PATH" >&2
  exit 1
fi

RW_DMG="$(mktemp /tmp/rw-dmg-XXXXXX).dmg"
MOUNT_DIR="$(mktemp -d /tmp/dmg-mount-XXXXXX)"

cleanup() {
  hdiutil detach "$MOUNT_DIR" 2>/dev/null || true
  rm -f "$RW_DMG"
  rmdir "$MOUNT_DIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "Converting DMG to read-write format..."
hdiutil convert "$DMG_PATH" -format UDRW -o "$RW_DMG" -quiet

echo "Mounting DMG..."
hdiutil attach "$RW_DMG" -mountpoint "$MOUNT_DIR" -quiet

echo "Adding README.txt..."
cp "$README_PATH" "$MOUNT_DIR/README.txt"

echo "Unmounting DMG..."
hdiutil detach "$MOUNT_DIR" -quiet

echo "Converting back to compressed read-only format..."
hdiutil convert "$RW_DMG" -format UDZO -o "$DMG_PATH" -ov -quiet

echo "Done: README.txt injected into $DMG_PATH"
