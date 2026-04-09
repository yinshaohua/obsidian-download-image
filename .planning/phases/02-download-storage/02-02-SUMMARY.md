---
phase: 02-download-storage
plan: 02
subsystem: downloader-tests
tags: [tdd, unit-tests, pure-functions, downloader]
dependency_graph:
  requires: [02-01]
  provides: [downloader-test-coverage]
  affects: [src/downloader.ts, tests/downloader.test.ts]
tech_stack:
  added: [vitest-alias-mock]
  patterns: [obsidian-module-stub, tdd-pure-helpers]
key_files:
  created:
    - tests/downloader.test.ts
    - tests/__mocks__/obsidian.ts
  modified:
    - src/downloader.ts
    - vitest.config.ts
decisions:
  - "Export pure helpers (isValidImageContentType, deriveFilenameFromUrl, deriveFilenameFromBase64, decodeBase64Image, MIME_TO_EXT) from downloader.ts for testability"
  - "Stub obsidian module via vitest alias to isolate pure helpers from Obsidian runtime dependency"
  - "Use vitest resolve.alias to map 'obsidian' -> tests/__mocks__/obsidian.ts rather than __mocks__ auto-discovery (more explicit)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-10"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 4
---

# Phase 02 Plan 02: Downloader Pure Helper Unit Tests Summary

**One-liner:** 34-case unit test suite for downloader pure helpers (D-01 through D-14) with obsidian module stub via vitest alias.

## What Was Built

Comprehensive unit tests for the four pure helper functions in `src/downloader.ts` that encode critical business rules for filename derivation, MIME handling, Content-Type validation, and base64 decoding.

### Test Coverage

| Describe Block | Tests | Decisions Covered |
|---|---|---|
| `isValidImageContentType (D-08)` | 12 | D-08 |
| `deriveFilenameFromUrl (D-01, D-02)` | 8 | D-01, D-02 |
| `deriveFilenameFromBase64 (D-03)` | 4 | D-03 |
| `decodeBase64Image (D-13, D-14)` | 6 | D-13, D-14 |
| `MIME_TO_EXT coverage` | 4 | — |
| **Total** | **34** | D-01, D-02, D-03, D-08, D-13, D-14 |

### Files Changed

- **`src/downloader.ts`** — Added `export` keyword to 4 pure helper functions and `MIME_TO_EXT` constant
- **`tests/downloader.test.ts`** — 34 test cases, 186 lines, decision ID traceability throughout
- **`tests/__mocks__/obsidian.ts`** — Minimal stub exporting `App`, `Platform`, `requestUrl`, `normalizePath` as no-ops
- **`vitest.config.ts`** — Added `resolve.alias` mapping `obsidian` -> stub file

## Decisions Made

1. **Export pure helpers for testability:** The 4 pure functions and `MIME_TO_EXT` were not exported in 02-01 (by design — only the public API `downloadImages` was exported). Added `export` keyword without changing any logic.

2. **Obsidian module stub via vitest alias:** `downloader.ts` imports `App`, `Platform`, `requestUrl`, `normalizePath` from `'obsidian'`. Since pure helper functions under test never call these at runtime, a minimal stub is sufficient. Used `resolve.alias` in vitest config for explicit, maintainable mapping.

3. **No `__mocks__` auto-discovery:** Chose explicit alias over Jest-style `__mocks__` directory auto-discovery — more transparent and works consistently with vitest's module resolution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added obsidian module stub for vitest**

- **Found during:** Task 1 (first test run)
- **Issue:** `src/downloader.ts` imports from `'obsidian'` which has no `main`/`module` entry in its package.json (it's an Obsidian-internal package). vitest in node environment cannot resolve it.
- **Fix:** Created `tests/__mocks__/obsidian.ts` with minimal stubs for `App`, `Platform`, `requestUrl`, `normalizePath`. Updated `vitest.config.ts` to add `resolve.alias` pointing `obsidian` to the stub.
- **Files modified:** `tests/__mocks__/obsidian.ts` (created), `vitest.config.ts` (updated)
- **Commit:** `1cf6731`

**2. [Rule 1 - Bug] Corrected PNG byte length assertion (68 -> 70)**

- **Found during:** Task 1 (test run)
- **Issue:** Plan comment stated "68 bytes decoded" for the 1x1 PNG pixel, but actual decoded size is 70 bytes.
- **Fix:** Updated assertion `toBe(68)` -> `toBe(70)` to match actual output.
- **Files modified:** `tests/downloader.test.ts`
- **Commit:** `1cf6731`

**3. [Rule 1 - Bug] Replaced invalid JPEG base64 test data**

- **Found during:** Task 1 (test run)
- **Issue:** The JPEG base64 string used in the test was malformed — `atob()` threw `InvalidCharacterError`.
- **Fix:** Replaced with a valid 1x1 white pixel JPEG base64 data URI.
- **Files modified:** `tests/downloader.test.ts`
- **Commit:** `1cf6731`

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run` (downloader only) | 34/34 passed |
| `npx vitest run` (full suite) | 62/62 passed (parser 28 + downloader 34) |
| `npx tsc --noEmit --skipLibCheck` | Exit 0, no errors |
| tests/downloader.test.ts line count | 186 lines (>120 required) |
| describe blocks | 5 blocks (>4 required) |
| test cases | 34 cases (>25 required) |
| Decision IDs referenced | D-01, D-02, D-03, D-08, D-13, D-14 |

## Known Stubs

None — all test data is concrete; no placeholder values flow to UI rendering.

## Self-Check: PASSED
