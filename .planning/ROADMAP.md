# Roadmap: obsidian-download-image

**Milestone:** v1.0 Core Plugin
**Goal:** One command to localize all images in a document — fully functional, released plugin
**Granularity:** Coarse (3 phases)
**Requirements:** 15 v1 requirements

---

## Phases

- [ ] **Phase 1: Foundation & Parsing** - Clean up template boilerplate, register the command skeleton, and implement all image reference parsing (Markdown, Wiki, base64, HTML img)
- [ ] **Phase 2: Download & Storage** - Implement network download via requestUrl, vault file creation, path resolution, duplicate handling, and per-image error isolation
- [ ] **Phase 3: Document Update & Settings** - Wire full pipeline end-to-end, apply URL replacements as single editor transaction, implement settings page, and add user-visible progress notices

---

## Phase Details

### Phase 1: Foundation & Parsing
**Goal**: The plugin loads cleanly with no template artifacts, registers its command in the palette (available only when a Markdown editor is active), and correctly extracts all image references from any document
**Depends on**: Nothing (first phase)
**Requirements**: PARSE-01, PARSE-02, PARSE-03, PARSE-04, UI-01
**Success Criteria** (what must be TRUE):
  1. The plugin loads in Obsidian without errors and the "Download images" command appears in the command palette only when a Markdown file is open
  2. Given a document containing `![alt](https://example.com/img.png?token=abc)`, the parser extracts the URL including query parameters without truncation
  3. Given `![[https://example.com/img.png]]` Wiki syntax, the parser extracts the URL correctly and separately from Markdown image syntax
  4. Given a document with an embedded `data:image/png;base64,...` string, the parser identifies it as base64 type (not an HTTP URL to fetch)
  5. Given `<img src="https://example.com/img.png">` HTML tag, the parser extracts the URL correctly
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Clean boilerplate, update plugin identity, implement parser module, register command
- [x] 01-02-PLAN.md — Set up Vitest test framework and write comprehensive parser unit tests

### Phase 2: Download & Storage
**Goal**: Images are downloaded from remote URLs and saved to the correct vault attachment folder, with duplicate filenames handled automatically and individual failures isolated so other images continue processing
**Depends on**: Phase 1
**Requirements**: DL-01, DL-02, DL-03, ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. A remote http/https image URL is fetched using requestUrl and saved as a binary file in the vault's configured attachment folder (respecting Obsidian's Files & Links attachment path setting)
  2. When two images would produce the same filename, both are saved without overwriting — the second receives a unique name (e.g., image-1.png)
  3. When one image download fails (404, timeout, non-image response), that image is skipped and the remaining images continue downloading successfully
  4. Network exceptions (timeout, redirect to HTML, HTTP error status) are caught per image and do not crash the plugin or block other downloads
  5. Base64 embedded images are decoded and saved as binary files without making any network request
**Plans:** 1/2 plans executed

Plans:
- [x] 02-01-PLAN.md — Create downloader.ts module with HTTP download, base64 decode, vault storage, and main.ts wiring
- [ ] 02-02-PLAN.md — Unit tests for downloader pure helper functions (filename derivation, Content-Type validation, base64 decode)

### Phase 3: Document Update & Settings
**Goal**: After download, all successfully saved images have their references replaced in the document as a single undoable action; the user sees a result summary notice; and settings for naming strategy and concurrency are configurable
**Depends on**: Phase 2
**Requirements**: DOC-01, DOC-02, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. After the command runs, remote image URLs in the document are replaced with local vault paths — the document displays images from local storage
  2. The entire URL replacement is reversible with a single Ctrl+Z / Cmd+Z undo (one editor transaction)
  3. A Notice appears after the command completes showing how many images were downloaded and how many failed
  4. The plugin settings page offers a naming strategy selector (original filename / timestamp / hash) and the chosen strategy is applied when saving images
  5. The plugin settings page offers a concurrency control and the configured value limits simultaneous downloads
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Parsing | 0/2 | Planned | - |
| 2. Download & Storage | 1/2 | In Progress|  |
| 3. Document Update & Settings | 0/? | Not started | - |

---

## Coverage Validation

| Requirement | Phase | Category |
|-------------|-------|----------|
| PARSE-01 | Phase 1 | Image Parsing |
| PARSE-02 | Phase 1 | Image Parsing |
| PARSE-03 | Phase 1 | Image Parsing |
| PARSE-04 | Phase 1 | Image Parsing |
| UI-01 | Phase 1 | User Interface |
| DL-01 | Phase 2 | Download & Storage |
| DL-02 | Phase 2 | Download & Storage |
| DL-03 | Phase 2 | Download & Storage |
| ERR-01 | Phase 2 | Error Handling |
| ERR-02 | Phase 2 | Error Handling |
| DOC-01 | Phase 3 | Document Update |
| DOC-02 | Phase 3 | Document Update |
| UI-02 | Phase 3 | User Interface |
| UI-03 | Phase 3 | User Interface |
| UI-04 | Phase 3 | User Interface |

**Coverage: 15/15 requirements mapped**

---

*Roadmap created: 2026-04-09*
*Milestone: v1.0 Core Plugin*
