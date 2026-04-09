---
phase: 02-download-storage
fixed_at: 2026-04-10T01:24:00Z
review_path: .planning/phases/02-download-storage/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-04-10T01:24:00Z
**Source review:** .planning/phases/02-download-storage/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Silent result loss in downloadImages when Promise.allSettled rejects

**Files modified:** `src/downloader.ts`
**Commit:** 91d36ba
**Applied fix:** Wrapped `downloadOneWithRetry` call inside `batch.map` in a try/catch so the promise always resolves with a `DownloadResult`. The inner catch constructs a synthetic failed result preserving the `ref`, making the `'rejected'` branch of `Promise.allSettled` unreachable. This guarantees the output array always has the same length as the input `refs` array.

### WR-02: Timer leak in fetchWithTimeout

**Files modified:** `src/downloader.ts`
**Commit:** a2b355b
**Applied fix:** Stored the `setTimeout` ID in a variable and added a `try/finally` block around the `Promise.race` call that clears the timer via `clearTimeout` regardless of outcome. This prevents dangling 30-second timers from accumulating when downloads complete before the timeout fires.

### WR-03: Missing error handling around downloadImages in command handler

**Files modified:** `src/main.ts`
**Commit:** 86dade3
**Applied fix:** Wrapped the `downloadImages` call and result processing in a try/catch block. On success, shows a `Notice` with download/failure counts (replacing the previous `console.log`). On unexpected error, logs to `console.error` and shows a user-facing `Notice` explaining the failure. This also addresses IN-01 (console.log in production) as a side effect.

### WR-04: isValidImageContentType does not parse parameters for octet-stream

**Files modified:** `src/downloader.ts`
**Commit:** e1f2800
**Applied fix:** Changed the Content-Type normalization from `contentType.toLowerCase()` to `contentType.toLowerCase().split(';')[0].trim()`, which strips MIME parameters before comparison. This ensures values like `application/octet-stream; charset=binary` are correctly recognized. The `image/*` check via `startsWith` was already immune to parameters, so this change only affects the `application/octet-stream` equality check.

---

_Fixed: 2026-04-10T01:24:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
