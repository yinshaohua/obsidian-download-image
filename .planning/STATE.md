---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Phases
status: planning
stopped_at: v1.1 roadmap created — Phases 4-7 defined and written to ROADMAP.md
last_updated: "2026-04-10T12:37:36.623Z"
last_activity: 2026-04-10 — v1.1 roadmap written (Phases 4-7)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-10)

**Core value:** One command to localize all images in a document — making notes fully portable and independent of external image hosts
**Current focus:** v1.1 Clean Unused Attachments — Phase 4 Reference Scanner

---

## Current Position

**Phase:** 4 — Reference Scanner
**Plan:** Not started
**Status:** Roadmap created, ready to plan Phase 4
**Last activity:** 2026-04-10 — v1.1 roadmap written (Phases 4-7)

**Progress bar:** Phase 4 of 7 total (v1.1: 0/4 complete)

---

## Accumulated Context

### Key Decisions (logged)

| Decision | Rationale |
|----------|-----------|
| 3-phase coarse structure (v1.0) | 15 requirements cluster naturally: parsing, download/storage, write-back/settings |
| Parser built first (Phase 1) | Zero Obsidian API dependencies — pure regex, fully testable in isolation |
| Error handling in Phase 2 | Belongs with download logic — per-image isolation is a download-layer concern |
| UI-01 in Phase 1 | Command registration is the plugin shell; needed before any other phase can run |
| Settings in Phase 3 | Settings shape is driven by what the pipeline needs; defer until pipeline design is stable |
| base64 refs skip retry (02-01) | Decode errors are deterministic, not transient — retrying would produce identical failure |
| Promise.allSettled for batch (02-01) | One image failure must never block others — ERR-01 requirement |
| Content-Type validation strict (02-01) | Reject text/html redirects before they reach vault — prevents HTML injection (T-02-01) |
| Export pure helpers for testability (02-02) | Add export keyword to 4 pure functions + MIME_TO_EXT without changing public API |
| Stub obsidian via vitest alias (02-02) | Pure helpers don't call Obsidian APIs at runtime — minimal stub in resolve.alias isolates tests from runtime |
| NamingStrategy as union type (03-01) | Type-safe 'original'\|'timestamp'\|'hash' union instead of string enum for simplicity |
| Index-based replacement not regex (03-01) | Prevents injection in replacement strings per T-03-01 threat mitigation |
| Re-read editor before replacement (03-01) | Handles user edits during download per T-03-05 — avoids stale content corruption |
| DownloadOptions optional param (03-01) | Backward-compatible API — existing callers unaffected, defaults to original/3 |
| Scanner first (Phase 4) | Correctness is the entire value proposition; a wrong scanner causes data loss |
| Settings before modal (Phase 5) | Establishes cleanupMethod type contract consumed by modal and main.ts |
| Modal before wiring (Phase 6) | Can be developed and visually tested with mock TFile[] before full pipeline exists |
| Integration last (Phase 7) | Classic leaf-to-orchestrator order — consistent with v1.0 build pattern |

### Architecture Flags (from research)

- NEVER use `fetch()` — use `requestUrl` from `'obsidian'` (CORS bypass, mobile safe)
- NEVER use `vault.adapter.writeBinary` — use `vault.createBinary` (mobile safe)
- NEVER use multiple `editor.replaceRange` calls — single `editor.transaction` only
- NEVER use `vault.modify` on open documents — check `getActiveViewOfType(MarkdownView)` first
- Use `fileManager.getAvailablePathForAttachment` for all path resolution
- Bump `manifest.json` `minAppVersion` to `"1.5.7"` (required for `getAvailablePathForAttachment`)
- Use `editorCallback` (not `callback`) for command registration — guarantees active Markdown editor
- v1.1: NEVER use `resolvedLinks` alone — combine with `getFileCache().embeds` + `cache.links` + `cache.frontmatterLinks`
- v1.1: NEVER call `vault.trash()` without pre-creating `.trash` folder (ENOENT on fresh vault)
- v1.1: NEVER scan before checking MetadataCache readiness — null-guard all `getFileCache()` calls
- v1.1: NEVER offer system trash (vault.trash(file, true)) — silently falls back on Windows/Android
- v1.1: Vault-wide command uses `callback`; per-document command uses `editorCallback`
- v1.1: Parse canvas JSON directly (file nodes) — do not rely on MetadataCache for canvas references
- v1.1: Permanent delete must never be the default — always require explicit opt-in in Settings

### Blockers

None

---

## Session Continuity

**Last session:** 2026-04-10
**Stopped at:** v1.1 roadmap created — Phases 4-7 defined and written to ROADMAP.md
**To resume:** Run `/gsd-plan-phase 4` to plan the Reference Scanner phase

---

*State initialized: 2026-04-09*
*Milestone: v1.1 Clean Unused Attachments*
