---
phase: 03-document-update-settings
plan: 02
subsystem: testing
tags: [unit-tests, replacer, naming-strategy, vitest]
dependency_graph:
  requires: [03-01]
  provides: [test-coverage-replacer, test-coverage-naming-strategy]
  affects: []
tech_stack:
  added: []
  patterns: [factory-helpers-for-test-fixtures, content-addressable-hash-verification]
key_files:
  created:
    - tests/replacer.test.ts
  modified:
    - tests/downloader.test.ts
    - tests/__mocks__/obsidian.ts
decisions:
  - Used factory helper functions (okResult, failedResult, mdRef, wikiRef, htmlRef) for readable test fixtures
  - Fixed pre-existing regex bug in deriveFilenameFromUrl tests (shortHash produces base36, not digits-only)
metrics:
  duration: 2 min
  completed: "2026-04-10T18:15:00Z"
  tasks: 1
  files: 3
  tests_added: 24
requirements:
  - DOC-01
  - DOC-02
  - UI-03
  - UI-04
---

# Phase 3 Plan 2: Replacer and Naming Strategy Unit Tests Summary

Comprehensive unit tests for the replacer module (isInsideCodeBlock, buildReplacementMap, applyReplacements) and deriveFilenameWithStrategy covering all three naming strategies with content-addressability verification.

## What Was Done

### tests/replacer.test.ts (18 tests - new file)

**isInsideCodeBlock (7 tests):** Verified positions inside backtick-fenced blocks, tilde-fenced blocks, inline code all return true; positions outside, before, and after code blocks return false.

**buildReplacementMap (8 tests):** Verified Markdown images produce `![alt](local/path)` replacements, wiki images produce `![[local/path]]`, HTML img tags get src attribute updated. Failed results produce no entries. Code block and inline code references are skipped. Multiple occurrences generate multiple entries. Output is sorted by index descending.

**applyReplacements (3 tests):** Single replacement, multiple replacements in end-to-start order, and empty array returning unchanged content.

### tests/downloader.test.ts (6 new tests)

**deriveFilenameWithStrategy:** Strategy 'original' matches deriveFilenameFromUrl for HTTP and deriveFilenameFromBase64 for base64. Strategy 'timestamp' produces YYYYMMDD-HHMMSS prefix pattern. Strategy 'hash' produces 8-char base36 hash with extension, same content yields same filename (content-addressable), different content yields different filename.

### tests/__mocks__/obsidian.ts (updated)

Added stubs for PluginSettingTab, Setting, Plugin, Notice, Editor, MarkdownView to support the full import chain: replacer -> downloader -> settings -> main -> obsidian.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing regex patterns in deriveFilenameFromUrl tests**
- **Found during:** Test execution
- **Issue:** Two existing tests used `/^image-\d+\./` but shortHash() produces base36 strings containing letters, not just digits
- **Fix:** Changed regex to `/^image-[a-z0-9]+\./` to match actual base36 output
- **Files modified:** tests/downloader.test.ts
- **Commit:** 6dd5d5f

## Verification Results

- `npx vitest run` exits 0 -- all 86 tests pass (3 test files)
- `npx vitest run tests/replacer.test.ts` -- 18 tests pass
- `npx vitest run tests/downloader.test.ts` -- 40 tests pass (34 existing + 6 new)
- Test count: 24 new test cases (18 replacer + 6 naming strategy)

## Known Stubs

None -- all tests use concrete assertions against real implementations.

## Commits

| Hash | Description |
|------|-------------|
| 6dd5d5f | test(03-02): add replacer unit tests and naming strategy coverage |

## Self-Check: PASSED

All files exist, all commits verified.
