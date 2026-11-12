# ContextCam implementation plan

## Goal

Address the remaining reliability, platform, privacy, and feature-accuracy issues found in the project audit while preserving the existing camera scan, image upload, OCR, mode detection, Gemini analysis, history, and settings flows.

The Expo dependency update is complete: `npx expo install --check` reported that dependencies are up to date. The project is on Expo SDK 56 (`expo` `~56.0.24`). This plan does not treat the dependency alignment as a substitute for validating native builds.

## Priorities

### P0 — Make the device OCR workflow explicit and verifiable

**Current state:** `react-native-text-recognition` is a native module. The app’s runtime guard detects when it is absent; plain Expo Go does not include it. Consequently, the app can use the cloud OCR path in Expo Go when online and configured, but its local native OCR fallback cannot work there.

**Implementation:**

1. Keep Expo managed tooling and create a development build containing the native OCR module; do not eject to bare React Native solely to load this dependency.
2. Before rebuilding the checked-in Android project, inspect its native changes and determine whether it is managed by Expo Continuous Native Generation (CNG) or maintained manually. Avoid `prebuild --clean` until native customizations and generated files are understood.
3. Build and install Android development client, then verify camera permission/capture, OCR online, OCR offline, and the missing-module error in Expo Go.
4. Verify the OCR package builds and works with this project’s React Native version and architecture. If not, replace it with a maintained native OCR implementation or an Expo module that supports the target platforms.
5. There is no checked-in `ios/` directory. Build iOS using EAS or a Mac with Xcode, and verify the same flows on a physical device.

**Acceptance:** Android and iOS development builds can capture an image and perform local OCR without a network connection; Expo Go does not crash and reports that native OCR requires a development build.

### P1 — Correct web confirmations and protect history actions

**Affected:** `src/app/history.js`, `src/app/settings.js`, `src/utils/storageService.js`.

**Current problem:** `Alert.alert` is a no-op on React Native Web. Delete/clear confirmations and expiry warnings therefore do not appear in the browser. Expired scans can be pruned while the user never sees the warning.

**Implementation:**

- Replace direct `Alert.alert` use with a shared cross-platform confirmation/dialog pattern, or provide an explicit web dialog and retain native alerts elsewhere.
- Ensure expiry warnings are shown before pruning when the retention contract promises a warning. Make warning dismissal state deliberate so revisiting History does not repeatedly show the same warning.
- Keep destructive actions guarded by a working confirmation on every platform.

**Acceptance:** On web, iOS, and Android, delete and clear actions require confirmation; an eligible expiry warning is shown before deletion, and dismissing it does not mark the scan exported.

### P1 — Implement the promised PDF export and retention behavior

**Affected:** `src/app/history.js`, `src/utils/storageService.js`, `README.md`.

**Current problem:** The “PDF” action only marks a scan `backedUp`; it does not create or save a PDF. The 30-day pruning logic deletes backed-up scans too.

**Implementation:**

- Choose a real cross-platform export mechanism that can create/share a PDF on mobile and web; keep the existing action’s purpose and user-facing label only if it really exports.
- Mark a scan backed up only after export succeeds. Surface failures to the user.
- Define whether a successfully exported scan remains in history. If the feature promises that it will, exempt backed-up scans from pruning; otherwise revise the retention and UI text to avoid promising preservation.
- Update README feature descriptions to match the delivered behavior.

**Acceptance:** Export produces a usable PDF containing the selected scan’s text/analysis on supported platforms, failure is reported, and verified exports follow the documented retention policy.

### P1 — Remove the Gemini API key from client builds

**Affected:** `src/utils/geminiService.js`, `src/utils/ocrService.js`, app configuration and deployment setup.

**Current problem:** `EXPO_PUBLIC_GEMINI_API_KEY` is embedded into web and native client bundles. Public environment variables are not secret, so users can extract and misuse this key.

**Implementation:**

- Route Gemini OCR and analysis through a small authenticated backend/proxy that stores the key server-side.
- Add basic abuse controls (request limits, payload limits, and appropriate authentication) and avoid logging image or document contents.
- Update client error handling for backend errors and remove the API secret from client configuration.
- If a backend is deferred, document that the key is exposed and configure provider-side restrictions/quotas as a temporary mitigation, not as the final secret-management solution.

**Acceptance:** Production client bundles contain no Gemini secret; OCR/analysis still work through the service; backend failures are visible without exposing sensitive request data.

### P1 — Make storage failures distinguishable from empty history

**Affected:** `src/utils/storageService.js`, `src/app/history.js`, `src/app/settings.js`.

**Current problem:** Storage read/parse errors become an empty array or zero count. The UI can incorrectly report “No scans yet” after a storage failure. Parsing checks only that the top-level value is an array, not that its elements are valid scan records.

