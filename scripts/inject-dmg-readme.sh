#!/bin/bash
set -euo pipefail

# Usage: ./scripts/inject-dmg-readme.sh <dmg-path> <readme-path>
# Injects a README.txt into an existing DMG and positions it inside the
# Finder window so users can see it on mount.

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
MOUNT_POINT=""

cleanup() {
  if [ -n "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" 2>/dev/null || true
  fi
  rm -f "$RW_DMG"
}
trap cleanup EXIT

echo "Converting DMG to read-write format..."
hdiutil convert "$DMG_PATH" -format UDRW -o "$RW_DMG" -quiet

echo "Mounting DMG..."
MOUNT_OUTPUT=$(hdiutil attach "$RW_DMG" -nobrowse -noautoopen)
MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | awk -F'\t' '/\/Volumes\//{print $NF}' | tail -1)
VOLUME_NAME=$(basename "$MOUNT_POINT")
echo "Mounted as: $VOLUME_NAME at $MOUNT_POINT"

echo "Adding README.txt..."
cp "$README_PATH" "$MOUNT_POINT/README.txt"

echo "Setting Finder layout..."
osascript <<APPLESCRIPT
tell application "Finder"
  tell disk "$VOLUME_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {400, 200, 1100, 650}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 96
    try
      set position of item "Payment Clock.app" of container window to {170, 180}
    end try
    try
      set position of item "Applications" of container window to {530, 180}
    end try
    try
      set position of item "README.txt" of container window to {350, 330}
    end try
    update without registering applications
    delay 2
    close
  end tell
end tell
APPLESCRIPT

sync

echo "Unmounting DMG..."
hdiutil detach "$MOUNT_POINT" -quiet
MOUNT_POINT=""

echo "Converting back to compressed read-only format..."
hdiutil convert "$RW_DMG" -format UDZO -o "$DMG_PATH" -ov -quiet

echo "Done: README.txt injected into $DMG_PATH"
