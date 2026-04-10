# Project Research Summary

**Project:** obsidian-download-image
**Domain:** Obsidian community plugin — orphaned attachment scanning and cleanup (v1.1 milestone)
**Researched:** 2026-04-10
**Confidence:** HIGH

## Executive Summary

The v1.1 milestone adds orphaned attachment cleanup to an existing, fully operational Obsidian plugin. The approach is well-understood: use Obsidian's MetadataCache and Vault APIs to build a referenced-file set, diff it against all non-markdown vault files, and present candidates to the user before any deletion. Every existing cleanup plugin in the Obsidian ecosystem follows this pattern. The stack is entirely unchanged — no new npm packages are needed, and all required APIs have been available since Obsidian 0.9.x, well before the project's minimum app version of 1.5.7.

The primary architectural decision is a clean two-module addition: a pure-logic `scanner.ts` (unit-testable without Obsidian runtime) and a UI-only `modal.ts` (confirmation dialog that calls back into main.ts for cleanup execution). These slot into the existing flat `src/` structure without touching any v1.0 modules. Settings gain a single new field (`cleanupMethod`). Two new command palette commands are registered in `main.ts`. This design mirrors the separation already established by `parser.ts`, `downloader.ts`, and `replacer.ts`.

The most significant risks are data integrity risks, not implementation complexity. Reference detection is the critical path: using `resolvedLinks` alone misses all attachment embeds (`![[image.png]]`), HTML `<img>` tags, and canvas file references — each of which can cause the scan to falsely classify actively-used files as orphaned. The mitigation is layered reference detection: combine `resolvedLinks`, `getFileCache().embeds`, raw HTML img regex, and canvas JSON parsing. Additionally, `vault.trash()` fails on a fresh vault with no `.trash` folder, and the MetadataCache may be incompletely populated immediately after Obsidian loads. Both require explicit guards. Permanent deletion must be an explicit user opt-in and must never be the default, because any false positive in permanent-delete mode causes unrecoverable data loss.

---

## Key Findings

### Recommended Stack

No new packages are required. The entire v1.1 feature is built on APIs in the `obsidian` package already declared as a runtime dependency. The existing TypeScript + esbuild + vitest toolchain is unchanged. All Obsidian API surface needed (vault enumeration, MetadataCache, Modal, vault.trash, vault.delete) has been available since Obsidian 0.9.x.

See `.planning/research/STACK.md` for full API signatures and integration patterns.

**Core technologies:**
- `TypeScript ^5.8.3`: Implementation language — unchanged from v1.0
- `obsidian` (runtime): All new API surface — `vault.getFiles()`, `metadataCache.resolvedLinks`, `getFileCache()`, `vault.trash()`, `vault.delete()`, `Modal`, `ButtonComponent`
- `vitest ^4.1.4`: Unit testing — scanner.ts is pure logic, fully testable without Obsidian runtime
- `esbuild 0.25.5`: Bundler — unchanged, no new entry points needed

### Expected Features

Surveyed five mature cleanup plugins (Clean Unused Attachments, Nuke Orphans, File Cleaner, Clear Unused Images, Find Unlinked Files) to establish community expectations.

See `.planning/research/FEATURES.md` for full prioritization matrix and competitor analysis.

**Must have (table stakes):**
- Vault-wide orphan scan — every existing plugin offers this; users have no alternative discoverable path
- Preview list before deletion — community forum threads show this is non-negotiable; deleting without preview is the most common complaint against cleanup plugins
- Move to Obsidian `.trash` (default) — all mature plugins default to trash, not permanent delete; `vault.trash(file, false)` is the API recommendation
- Attachment-only scope — never scan or delete `.md` or `.canvas` files, only images and documents
- Result Notice after cleanup — consistent with v1.0 notification pattern

**Should have (competitive):**
- Current-document orphan scan — unique differentiator that maps to the existing document-centric download command UX; reuses vault scan logic
- Folder exclusion list — users with organized vaults need to protect curated folders from false positives

**Defer (v2+):**
- Canvas file link awareness — complex, low demand unless Canvas becomes primary usage pattern
- Per-note attachment subfolder support — adds conditional logic throughout scanner without confirmed user demand

### Architecture Approach

