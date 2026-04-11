# Requirements: obsidian-download-image

**Defined:** 2026-04-09
**Core Value:** One command to localize all images in a document — making notes fully portable and independent of external image hosts.

## v1.0 Requirements (Complete)

### Image Parsing

- [x] **PARSE-01**: User triggers command and plugin parses Markdown image syntax `![alt](url)`, including CDN URLs with query parameters
- [x] **PARSE-02**: Plugin parses Wiki image syntax `![[url]]`
- [x] **PARSE-03**: Plugin identifies base64 embedded images `data:image/...;base64,...`, decodes and saves as files
- [x] **PARSE-04**: Plugin parses HTML `<img src="...">` tags (covers WeChat/Feishu paste scenarios)

### Download & Storage

- [x] **DL-01**: Plugin downloads http/https remote images via `requestUrl`
- [x] **DL-02**: Images saved to user's configured Obsidian attachment folder, respecting vault settings
- [x] **DL-03**: Automatic duplicate filename handling to prevent overwriting existing files

### Document Update

- [x] **DOC-01**: After download, automatically replace remote URLs with local paths in document
- [x] **DOC-02**: Replacement applied as single editor transaction (one undo step)

### User Interface

- [x] **UI-01**: Register "Download images" command in command palette, available only when Markdown editor is active
- [x] **UI-02**: Show download progress and result summary via Notice
- [x] **UI-03**: Settings page: configurable image naming strategy (original / timestamp / hash)
- [x] **UI-04**: Settings page: configurable concurrent download count

### Error Handling

- [x] **ERR-01**: Single image download failure does not block other images; original reference preserved
- [x] **ERR-02**: Handle network exceptions (timeout, 404, non-image response after redirect) and report in results

## v1.1 Requirements

Requirements for clean unused attachments milestone. Each maps to roadmap phases.

### Scanning

- [x] **SCAN-01**: Plugin scans entire vault and identifies all attachment files (images, PDF, etc.) not referenced by any Markdown document
- [~] **SCAN-02**: ~~Plugin scans current document and identifies attachments it previously referenced but no longer references~~ — Dropped (per Phase 4 discussion: only vault-wide scan in v1.1)
- [x] **SCAN-03**: Scanner only targets non-Markdown, non-Canvas files (attachment-only scope)
- [x] **SCAN-04**: Scanner waits for MetadataCache 'resolved' event before scanning to avoid false positives
- [x] **SCAN-05**: Scanner detects references from both `resolvedLinks` and `embeds` (not just links)

### Cleanup

- [ ] **CLN-01**: Preview modal displays list of orphaned files with paths and sizes; user can deselect individual files before confirming
- [ ] **CLN-02**: Default cleanup moves files to Obsidian .trash folder (recoverable)
- [ ] **CLN-03**: Settings option to switch to permanent delete (explicit opt-in, never default)
- [ ] **CLN-04**: Result Notice shows count of cleaned files after operation completes

### Settings

- [x] **SET-01**: Cleanup method setting: "Move to .trash" (default) or "Permanent delete"
- [x] **SET-02**: Folder exclusion list: comma-separated paths excluded from orphan scanning

### Commands

- [ ] **CMD-01**: "Clean unused attachments" command in command palette — vault-wide scan (uses `callback`, no editor required)
- [~] **CMD-02**: ~~"Clean unused attachments in current note" command — per-document scan (uses `editorCallback`)~~ — Dropped (per Phase 4 discussion: only vault-wide scan in v1.1)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Batch Processing

- **BATCH-01**: Process all documents in a folder or vault
- **BATCH-02**: Background processing with progress modal

### Advanced Formats

- **ADV-01**: Support `<picture>` and `<source>` HTML elements
- **ADV-02**: Support CSS background-image URLs in HTML blocks

### Advanced Cleanup

- **ACLN-01**: Canvas file link awareness — detect references from .canvas JSON nodes
- **ACLN-02**: Per-note attachment folder support for non-default vault configurations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Image compression/format conversion | Download as-is, no processing |
| Automatic trigger on paste/open | v1 is manual command only |
| CDN or proxy support | Direct download only |
| Image gallery/management UI | Not a media manager |
| Auto-cleanup on file delete/rename | Silent destructive side effects; manual command only |
| Scheduled/background cleanup | Risk of silent data loss |
| Custom undo history | Obsidian .trash is the recovery mechanism |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 1 | Complete |
| PARSE-02 | Phase 1 | Complete |
| PARSE-03 | Phase 1 | Complete |
| PARSE-04 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| DL-01 | Phase 2 | Complete |
| DL-02 | Phase 2 | Complete |
| DL-03 | Phase 2 | Complete |
| ERR-01 | Phase 2 | Complete |
| ERR-02 | Phase 2 | Complete |
| DOC-01 | Phase 3 | Complete |
| DOC-02 | Phase 3 | Complete |
| UI-02 | Phase 3 | Complete |
| UI-03 | Phase 3 | Complete |
| UI-04 | Phase 3 | Complete |
| SCAN-01 | Phase 4 | Pending |
| SCAN-02 | — | Dropped |
| SCAN-03 | Phase 4 | Pending |
| SCAN-04 | Phase 4 | Pending |
| SCAN-05 | Phase 4 | Pending |
| SET-01 | Phase 5 | Complete |
| SET-02 | Phase 5 | Complete |
| CLN-01 | Phase 6 | Pending |
| CLN-02 | Phase 6 | Pending |
| CLN-03 | Phase 6 | Pending |
| CLN-04 | Phase 6 | Pending |
| CMD-01 | Phase 7 | Pending |
| CMD-02 | — | Dropped |

**Coverage:**
- v1.0 requirements: 15 total (all complete)
- v1.1 requirements: 13 total (11 active, 2 dropped: SCAN-02, CMD-02)
- Mapped to phases: 15 (v1.0) + 11 (v1.1)
- Dropped: 2 (SCAN-02, CMD-02 — per-document scanning removed from v1.1)

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-10 — v1.1 traceability updated: SCAN-01-05 → Phase 4, SET-01-02 → Phase 5, CLN-01-04 → Phase 6, CMD-01-02 → Phase 7*