**Implementation:**

- Validate loaded records (required fields and valid timestamps/IDs) and decide how malformed records are recovered without silently treating the whole store as empty.
- Return or throw a distinct storage error for read failures; keep empty history as a separate successful result.
- Render a retryable error state in History and an appropriate error indication in Settings.
- Keep save/delete/clear failures explicit and do not show success toasts when writes fail.

**Acceptance:** Empty storage displays the empty state; simulated read/write errors show an error state/message and do not falsely display zero scans or success.

### P2 — Surface OCR failure reasons and handle OCR worker lifecycle

**Affected:** `src/app/index.js`, `src/utils/localOcr.js`, `src/utils/ocrService.js`.

**Current problems:** The scan screen replaces detailed OCR errors with “No readable text found.” The web Tesseract worker is terminated only after successful recognition. Its default worker/language assets may be fetched remotely, so first-use OCR is not guaranteed offline.

**Implementation:**

- Show `ocrResult.error` when OCR fails, retaining a friendly fallback only when no error detail exists.
- Ensure a created Tesseract worker is terminated in a `finally` block even when recognition throws.
- Decide whether web OCR must be available offline. If yes, package/serve worker and language assets locally and test the production web build offline. If not, update the “offline OCR” claim and provide a clear network-required message.
- Keep image upload and native/cloud OCR behavior unchanged apart from clearer errors and safe cleanup.

**Acceptance:** OCR errors identify actionable causes; the browser worker is cleaned up on success and failure; web offline claims match observed behavior.

### P2 — Bound cloud requests and make fallback behavior predictable

**Affected:** `src/utils/geminiService.js`, `src/utils/ocrService.js`, `src/utils/processingService.js`.

**Current problems:** Analysis has a timeout wrapper that does not cancel the underlying request or clear its timer. Gemini OCR has no timeout, so it can leave the scan pending and delay local fallback. Fallback retries currently depend on matching message text.

**Implementation:**

- Add a shared request timeout/cancellation approach for OCR and analysis if supported by the selected SDK; clear timers and do not mistake a timed-out request for a successful response.
- Use structured status/error information where available to decide which failures should retry another model, use local OCR, or be shown to the user. Avoid retrying invalid keys or rate limits across every model.
- Preserve the current fallback order and present clear status/errors for offline, missing key, timeout, rate limit, and unavailable local OCR.

**Acceptance:** Simulated timeout returns within the configured limit, cleans up timers, and triggers the intended fallback; invalid-key/rate-limit errors do not cause unnecessary model retries.

### P2 — Align privacy and product documentation with actual data flow

**Affected:** `README.md`, `src/app/settings.js`, camera/OCR user messaging.

**Current problem:** The README says images are not sent to Gemini, but cloud OCR uploads image data to Gemini. It also describes Firebase ML Kit although the configured package is `react-native-text-recognition`, and implies PDF export/offline OCR behavior that is not currently guaranteed.

**Implementation:**

- Document that cloud OCR transmits the selected image to the configured AI service; provide a clear disclosure and an on-device-only option if product requirements require it.
- Correct the OCR provider, Expo Go/development-build requirements, export behavior, retention rules, and web offline details.
- Ensure privacy language reflects whether requests go directly to Gemini or through a backend after the key migration.

**Acceptance:** README and in-app copy describe the actual providers, network transmission, supported runtimes, retention, and export behavior.

## Recommended execution order

1. Preserve a clean install baseline and verify the existing dependency check.
2. Decide/verify the Android native project workflow; produce an Android development build and test native OCR. Confirm iOS build route.
3. Fix cross-platform destructive confirmations and retention/export semantics before relying on history data.
4. Move Gemini access behind a server-side key boundary.
5. Make storage and OCR failures explicit; add request timeouts and reliable cleanup.
6. Update privacy/product documentation.
7. Run lint/type checks and targeted tests, then verify Android, iOS, Expo Go, and web separately.

## Regression checklist

- Expo Router still opens Camera, History, Settings, and Result routes; no reference to the deleted legacy navigator remains.
- Camera capture remains protected against duplicate presses; web image upload remains available.
- Cloud OCR and local OCR preserve the existing mode detection, Gemini analysis, and result presentation.
- Expo Go remains a supported camera/cloud test client; native OCR limitation is clearly reported.
- Development builds perform offline native OCR on Android and iOS.
- History refreshes on focus; save, export, delete, clear, expiry warning, and retention work as documented on each platform.
- Toasts remain visible on web/iOS and native Android toasts continue working.
- Camera permissions are granted and denied cleanly on real devices.
- Verify app behavior after dependency updates and native rebuilds, not only Metro bundling.