The v1.1 addition follows the same leaf-to-orchestrator build order as v1.0. Two new files (`scanner.ts`, `modal.ts`) are added alongside the existing four modules; two existing files (`main.ts`, `settings.ts`) are modified. No v1.0 modules are touched. The scanner is strictly read-only and import-free of Obsidian UI classes, making it unit-testable. The modal owns all UI concerns and receives a callback from `main.ts` rather than importing vault APIs directly.

See `.planning/research/ARCHITECTURE.md` for full component diagrams, data flows, and anti-pattern catalog.

**Major components:**
1. `scanner.ts` (NEW) — pure functions `findVaultOrphans(app)` and `findNoteOrphans(app, notePath)`; no UI imports; receives `App` as parameter; returns `TFile[]`
2. `modal.ts` (NEW) — `OrphanListModal extends Modal`; renders file list with per-item checkboxes; calls `onConfirm` callback provided by `main.ts`; shows result Notice
3. `settings.ts` (MODIFIED) — add `cleanupMethod: 'obsidian-trash' | 'permanent'` field with default of `'obsidian-trash'`
4. `main.ts` (MODIFIED) — register two new commands (`callback` for vault scan, `editorCallback` for note scan); import scanner and modal; own cleanup execution callback

### Critical Pitfalls

Six critical pitfalls identified. All are data integrity risks, not performance concerns. See `.planning/research/PITFALLS.md` for complete analysis, code samples, and recovery strategies.

1. **resolvedLinks does not include attachment embeds (C2)** — `resolvedLinks` tracks wiki-links and markdown links to notes; `![[image.png]]` and `![](image.jpg)` are only in `getFileCache().embeds`. Using `resolvedLinks` alone marks every downloaded image as orphaned. Fix: iterate `getMarkdownFiles()` and combine `cache.links`, `cache.embeds`, and `cache.frontmatterLinks`, resolving each via `getFirstLinkpathDest()`.

2. **vault.trash() ENOENT on fresh vault (C1)** — `.trash` folder is not pre-created by Obsidian; `vault.trash(file, false)` fails with `ENOENT` on first use. Fix: check `adapter.exists('.trash')` and `adapter.mkdir('.trash')` before calling `vault.trash()`. Wrap all deletion in try/catch.

3. **MetadataCache not populated on vault startup (C4)** — Cache may be empty or mid-population when user invokes the scan command. Result: all files appear orphaned. Fix: check `Object.keys(resolvedLinks).length > 0` or await `metadataCache.on('resolved', ...)` before scanning. Null-guard every `getFileCache()` call.

4. **HTML img tags and canvas references are invisible to MetadataCache (C3, C5)** — `<img src="...">` attributes and canvas JSON file nodes are not parsed by Obsidian's link graph. Files referenced only via these mechanisms are falsely flagged. Fix: supplement cache-based scan with a regex pass on raw content (reusing `parser.ts` logic for HTML) and JSON parsing of `.canvas` files. This is the most commonly reported data loss source across existing cleanup plugins.

5. **Permanent delete without safe defaults (C6)** — Any false positive during permanent-delete mode is unrecoverable. Fix: default is always `vault.trash(file, false)`. Permanent delete requires explicit Settings opt-in with a visible warning. Never auto-delete on scan completion — always gate behind modal confirmation.

---

## Implications for Roadmap

The existing roadmap phase numbering follows the pattern `[milestone]-[phase]` (e.g., `04-01`). v1.1 maps to milestone `04`. The dependency graph is shallow and the build order is clear.

### Phase 04-01: Reference Scanner

**Rationale:** All other phases depend on the orphan detection algorithm being correct. Build and validate the scanner first in isolation, before any UI or deletion logic exists. The six pitfalls are heavily concentrated here.

**Delivers:** `scanner.ts` with `findVaultOrphans()` and `findNoteOrphans()`, plus comprehensive unit test coverage using mocked Obsidian APIs.

**Addresses:** Vault-wide orphan scan (P1 feature), attachment-only scope filter (P1 feature)

**Avoids:**
- C2: Use `getFileCache().embeds` + `cache.links` + `cache.frontmatterLinks` — not `resolvedLinks` alone
- C3: Parse canvas JSON file nodes as part of reference set construction
- C4: Await MetadataCache readiness; null-guard all `getFileCache()` calls
- C5: Supplement with HTML img regex pass reusing existing `parser.ts` patterns

**Research flag:** Standard pattern — well-documented APIs, HIGH confidence. No additional research needed.

### Phase 04-02: Settings Extension

