---
phase: 07-pipeline-wiring-deletion
plan: 01
subsystem: cleanup-pipeline
tags: [command, pipeline, deletion, integration]
dependency_graph:
  requires: [scanner, modal, settings]
  provides: [cleanup-command, executeCleanup]
  affects: [main.ts]
tech_stack:
  added: []
  patterns: [extracted-pipeline-function, skip-and-continue-errors, ENOENT-guard]
key_files:
  created:
    - tests/main-cleanup.test.ts
  modified:
    - src/main.ts
decisions:
  - Extracted executeCleanup(app, settings) as exported function for testability
  - Used vi.mock('obsidian') with class extension to track Notice constructor calls in tests
metrics:
  duration_seconds: 267
  completed: "2026-04-11T06:43:38Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 13
  test_passed: 13
---

# Phase 7 Plan 1: Pipeline Wiring & Deletion Summary

Vault-wide "Clean unused attachments" command registered with callback, wiring scan -> modal -> delete pipeline with ENOENT .trash guard and skip-and-continue error resilience.

## What Was Done

### Task 1: Implement cleanup command and deletion pipeline in main.ts (TDD)

**RED:** Created 13 failing tests in `tests/main-cleanup.test.ts` covering scan/modal wiring, both deletion methods, ENOENT guard, error resilience, and all three Notice message formats. Committed as `test(07-01)`.

**GREEN:** Implemented `executeCleanup(app, settings)` as an exported async function in `src/main.ts`. Registered the cleanup command with `callback` (not `editorCallback`). Pipeline: `scanOrphanedAttachments` -> `showCleanupModal` -> deletion loop with try-catch per file. All 13 tests pass.

Key implementation details:
- `vault.trash(file, false)` for trash method (never `true` per T-07-01)
- `vault.delete(file)` for permanent delete method
- `.trash` folder pre-created via `getAbstractFileByPath` null check before deletion loop (T-07-02)
- Individual file failures caught and counted, remaining files still processed (T-07-03)
- Three Notice formats: full success, partial failure, all-failed
- Progress Notice shown during deletion, hidden before result Notice
- Outer try-catch for unexpected pipeline errors

### Task 2: Create cleanup pipeline unit tests

13 test cases organized in 4 describe blocks:
1. **Scan and modal wiring** (3 tests): correct args to scanner, orphans passed to modal, null cancel path
2. **Deletion methods** (2 tests): vault.trash(file, false) and vault.delete(file) called correctly
3. **ENOENT guard** (3 tests): .trash created when missing, skipped when exists, skipped for delete method
4. **Error resilience** (2 tests): continues after individual failure, logs file path to console.error
5. **Result Notice messages** (3 tests): full success, partial failure, all-failed message formats

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Notice mock approach in tests**
- **Found during:** Task 1 GREEN phase
- **Issue:** `vi.spyOn(obsidianModule, 'Notice')` replaces the class with a plain function, causing `new Notice()` to throw "is not a constructor"
- **Fix:** Used `vi.mock('obsidian')` with `vi.importActual` and class extension to create a `MockNotice` subclass that tracks constructor calls while remaining `new`-compatible
- **Files modified:** tests/main-cleanup.test.ts

## Verification Results

- `npx vitest run tests/main-cleanup.test.ts` -- 13/13 passed
- `npx vitest run` -- 142/142 passed (zero regressions across 5 test files)
- Command ID `clean-unused-attachments` present in src/main.ts
- Uses `callback:` (not editorCallback) for cleanup command
- `vault.trash(file, false)` -- never uses `true`
- `createFolder('.trash')` ENOENT guard present
- All three Notice message formats present

## Known Stubs

None -- all pipeline paths are fully wired to real module imports.

## Self-Check: PASSED

All files exist, all commits verified.
