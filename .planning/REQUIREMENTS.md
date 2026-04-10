# Requirements: obsidian-download-image

**Defined:** 2026-04-09
**Core Value:** One command to localize all images in a document — making notes fully portable and independent of external image hosts.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Image Parsing

- [ ] **PARSE-01**: User triggers command and plugin parses Markdown image syntax `![alt](url)`, including CDN URLs with query parameters
- [ ] **PARSE-02**: Plugin parses Wiki image syntax `![[url]]`
- [ ] **PARSE-03**: Plugin identifies base64 embedded images `data:image/...;base64,...`, decodes and saves as files
- [ ] **PARSE-04**: Plugin parses HTML `<img src="...">` tags (covers WeChat/Feishu paste scenarios)

### Download & Storage

- [x] **DL-01**: Plugin downloads http/https remote images via `requestUrl`
- [x] **DL-02**: Images saved to user's configured Obsidian attachment folder, respecting vault settings
- [x] **DL-03**: Automatic duplicate filename handling to prevent overwriting existing files

### Document Update

- [x] **DOC-01**: After download, automatically replace remote URLs with local paths in document
- [x] **DOC-02**: Replacement applied as single editor transaction (one undo step)

### User Interface

- [ ] **UI-01**: Register "Download images" command in command palette, available only when Markdown editor is active
- [x] **UI-02**: Show download progress and result summary via Notice
- [x] **UI-03**: Settings page: configurable image naming strategy (original / timestamp / hash)
- [x] **UI-04**: Settings page: configurable concurrent download count

### Error Handling

- [x] **ERR-01**: Single image download failure does not block other images; original reference preserved
- [x] **ERR-02**: Handle network exceptions (timeout, 404, non-image response after redirect) and report in results

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Batch Processing

- **BATCH-01**: Process all documents in a folder or vault
- **BATCH-02**: Background processing with progress modal

### Advanced Formats

- **ADV-01**: Support `<picture>` and `<source>` HTML elements
- **ADV-02**: Support CSS background-image URLs in HTML blocks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Image compression/format conversion | Download as-is, no processing |
| Automatic trigger on paste/open | v1 is manual command only |
| CDN or proxy support | Direct download only |
| Image gallery/management UI | Not a media manager |
| Multi-document batch processing | v1 focuses on single active document |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 1 | Pending |
| PARSE-02 | Phase 1 | Pending |
| PARSE-03 | Phase 1 | Pending |
| PARSE-04 | Phase 1 | Pending |
| UI-01 | Phase 1 | Pending |
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

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 — traceability mapped to roadmap phases*