**Rationale:** Settings type must be stable before modal and main.ts are wired up. Extends the existing `DownloadImageSettings` interface, which is already imported by `main.ts`. Low complexity, zero risk — establish the type contract first.

**Delivers:** `cleanupMethod: 'obsidian-trash' | 'permanent'` field in interface, `DEFAULT_SETTINGS`, and settings tab UI with warning copy for permanent delete mode.

**Addresses:** Cleanup method setting (P1 feature), permanent delete opt-in (P1 feature)

**Avoids:** C6 — default is `'obsidian-trash'`, never permanent; settings UI must display explicit warning before user can select permanent delete.

**Research flag:** Skip — straightforward extension of existing settings tab pattern; same code structure already shipped in v1.0.

### Phase 04-03: Confirmation Modal

**Rationale:** Modal depends on `TFile[]` from scanner (stable type) and `DownloadImageSettings` from Phase 04-02. Can be developed with mock orphan data before the full pipeline is wired. Separating the modal from the scanner keeps UI concerns isolated and allows independent testing.

**Delivers:** `OrphanListModal extends Modal` with scrollable file list, per-item deselect checkboxes, Confirm and Cancel buttons, result Notice display.

**Addresses:** Preview list before deletion (P1 feature), result Notice (P1 feature)

**Avoids:**
- C6: No deletion occurs until user explicitly presses Confirm; Cancel returns without action
- UX pitfall: Show file name and size, not just raw vault path; per-item deselect prevents all-or-nothing choice

**Research flag:** Skip — `Modal`, `ButtonComponent`, and `contentEl` DOM manipulation are standard, well-documented Obsidian patterns.

### Phase 04-04: Vault Pipeline Wiring + Deletion Execution

**Rationale:** Integration phase. Wires scanner output into modal, registers commands in `main.ts`, and implements the cleanup callback. Also implements the `vault.trash()` safety guard (C1). This is the final integration step — all components exist and have defined interfaces.

**Delivers:** Two new command palette commands ("Scan vault for orphaned attachments", "Scan current note for orphaned attachments"), cleanup callback using `vault.trash()` / `vault.delete()` based on `cleanupMethod` setting, `.trash` folder pre-creation guard, full end-to-end pipeline.

**Addresses:** Vault-wide orphan scan command (P1), current-note scan command (P2 — included here because scanner already supports it), move to .trash default (P1)

**Avoids:**
- C1: Check `adapter.exists('.trash')` and `adapter.mkdir()` before any `vault.trash()` call; wrap deletion loop in try/catch with specific ENOENT messaging
- Anti-Pattern 3: Vault-wide scan uses `callback` (not `editorCallback`); note scan uses `editorCallback`
- Anti-Pattern 4: Never use `vault.adapter.remove()` directly

**Research flag:** Skip — standard command registration and vault deletion patterns; all API signatures verified in STACK.md.

### Phase 04-05: Test Coverage and Verification

**Rationale:** Scanner logic (set-difference algorithm, reference completeness, edge cases) is the highest-complexity new code and the source of all data integrity risks. Tests must validate each pitfall prevention strategy explicitly.

**Delivers:** Unit tests for `scanner.ts` with mocked App object covering: vault-wide orphan detection, note-scoped orphan detection, empty vault, all files referenced, HTML img references, canvas file references, null `getFileCache()` return, MetadataCache not yet populated.

**Addresses:** All six critical pitfalls — test suite serves as regression guard

**Research flag:** Skip — vitest mocking patterns for Obsidian APIs are established in the existing test suite.

### Phase Ordering Rationale

- Scanner first because correctness is the entire value proposition of the feature; a fast but incorrect scanner causes data loss
- Settings second because it establishes the type contract consumed by both modal and main.ts; stable types before wiring
- Modal third because it depends only on stable types (TFile, DownloadImageSettings) and can be developed and visually tested without the full pipeline
- Wiring fourth as the classic integration-last pattern, consistent with how v1.0 was built
- Tests fifth because scanner.ts test infrastructure can be developed in parallel with later phases and expanded as the pipeline solidifies; a dedicated test phase ensures the "looks done but isn't" checklist from PITFALLS.md is fully verified

### Research Flags

Phases needing deeper research during planning:
- None — all APIs are HIGH confidence, verified against official obsidian.d.ts and Obsidian developer docs. The six pitfalls are clearly documented with mitigations.

