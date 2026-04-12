# obsidian-download-image

## What This Is

An Obsidian plugin with two core features: (1) downloads remote images referenced in the current document to local storage, replacing URLs with local paths in a single editor transaction; (2) scans the entire vault for orphaned attachments not referenced by any document, presents a confirmation modal, and cleans them up via .trash or permanent delete.

## Core Value

One command to localize all images in a document — making notes fully portable and independent of external image hosts. One command to clean up unused attachments — keeping vaults lean and organized.

## Requirements

### Validated

- ✓ Parse Markdown image syntax `![alt](url)` — v1.0
- ✓ Parse Wiki image syntax `![[url]]` — v1.0
- ✓ Parse embedded base64 image data — v1.0
- ✓ Parse HTML `<img src="...">` tags — v1.0
- ✓ Download external images (http/https) via requestUrl — v1.0
- ✓ Save images to Obsidian default attachment folder — v1.0
- ✓ Handle duplicate filenames (avoid overwriting) — v1.0
- ✓ Error handling for failed downloads (timeout, 404, non-image response) — v1.0
- ✓ Single image failure does not block other images — v1.0
- ✓ Single editor transaction for URL replacement — v1.0
- ✓ Command palette registration with editorCallback — v1.0
- ✓ Progress Notice and result summary — v1.0
- ✓ Configurable naming strategy (original/timestamp/hash) — v1.0
- ✓ Configurable concurrent download count — v1.0
- ✓ Vault-wide orphan scanner with 5-source reference detection — v1.1
- ✓ MetadataCache readiness guard (wait for 'resolved' event) — v1.1
- ✓ Scanner excludes .md, .canvas, and dot-prefixed directories — v1.1
- ✓ Cleanup method setting: move to .trash (default) or permanent delete — v1.1
- ✓ Folder exclusion list for orphan scanning — v1.1
- ✓ Confirmation modal with per-item checkbox deselect — v1.1
- ✓ Default cleanup moves to .trash with ENOENT pre-creation guard — v1.1
- ✓ Result Notice with success/partial/failure formats — v1.1
- ✓ Vault-wide "Clean unused attachments" command (callback, no editor required) — v1.1

### Active

(None — planning next milestone)

### Out of Scope

| Feature | Reason |
|---------|--------|
| Batch processing across multiple documents | v1.0 focuses on single active document |
| Image compression/format conversion | Download as-is, no processing |
| Automatic trigger on paste/open | Manual command only |
| CDN or proxy support | Direct download only |
| Image gallery/management UI | Not a media manager |
| Auto-cleanup on file delete/rename | Silent destructive side effects; manual command only |
| Scheduled/background cleanup | Risk of silent data loss |
| Per-document cleanup command | Dropped in v1.1 (SCAN-02, CMD-02) — vault-wide only |
| System trash (vault.trash(file, true)) | Silently fails on Windows/Android |

## Current State

**Shipped:** v1.1 Clean Unused Attachments (2026-04-11)
**Codebase:** ~2,900 LOC TypeScript, 142 tests across 5 test files
**Tech stack:** TypeScript, esbuild, Vitest, Obsidian Plugin API

### Architecture

```
src/
  main.ts        — Plugin entry, command registration, executeCleanup pipeline
  parser.ts      — Pure-function image reference extraction (4 regex branches)
  downloader.ts  — HTTP download via requestUrl, base64 decode, vault storage
  scanner.ts     — Orphan detection (5-source reference set, MetadataCache guard)
  modal.ts       — CleanupModal with Promise-wrapped confirm/cancel
  settings.ts    — Settings interface, defaults, tab UI (download + cleanup sections)
tests/
  parser.test.ts         — 28 parser tests
  downloader.test.ts     — 34 downloader pure-helper tests
  scanner.test.ts        — 43 scanner tests (requirement-ID grouped)
  settings.test.ts       — 24 settings tests
  main-cleanup.test.ts   — 13 pipeline integration tests
  __mocks__/obsidian.ts  — Obsidian API mock (TFile, Notice, Modal, Plugin, App)
```

## Constraints

- **Platform**: Must work on both desktop and mobile Obsidian (isDesktopOnly: false)
- **API**: Use only official Obsidian API for file operations (no direct fs access)
- **Network**: Use requestUrl (not fetch) for CORS bypass and mobile compatibility
- **Storage**: Use vault.createBinary (not vault.adapter.writeBinary) for mobile safety
- **Editor**: Single editor.transaction for all replacements (one undo step)
- **Build**: esbuild → single main.js output, no external runtime dependencies
- **Deletion**: Never use vault.trash(file, true) — system trash silently fails on Windows/Android
- **Cache**: Always null-guard getFileCache() calls; wait for MetadataCache 'resolved' before scanning

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Command palette trigger only | Simplest UX, no side effects | ✓ Good |
| Obsidian default attachment folder | Follows user's existing vault organization | ✓ Good |
| Auto-replace URLs after download | Core value: one-click localization | ✓ Good |
| All image formats (md/wiki/base64/html) | Comprehensive coverage, no missed images | ✓ Good |
| requestUrl over fetch | CORS bypass + mobile compatibility | ✓ Good |
| Index-based replacement not regex | Prevents injection in replacement strings | ✓ Good |
| Re-read editor before replacement | Handles user edits during download | ✓ Good |
| 5-source reference detection | resolvedLinks alone misses embeds, HTML, canvas | ✓ Good |
| vault.trash(file, false) only | System trash silently fails cross-platform | ✓ Good |
| Extracted executeCleanup function | Enables direct unit testing of pipeline | ✓ Good |
| Promise-wrapped Modal | Clean async API for command→modal→result flow | ✓ Good |
| Dropped per-document scan (v1.1) | Vault-wide scan covers all use cases; simpler UX | ✓ Good |

---
*Last updated: 2026-04-11 after v1.1 milestone*
