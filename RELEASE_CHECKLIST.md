# MsouWout release checklist

Nothing goes to the client, App Store Connect, or Google Play until every box
below is ticked. Written 2026-07-09 after the 1.1.3 launch crash reached closed
testers.

The rule that matters: **a build that has not been launched on a device does not
count as tested.** Compiling is not testing.

---

## 1. Automated gate (must be green, no exceptions)

- [ ] `Android Smoke Test` workflow green on **all six** API levels:
      24 (7.0), 28 (9), 30 (11), 33 (13), 34 (14), 35 (15).
      This installs the APK, grants every runtime permission, launches the app,
      and fails on crash / early death / white screen.
- [ ] `iOS Smoke Test` workflow green on iPhone 16 Pro, iPhone 15 and iPhone SE.
      Same idea: it opens the app on a simulator and fails on a crash or a
      white screen.
- [ ] `Android Build` workflow green, APK **and** AAB produced and signed.

Reading the results: for a `workflow_dispatch` run, `gh run list` prints the
**branch head** SHA, not the ref that was checked out. Open the run and read the
"Checkout" step before concluding that a commit is broken.

If the smoke test is red on even one API level, the build does not ship. Do not
"fix it in the next one."

## 2. Artifact inspection (catches what the emulator can't)

- [ ] `versionCode` incremented, `versionName` bumped.
- [ ] APK/AAB signed with the **same upload key** as the previous release
      (`META-INF/*.RSA` present in the AAB; `APK Sig Block 42` in the APK).
- [ ] No unexpected SDK linked in. Specifically: if the app does not have a
      configured Firebase project, `FirebaseApp` / `FirebaseMessaging` /
      `FirebaseInitProvider` must not appear in `classes.dex` or the manifest.
- [ ] Every runtime permission a bundled plugin needs is declared in
      `AndroidManifest.xml`. Plugins do **not** all ship their own manifest —
      `@capacitor/geolocation` ships an empty one.
- [ ] No plugin is compiled in that the app does not actually use. An unused
      plugin is not free: it drags in its SDK, its permissions, and its crashes.

## 3. Core features, exercised by hand on one device

Not "the screen opens" — the flow completes.

- [ ] App launches from a cold start (force-stop first, then tap the icon).
- [ ] Customer login with the demo account (phone `0000 0000`).
- [ ] Driver login with the demo account (phone `0000 0000`, PIN `0000`).
- [ ] Logistics board loads with tracking code `MW-DEMO`.
- [ ] "Vin Chofe" / "Register Your Fleet" open **inside** the app, not in an
      external browser. (This was an Apple 4.0 rejection.)
- [ ] WhatsApp / tel / mailto links hand off to the system app correctly.
- [ ] Hardware back button behaves (does not exit from a nested page).
- [ ] Delete-my-account works from both customer and driver login screens.
      (Apple requires this; its absence is an automatic rejection.)
- [ ] Airplane mode: the app shows something, not a blank white screen.

## 4. Store requirements, before pressing Submit

### Apple

- [ ] Demo credentials filled in on the App Review Information screen, and they
      actually work on the submitted build.
- [ ] No API is called that the app is not entitled to use. If the binary calls
      `registerForRemoteNotifications()` there **must** be an `aps-environment`
      entitlement, or review rejects it under Guideline 2.1 App Completeness.
- [ ] Account deletion reachable from inside the app.
- [ ] No links that eject the user to Safari for core flows (Guideline 4.0).
- [ ] Screenshots match what the app actually looks like now.
- [ ] Support URL and Marketing URL both resolve.

### Google Play

- [ ] `versionCode` is higher than anything ever uploaded to that track.
- [ ] Target API level meets Play's current minimum.
- [ ] Every declared permission is actually used, and each has a justification
      ready if Play asks. Remove the ones nothing uses.
- [ ] Data safety form still matches what the app collects (location!).

## 5. After submission

- [ ] Record the build number and what changed, in the GitHub release notes.
- [ ] Tell the client which build the testers should be on, so they don't
      report bugs against the previous one.

---

## Post-mortem log

Every bug that reached the client goes here, with the check that now prevents it.

| Date | Bug | Why it escaped | New gate |
|------|-----|----------------|----------|
| 2026-07-09 | Crash on launch, all Android ≤12 and any Android 13+ user who allowed notifications (1.1.3) | Build was never launched on an Android device before shipping. Compiling was mistaken for testing. | §1 smoke test on six API levels, permissions pre-granted |
| 2026-07-09 | GPS never worked on tracking/logistics screens | Assumed the Geolocation plugin declared its own permissions. It ships an empty manifest. | §2 permission audit against bundled plugins |
| 2026-07-09 | msouwout-backend down; the client found it, not us | Nothing was monitoring anything | `msouwout-uptime` repo: probes every 15 min, opens an issue on outage |
| 2026-07-09 | The new uptime monitor reported a green run during a real outage | `script \| tee` returns tee's exit code, hiding the failure | `set -o pipefail` in any workflow step that pipes a failing script |
| 2026-07-07 | Apple 4.0: "Become a Driver" opened Safari | External links not checked before submitting | §3 in-app link check |
| 2026-07-06 | Apple 2.1: reviewer had no accounts to log in with | Demo credentials never provided | §4 demo credentials verified on the submitted build |