Phases with standard patterns (skip research-phase):
- **Phase 04-01:** MetadataCache scanning pattern is established by multiple production plugins; STACK.md provides verified code samples
- **Phase 04-02:** Settings extension is a direct copy of existing v1.0 settings tab pattern
- **Phase 04-03:** Modal pattern is well-documented in official Obsidian docs with verified API signatures
- **Phase 04-04:** Command registration and vault deletion APIs are HIGH confidence; no novel integration
- **Phase 04-05:** vitest mocking patterns are established in existing test suite

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All API signatures verified directly against `obsidian.d.ts`; no new packages; official docs confirm all methods |
| Features | HIGH | Five mature production plugins surveyed; Obsidian forum threads reviewed; community consensus on table stakes is clear |
| Architecture | HIGH | Verified against existing codebase structure; official obsidian.d.ts API types confirmed; reference implementations reviewed |
| Pitfalls | HIGH | C1 and C4 confirmed via Obsidian forum posts; C2 and C5 confirmed via oz-clear-unused-images issue tracker (#40, #48, #51); C3 confirmed via official Canvas format docs; C6 confirmed via community plugin review guidelines |

**Overall confidence:** HIGH

### Gaps to Address

- **Canvas reference detection completeness:** The canvas JSON parsing approach (reading `.canvas` files and extracting `file` node paths) is documented and the spec is public, but `getFileCache()` behavior on canvas files is inconsistent across Obsidian versions. The safe approach is to always parse canvas files directly as JSON rather than relying on MetadataCache for canvas references. This is a known-good mitigation but should be verified against a vault with actual canvas files during Phase 04-05.

- **HTML img + frontmatter references — scope decision:** Research confirms these are not captured by MetadataCache embeds. The v1.0 `parser.ts` already handles HTML img extraction; reusing it for the orphan scan is the recommended approach. However, the exact integration point (whether `scanner.ts` imports `parser.ts` directly or main.ts orchestrates both) is an implementation decision left for Phase 04-01 planning. Reuse of `parser.ts` is preferred to avoid duplicate regex logic.

- **System trash behavior on Windows:** An Obsidian forum thread confirms that `vault.trash(file, true)` (OS system trash) silently falls back to Obsidian trash on Windows and Android without throwing an error. The recommended default of `vault.trash(file, false)` sidesteps this entirely; system trash should not be offered as a user-facing option in v1.1.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/obsidian/obsidian.d.ts` — all API signatures verified: `vault.trash`, `vault.delete`, `vault.getFiles`, `vault.getMarkdownFiles`, `MetadataCache.resolvedLinks`, `MetadataCache.getFileCache`, `CachedMetadata.embeds`, `Modal` class, `ButtonComponent`
- https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache — MetadataCache API surface
- https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks — resolvedLinks does not include embeds (confirmed)
- https://docs.obsidian.md/Plugins/User+interface/Modals — Modal extension pattern
- https://docs.obsidian.md/Plugins/Vault — vault.trash vs vault.delete guidance
- https://forum.obsidian.md/t/problem-with-image-loss-when-using-custom-attachment-location-and-clear-unused-images/107875 — data loss report confirming C5
- https://forum.obsidian.md/t/how-to-access-trash-in-vault/4693 — .trash not pre-created (C1)
- https://forum.obsidian.md/t/system-trash-setting-is-ignored-on-windows-and-on-android/103076 — system trash fallback behavior
- https://help.obsidian.md/plugins/canvas — Canvas JSON format, file node structure

### Secondary (MEDIUM confidence)
- https://github.com/sandorex/nuke-orphans-plugin — same problem space; TypeScript/esbuild stack; confirmation-only modal pattern
- https://github.com/Vinzent03/find-unlinked-files — resolvedLinks orphan scanning algorithm reference
- https://github.com/ozntel/oz-clear-unused-images-obsidian — three-mode deletion strategy; issues #40, #48, #51 confirm HTML img false positives (C5)
- https://github.com/sense5/clean-unused-attachments — "Actually Works Now" release note implies prior scanning correctness failures
- https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution — resolvedLinks structure and update semantics; embeds not included
- https://obsidian-community.github.io/obsidian-community-lib — `waitForResolvedLinks` utility confirms C4 timing issue is a recognized problem
- https://www.obsidianstats.com/tags/cleanup — all cleanup plugins surveyed for feature landscape

---
*Research completed: 2026-04-10*
*Ready for roadmap: yes*
