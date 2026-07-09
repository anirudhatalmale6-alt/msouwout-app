#!/usr/bin/env bash
# Launch smoke test. Runs against a booted emulator (see android-smoke-test.yml).
#
# Fails if the app crashes on launch, dies shortly after, or never reaches the
# WebView. Written after the 1.1.3 launch crash, which shipped because nobody
# ever opened the app on an Android 12-or-older device before release.
#
# Usage: scripts/smoke-test.sh <path-to-apk>

set -uo pipefail

APK="${1:?usage: smoke-test.sh <apk>}"
APP_ID="${APP_ID:-com.haitibiznis.msouwout}"
ACTIVITY="${ACTIVITY:-com.msouwout.app.MainActivity}"
SETTLE_SECONDS=20

fail() { echo "SMOKE TEST FAILED: $*" >&2; dump_logcat; exit 1; }

dump_logcat() {
  adb logcat -d > logcat-full.txt 2>/dev/null || true
  echo
  echo "---------- crash trace ----------"
  grep -A 40 -E "FATAL EXCEPTION|beginning of crash" logcat-full.txt 2>/dev/null | head -60 \
    || echo "(no FATAL EXCEPTION block in logcat)"
  echo "--------------------------------"
}

adb wait-for-device
echo "Device: $(adb shell getprop ro.build.version.release | tr -d '\r') (API $(adb shell getprop ro.build.version.sdk | tr -d '\r'))"

echo "==> Installing $APK"
adb install -r -t "$APK" || fail "could not install the APK"

# Grant every runtime permission the app declares. This is the worst case for
# the user: someone who taps Allow on every prompt. The 1.1.3 crash only fired
# on Android 13+ when POST_NOTIFICATIONS was granted, so a test that leaves
# permissions denied would have missed it there.
for p in android.permission.POST_NOTIFICATIONS \
         android.permission.ACCESS_FINE_LOCATION \
         android.permission.ACCESS_COARSE_LOCATION; do
  adb shell pm grant "$APP_ID" "$p" >/dev/null 2>&1 && echo "    granted $p" || true
done

adb logcat -c || true

echo "==> Launching $APP_ID/$ACTIVITY"
adb shell am start -W -n "$APP_ID/$ACTIVITY" || fail "am start returned an error"

echo "==> Letting the app settle for ${SETTLE_SECONDS}s"
sleep "$SETTLE_SECONDS"

adb logcat -d > logcat-full.txt 2>/dev/null || true

# 1. Did it crash?
if grep -qE "FATAL EXCEPTION" logcat-full.txt; then
  if grep -q "$APP_ID" logcat-full.txt; then
    fail "app crashed on launch (FATAL EXCEPTION)"
  fi
fi

if grep -q "Force finishing activity $APP_ID" logcat-full.txt; then
  fail "system force-finished the activity (crash)"
fi

# 2. Is the process still alive?
PID="$(adb shell pidof "$APP_ID" 2>/dev/null | tr -d '\r')"
if [ -z "$PID" ]; then
  # pidof is missing or silent on some older images; fall back to the process list.
  PID="$(adb shell ps -A 2>/dev/null | grep "$APP_ID" | head -1 | awk '{print $2}' | tr -d '\r')"
fi
[ -n "$PID" ] || fail "process is not running ${SETTLE_SECONDS}s after launch (it died)"
echo "    process alive, pid $PID"

# 3. Is our activity actually the one on screen?
RESUMED="$(adb shell dumpsys activity activities 2>/dev/null | grep -E "mResumedActivity|topResumedActivity" | head -1 | tr -d '\r')"
case "$RESUMED" in
  *"$APP_ID"*) echo "    foreground activity is ours" ;;
  *) fail "our activity is not in the foreground (got: ${RESUMED:-nothing})" ;;
esac

# 4. Did the WebView actually load? A Capacitor app that shows a white screen is
#    just as broken as one that crashes, and the process check above won't catch it.
if grep -qE "Capacitor.*(Loading app|App loaded|Starting BridgeActivity)" logcat-full.txt; then
  echo "    Capacitor WebView loaded"
elif grep -q "chromium" logcat-full.txt; then
  echo "    WebView started (chromium present in log)"
else
  fail "no sign the WebView ever loaded - likely a white screen"
fi

# 5. Anything from our own package that looks like an unhandled error.
if grep -E "AndroidRuntime.*$APP_ID" logcat-full.txt | grep -qv "^$"; then
  echo "WARNING: AndroidRuntime mentioned our package:"
  grep -E "AndroidRuntime.*$APP_ID" logcat-full.txt | head -5
fi

echo
echo "SMOKE TEST PASSED on API $(adb shell getprop ro.build.version.sdk | tr -d '\r')"
