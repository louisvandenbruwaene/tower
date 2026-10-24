#!/bin/bash
# Puts Tower Power in /Applications as a real Mac app (app/TowerPower.swift: a window with a web view running index.html),
# so it gets its own Dock icon and can be kept in the Dock. The game folder path is baked in: re-run this if the folder moves.
# Game edits need no reinstall. The first build also carries the saves over from Brave, where the game used to run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-/Applications}/Tower Power.app"
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -o "$APP/Contents/MacOS/TowerPower" "$ROOT/app/TowerPower.swift"
cp "$ROOT/app/icon.icns" "$APP/Contents/Resources/icon.icns"
cat > "$APP/Contents/Info.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Tower Power</string>
  <key>CFBundleDisplayName</key><string>Tower Power</string>
  <key>CFBundleIdentifier</key><string>eu.vandenbruwaene.tower-power</string>
  <key>CFBundleExecutable</key><string>TowerPower</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>2.0</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>GamePath</key><string>$ROOT</string>
</dict></plist>
PL
# the saves from Brave's local storage (tower-* keys of file:// pages), newest write wins; set in the app only where it has none yet
python3 - "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/Default/Local Storage/leveldb" "$APP/Contents/Resources/seed.js" <<'PY'
import sys,os,re,json
src,out=sys.argv[1:];saves={}
if os.path.isdir(src):
    for f in sorted(os.listdir(src)):
        if f.endswith(('.log','.ldb')):
            for m in re.finditer(rb'_file://\x00\x01(tower-[a-z0-9-]+).{1,3}?\x01([ -~]{1,4000}?)(?=[^ -~]|$)',open(os.path.join(src,f),'rb').read(),re.S):
                saves[m.group(1).decode()]=m.group(2).decode()
if saves:
    open(out,'w').write("(()=>{try{if(localStorage.getItem('tower-migrated'))return;const s=%s;for(const k in s)if(localStorage.getItem(k)===null)localStorage.setItem(k,s[k]);localStorage.setItem('tower-migrated','1')}catch(e){}})()"%json.dumps(saves))
    print('saves carried over:',', '.join(f'{k}={v[:40]}' for k,v in saves.items()))
PY
codesign --force -s - "$APP" 2>/dev/null || true
touch "$APP"
echo "installed: $APP"
