# Roadmap: obsidian-download-image

**Milestone:** v1.1 Clean Unused Attachments
**Goal:** Scan vault for orphaned attachments, present a confirmation list, and clean them up safely
**Granularity:** Standard (4 phases)
**Requirements:** 13 v1.1 requirements (continuing from v1.0 Phase 3)

---

## v1.0 Phases (Complete)

- [x] **Phase 1: Foundation & Parsing** - Clean up template boilerplate, register the command skeleton, and implement all image reference parsing (completed)
- [x] **Phase 2: Download & Storage** - Implement network download, vault file creation, path resolution, duplicate handling, and per-image error isolation (completed 2026-04-09)
- [x] **Phase 3: Document Update & Settings** - Wire full pipeline end-to-end, apply URL replacements as single editor transaction, implement settings page, and add user-visible progress notices (completed 2026-04-10)

---

## v1.1 Phases

- [ ] **Phase 4: Reference Scanner** - Pure-logic scanner module that identifies orphaned attachments vault-wide, with full reference detection (resolvedLinks + embeds + HTML img + canvas) and MetadataCache readiness guard
- [ ] **Phase 5: Settings Extension** - Add cleanup method setting (move to .trash vs. permanent delete) and folder exclusion list to the existing settings interface and tab UI
- [ ] **Phase 6: Confirmation Modal** - Confirmation dialog that renders the orphan list with per-item deselect checkboxes, Confirm/Cancel actions, and result Notice after cleanup
- [ ] **Phase 7: Pipeline Wiring & Deletion** - Register vault-wide command palette command, wire scanner output into modal, implement the cleanup callback with vault.trash/vault.delete execution and ENOENT guard

---

## Phase Details

### Phase 4: Reference Scanner
**Goal**: A correct, unit-tested scanner correctly identifies all truly orphaned attachments — never flagging actively-referenced files as orphans
**Depends on**: Phase 3 (existing codebase stable)
**Requirements**: SCAN-01, SCAN-03, SCAN-04, SCAN-05 (SCAN-02 dropped)
**Success Criteria** (what must be TRUE):
  1. Given a vault where every attachment file is referenced by at least one document, the scanner returns an empty orphan list
  2. Given a vault with three attachment files where only one is unreferenced by any document (including via embeds, HTML img tags, and canvas nodes), the scanner returns exactly that one file
  3. When the MetadataCache has not yet resolved after vault load, invoking the scanner either waits for resolution or returns a safe empty result rather than false positives
  4. The scanner never returns Markdown (.md) or Canvas (.canvas) files — only non-document attachments
  5. Files inside dot-prefixed directories (.obsidian/, .trash/, .git/, etc.) are never returned as orphans
**Plans:** 2 plans
Plans:
- [x] 04-01-PLAN.md — Scanner module implementation + mock infrastructure (complete 2026-04-10)
- [ ] 04-02-PLAN.md — Comprehensive scanner unit tests
**UI hint**: no

### Phase 5: Settings Extension
**Goal**: Users can configure their preferred cleanup method and protect specific folders from the orphan scan before ever running a cleanup
**Depends on**: Phase 4
**Requirements**: SET-01, SET-02
**Success Criteria** (what must be TRUE):
  1. The settings page shows a "Cleanup method" dropdown with "Move to .trash" pre-selected as the default; selecting "Permanent delete" reveals a visible warning before the choice is saved
  2. The settings page shows a "Folder exclusions" text field; paths entered there are excluded from orphan scan results in subsequent scans
**Plans**: TBD
**UI hint**: yes

### Phase 6: Confirmation Modal
**Goal**: Users see exactly what will be deleted and can deselect individual files before any cleanup action is taken
**Depends on**: Phase 5
**Requirements**: CLN-01, CLN-02, CLN-03, CLN-04
**Success Criteria** (what must be TRUE):
  1. After a scan completes, a modal opens listing every orphaned file with its name, vault path, and file size — no cleanup has happened yet at this point
  2. The user can uncheck individual files in the modal; unchecked files are excluded from the cleanup when Confirm is pressed
  3. Pressing Cancel closes the modal without deleting or moving any files
  4. After Confirm is pressed, a Notice appears stating how many files were cleaned up (e.g., "Cleaned 3 attachments")
**Plans**: TBD
**UI hint**: yes

### Phase 7: Pipeline Wiring & Deletion
**Goal**: Two working command palette commands let users trigger vault-wide and per-document orphan cleanup end-to-end, with files moved to trash (or deleted) safely
**Depends on**: Phase 6
**Requirements**: CMD-01 (CMD-02 dropped)
**Success Criteria** (what must be TRUE):
  1. The "Clean unused attachments" command appears in the command palette without requiring an open editor, runs the vault-wide scan, and opens the confirmation modal with results
  2. When the user confirms cleanup with the default setting, each selected file is moved to the Obsidian .trash folder (recoverable) — including on a fresh vault with no pre-existing .trash folder
  3. When the user confirms cleanup with permanent delete enabled in settings, each selected file is permanently removed from the vault
**Plans**: TBD
**UI hint**: no

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Parsing | 2/2 | Complete | — |
| 2. Download & Storage | 2/2 | Complete | 2026-04-09 |
| 3. Document Update & Settings | 2/2 | Complete | 2026-04-10 |
| 4. Reference Scanner | 1/2 | Executing | — |
| 5. Settings Extension | 0/? | Not started | — |
| 6. Confirmation Modal | 0/? | Not started | — |
| 7. Pipeline Wiring & Deletion | 0/? | Not started | — |

---

## Coverage Validation

### v1.0 (Complete)

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

**v1.0 Coverage: 15/15 requirements mapped**

### v1.1

| Requirement | Phase | Category |
|-------------|-------|----------|
| SCAN-01 | Phase 4 | Scanning |
| SCAN-02 | — | Dropped |
| SCAN-03 | Phase 4 | Scanning |
| SCAN-04 | Phase 4 | Scanning |
| SCAN-05 | Phase 4 | Scanning |
| SET-01 | Phase 5 | Settings |
| SET-02 | Phase 5 | Settings |
| CLN-01 | Phase 6 | Cleanup |
| CLN-02 | Phase 6 | Cleanup |
| CLN-03 | Phase 6 | Cleanup |
| CLN-04 | Phase 6 | Cleanup |
| CMD-01 | Phase 7 | Commands |
| CMD-02 | — | Dropped |

**v1.1 Coverage: 11/13 requirements active (2 dropped: SCAN-02, CMD-02)**

---

*Roadmap created: 2026-04-09 (v1.0)*
*Updated: 2026-04-10 — v1.1 Clean Unused Attachments phases added (Phase 4-7)*
*Updated: 2026-04-10 — Phase 4 planned: 2 plans (scanner implementation + unit tests)*
*Updated: 2026-04-10 — 04-01 complete: scanner module + TFile mock implemented (1/2 plans done)*
