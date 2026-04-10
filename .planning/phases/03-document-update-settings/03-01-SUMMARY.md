---
phase: 03-document-update-settings
plan: 01
subsystem: settings-downloader-replacer-pipeline
tags: [settings, naming-strategy, concurrency, document-replacement, editor-transaction, progress-notice]
dependency_graph:
  requires: [parser, downloader-core]
  provides: [settings-ui, naming-strategy, configurable-concurrency, document-replacement, full-pipeline]
  affects: [main, downloader, settings]
tech_stack:
  added: []
  patterns: [strategy-pattern-for-naming, index-based-replacement, single-editor-transaction, progress-callback]
key_files:
  created:
    - src/replacer.ts
  modified:
    - src/settings.ts
    - src/downloader.ts
    - src/main.ts
decisions:
  - "NamingStrategy as union type ('original'|'timestamp'|'hash') for type safety"
  - "deriveFilenameWithStrategy wraps existing helpers rather than replacing them"
  - "DownloadOptions is optional parameter with defaults for backward compatibility"
  - "Index-based string replacement (not regex) to avoid injection per T-03-01"
  - "Replacements sorted descending by index for safe in-place application"
  - "Re-read editor.getValue() before replacement to handle edits during download per T-03-05"
metrics:
  duration: "4 minutes"
  completed: "2026-04-10T18:08:35Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 3 Plan 1: Settings, Naming Strategy, Document Replacement Summary

Settings UI with naming strategy dropdown and concurrency slider, naming strategy integration in downloader, document replacement module with code block skipping, and full pipeline wiring with progress notices and single-undo editor transaction.

## Commits

| Task | Commit  | Description                                                |
|------|---------|------------------------------------------------------------|
| 1    | 56bfa02 | Settings interface with naming strategy and configurable concurrency |
| 2    | b13e8a5 | Document replacement module and full pipeline wiring       |

## What Was Built

### Task 1: Settings and Downloader Integration

**src/settings.ts** -- Complete rewrite replacing placeholder:
- `NamingStrategy` type: `'original' | 'timestamp' | 'hash'`
- `DownloadImageSettings` interface with `namingStrategy` and `concurrency` fields
- `DEFAULT_SETTINGS`: original naming, concurrency 3
- `DownloadImageSettingTab.display()` with dropdown (3 naming options) and slider (1-10 concurrency)

**src/downloader.ts** -- Strategy and options integration:
- `deriveFilenameWithStrategy()` -- wraps existing helpers with timestamp prefix and content hash alternatives
- `DownloadOptions` interface with `concurrency`, `namingStrategy`, `onProgress` callback
- `downloadImages` signature extended with optional `DownloadOptions` parameter
- `namingStrategy` threaded through `downloadImages` -> `downloadOneWithRetry` -> `processOneRef`
- Hardcoded `CONCURRENCY = 3` constant removed; now from `options.concurrency`
- Progress callback invoked after each batch completes

### Task 2: Replacer Module and Pipeline Wiring

**src/replacer.ts** -- New module (created):
- `isInsideCodeBlock(content, position)` -- detects fenced code blocks (``` / ~~~) and inline code backticks
- `buildReplacementMap(content, results)` -- maps successful downloads to replacement strings, skipping code blocks
- `applyReplacements(content, replacements)` -- applies index-based replacements from end-to-start
- Handles wiki (`![[path]]`), HTML img (preserves attributes, replaces src), and markdown (`![alt](path)`) syntax

**src/main.ts** -- Full pipeline wiring:
- Imports `buildReplacementMap` and `applyReplacements` from replacer
- Progress Notice created with `timeout: 0` (persistent), updated via `onProgress` callback
- Downloads with configured `concurrency` and `namingStrategy` from settings
- Re-reads `editor.getValue()` before replacement (stale content protection per T-03-05)
- Single `editor.transaction` wrapping all replacements (one Ctrl+Z undoes all)
- Summary Notice with download/failure counts

## Deviations from Plan

None -- plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-03-01 | Index-based replacement (not regex) prevents injection in replacer.ts |
| T-03-03 | Concurrency capped at max 10 via slider range in settings.ts |
| T-03-04 | localPath comes from vault API output only, never user-supplied |
| T-03-05 | Re-read editor.getValue() immediately before replacement in main.ts |

## Known Stubs

None -- all data paths are fully wired.

## Self-Check: PASSED
