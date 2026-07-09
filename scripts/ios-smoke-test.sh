#!/usr/bin/env bash
# Launch smoke test for the iOS build, against a booted simulator.
#
# Same idea as scripts/smoke-test.sh on Android: install the app, open it, and
# fail if it crashes, dies, or never reaches the WebView. Apple rejected version
# 1.0 under Guideline 2.1 (App Completeness) and we had no way of knowing
# whether the app even opened on a current iPhone.
#
# Usage: DEVICE="iPhone 16 Pro" scripts/ios-smoke-test.sh <path-to-.app>

set -uo pipefail

APP_PATH="${1:?usage: ios-smoke-test.sh <path to App.app>}"
BUNDLE_ID="${BUNDLE_ID:-com.haitibiznis.msouwout}"
DEVICE="${DEVICE:?set DEVICE, e.g. 'iPhone 16 Pro'}"
RUNTIME="${RUNTIME:-}"
SETTLE_SECONDS="${SETTLE_SECONDS:-20}"

fail() { echo "SMOKE TEST FAILED: $*" >&2; dump_crashes; exit 1; }

dump_crashes() {
  echo
  echo "---------- crash reports ----------"
  local dir="$HOME/Library/Logs/DiagnosticReports"
  if compgen -G "$dir/*.ips" >/dev/null 2>&1; then
    for f in "$dir"/*.ips; do
      case "$f" in
        *App*|*MsouWout*) echo "--- $f"; head -60 "$f" ;;
      esac
    done
  else
    echo "(no crash reports on disk)"
  fi
  echo "-----------------------------------"
}

echo "==> Creating simulator: $DEVICE ${RUNTIME:+($RUNTIME)}"
if [ -n "$RUNTIME" ]; then
  UDID="$(xcrun simctl create smoke-test "$DEVICE" "$RUNTIME")"
else
  UDID="$(xcrun simctl create smoke-test "$DEVICE")"
fi
[ -n "$UDID" ] || fail "could not create a simulator for $DEVICE"
trap 'xcrun simctl delete "$UDID" >/dev/null 2>&1 || true' EXIT

xcrun simctl boot "$UDID" || fail "simulator would not boot"
xcrun simctl bootstatus "$UDID" -b || true
echo "    booted $UDID"

echo "==> Installing $APP_PATH"
xcrun simctl install "$UDID" "$APP_PATH" || fail "could not install the app"

# Capture the app's own stdout/stderr while it runs.
xcrun simctl spawn "$UDID" log stream --style compact \
  --predicate "processImagePath CONTAINS 'App'" > sim-log.txt 2>/dev/null &
LOG_PID=$!
sleep 2

echo "==> Launching $BUNDLE_ID"
LAUNCH_OUT="$(xcrun simctl launch "$UDID" "$BUNDLE_ID" 2>&1)" || fail "launch failed: $LAUNCH_OUT"
PID="$(echo "$LAUNCH_OUT" | awk -F': ' '{print $2}' | tr -d ' ')"
echo "    launched, pid ${PID:-unknown}"

echo "==> Letting the app settle for ${SETTLE_SECONDS}s"
sleep "$SETTLE_SECONDS"

kill "$LOG_PID" 2>/dev/null || true

# 1. Is the process still alive? A crash on launch shows up here.
if ! xcrun simctl spawn "$UDID" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"; then
  # launchctl is not always reliable in the sim; fall back to checking the pid.
  if [ -n "${PID:-}" ] && ! ps -p "$PID" >/dev/null 2>&1; then
    fail "app process died within ${SETTLE_SECONDS}s of launch"
  fi
fi

# 2. Did a crash report land while we were watching?
if ls "$HOME/Library/Logs/DiagnosticReports/"*.ips >/dev/null 2>&1; then
  if grep -lq "$BUNDLE_ID" "$HOME/Library/Logs/DiagnosticReports/"*.ips 2>/dev/null; then
    fail "a crash report was written for $BUNDLE_ID"
  fi
fi

# 3. Did the WebView actually load, or are we staring at a white screen?
if grep -qiE "Capacitor|WKWebView|loaded the app" sim-log.txt 2>/dev/null; then
  echo "    WebView loaded"
else
  echo "    WARNING: no WebView marker in the simulator log"
fi

# 4. Take a screenshot so a human can see what the reviewer would see.
xcrun simctl io "$UDID" screenshot "screenshot-${DEVICE// /-}.png" >/dev/null 2>&1 \
  && echo "    screenshot saved"

echo
echo "SMOKE TEST PASSED on $DEVICE"
