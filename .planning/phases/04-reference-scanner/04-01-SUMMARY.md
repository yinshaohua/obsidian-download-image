---
phase: 04-reference-scanner
plan: 01
subsystem: scanner
tags: [scanner, orphan-detection, metadata-cache, canvas, tdd]
dependency_graph:
  requires: []
  provides: [OrphanedFile, scanOrphanedAttachments]
  affects: [phase-05-settings, phase-06-modal, phase-07-wiring]
tech_stack:
  added: []
  patterns: [pure-module-functions, tdd-red-green, vitest-unit-tests, mock-instanceof-check]
key_files:
  created:
    - src/scanner.ts
    - tests/scanner.test.ts
  modified:
    - tests/__mocks__/obsidian.ts
decisions:
  - "Fixed waitForCache TDZ bug: changed const ref to let ref so the variable is initialized before the callback can fire synchronously"
  - "Task 2 executed before Task 1 GREEN phase: TFile mock was required for scanner tests to pass"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
requirements:
  - SCAN-01
  - SCAN-03
  - SCAN-04
  - SCAN-05
---

# Phase 4 Plan 1: Reference Scanner Module Summary

**One-liner:** Pure orphan scanner module with 5-source reference detection (links/embeds/frontmatterLinks/HTML-img/canvas-JSON), MetadataCache readiness guard, and dot-dir exclusion.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing scanner tests | b005f94 | tests/scanner.test.ts |
| 1 (GREEN) | Implement src/scanner.ts | 3ab7ed1 | src/scanner.ts |
| 2 | Extend obsidian mock | c10446c | tests/__mocks__/obsidian.ts |

## What Was Built

### src/scanner.ts

Pure module following the same exported-functions pattern as `parser.ts` and `replacer.ts`. Exports:

- `OrphanedFile` — interface with `file: TFile` and `size: number` for Phase 6 modal display
- `scanOrphanedAttachments(app, exclusions?)` — main async entry point
- `waitForCache(app)` — MetadataCache readiness guard (D-07)
- `buildReferencedSet(app)` — builds complete reference set from all 5 sources
- `collectOrphans(app, referencedPaths, exclusions)` — filters vault files to orphan candidates
- `isDotPrefixedDir(filePath)` — segment-level dot-dir check

**5 Reference Sources (D-05, SCAN-05):**
1. `getFileCache().links` — wikilinks and markdown links
2. `getFileCache().embeds` — `![[...]]` and `![](...)` embeds
3. `getFileCache().frontmatterLinks` — frontmatter link properties
4. HTML `<img src="...">` local paths via regex (invisible to MetadataCache per C5)
5. Canvas JSON `file` nodes via `JSON.parse` (`.canvas` not in `getMarkdownFiles()` per C3)

**Safety properties:**
- Null-guards every `getFileCache()` call (`if (!cache) continue`) per C4
- Uses `vault.cachedRead()` exclusively, never `vault.read()` (D-08)
- try/catch around canvas JSON.parse — silently skips malformed files (T-04-04)
- No calls to `vault.modify`, `vault.delete`, `vault.trash` — strictly read-only (T-04-03)

### tests/__mocks__/obsidian.ts (extended)

Added `TAbstractFile`, `TFile`, `TFolder` classes. `TFile` supports `instanceof TFile` checks used in `buildReferencedSet` for HTML img and canvas source resolution. All prior exports preserved.

### tests/scanner.test.ts

30 unit tests covering:
- `isDotPrefixedDir`: root and nested dot-dirs, normal paths
- `waitForCache`: immediate resolution and event-listener paths
- `scanOrphanedAttachments`: end-to-end with all exclusion rules
- `buildReferencedSet`: each of the 5 reference sources individually
- `collectOrphans`: each skip condition and orphan collection

## Test Results

```
Test Files  4 passed (4)
Tests       116 passed (116)
```

All 116 tests pass (30 new scanner tests + 86 existing tests — no regressions).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed waitForCache temporal dead zone (TDZ) error**
- **Found during:** Task 1 GREEN phase — first test run after creating scanner.ts
- **Issue:** `const ref = app.metadataCache.on('resolved', () => { app.metadataCache.offref(ref); ... })` — the callback fires synchronously in the mock before `ref` is assigned, causing `ReferenceError: Cannot access 'ref' before initialization`
- **Fix:** Changed `const ref` to `let ref` with a separate declaration line so the variable exists in scope when the callback fires
- **Files modified:** src/scanner.ts (lines 39-43)
- **Commit:** 3ab7ed1

**2. [Rule 3 - Blocking] Completed Task 2 mock extension before Task 1 GREEN phase**
- **Found during:** First test run — `TypeError: TFile is not a constructor`
- **Issue:** Task 2 (mock extension) is listed after Task 1 in the plan, but Task 1's tests require `TFile` from the mock to instantiate test fixtures
- **Fix:** Applied Task 2's mock changes before running Task 1's tests again; committed Task 1 implementation first, then Task 2 mock separately as planned
- **Impact:** No plan structure change — tasks remain correctly ordered in commits

## Known Stubs

None. The scanner module is fully implemented with no hardcoded values or placeholder returns.

## Threat Flags

No new security surface introduced. Scanner is strictly read-only — no network access, no file modification, no user input processing beyond the `exclusions` string array which is never passed to file system calls directly (used only for `startsWith` matching against vault-relative paths).

## Self-Check

### Created files exist:
- `src/scanner.ts` — FOUND
- `tests/scanner.test.ts` — FOUND

### Modified files:
- `tests/__mocks__/obsidian.ts` — FOUND

### Commits exist:
- b005f94 — test(04-01): add failing scanner unit tests
- 3ab7ed1 — feat(04-01): implement orphan scanner module
- c10446c — feat(04-01): extend obsidian mock with TFile, TFolder, TAbstractFile

## Self-Check: PASSED
