# Phase 4: Reference Scanner - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure-logic scanner module that identifies orphaned attachments vault-wide. Builds a complete reference index from MetadataCache (links + embeds + frontmatterLinks), raw HTML img regex scan, and canvas JSON parsing. Waits for MetadataCache readiness before scanning. Returns the list of unreferenced attachment files. No UI, no deletion logic in this phase.

**Scope change:** Per-document scanning (SCAN-02) and per-document command (CMD-02) are dropped from v1.1. Only vault-wide scanning is implemented.

</domain>

<decisions>
## Implementation Decisions

### Scanning scope
- **D-01:** Only vault-wide scan — no per-document scanner. SCAN-02 and CMD-02 are removed from this milestone.
- **D-02:** "Attachment" = any file that is not `.md` and not `.canvas`. All other file types (images, PDFs, audio, video, etc.) are candidates for orphan detection.

### Auto-excluded directories
- **D-03:** All dot-prefixed directories are auto-excluded from scanning (`.obsidian/`, `.trash/`, `.git/`, `.github/`, etc.). These are never considered as orphan candidates regardless of user settings.
- **D-04:** Phase 5 will add user-configurable folder exclusions on top of the auto-exclusions. The scanner accepts an exclusion list parameter to support this.

### Reference detection strategy (locked from research)
- **D-05:** Reference index built from four sources combined:
  1. `getFileCache().links` — standard wikilinks and markdown links
  2. `getFileCache().embeds` — image/attachment embeds (`![[...]]`, `![](...)`)
  3. `getFileCache().frontmatterLinks` — frontmatter link references
  4. Raw content regex scan for HTML `<img src="...">` tags (MetadataCache does not see these)
  5. Canvas JSON file node parsing (`.canvas` files reference attachments outside MetadataCache)
- **D-06:** All link paths resolved via `getFirstLinkpathDest()` to canonical `TFile` paths.

### MetadataCache readiness
- **D-07:** Scanner waits for MetadataCache `resolved` event before executing. If cache is already resolved (resolvedLinks non-empty), proceed immediately. Never scan against an incomplete cache.

### Performance
- **D-08:** Use `vault.cachedRead()` for all read-only content scans (HTML img regex pass, canvas JSON parsing). Never use `vault.read()` in the scan path.

### Claude's Discretion
- Module structure (single file vs split, class vs functions)
- Scanner return type shape (as long as it includes file path and size for Phase 6 modal)
- Internal helper organization
- Error handling for malformed canvas files
- Whether to log scan statistics to console

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The scanner is a pure-logic module; correctness is the priority over all else.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reference detection patterns
- `.planning/research/PITFALLS.md` — C2 (resolvedLinks misses embeds), C3 (canvas files), C4 (MetadataCache timing), C5 (HTML img invisible to cache)
- `.planning/research/PITFALLS.md` §Integration Gotchas — correct API usage for metadataCache, vault.getFiles()

### Existing parser (reusable pattern)
- `src/parser.ts` — HTML img regex pattern already implemented for v1.0 download; same regex approach applies to orphan reference detection

### Architecture flags
- `.planning/STATE.md` §Architecture Flags — locked API constraints (never use resolvedLinks alone, parse canvas JSON directly, null-guard all getFileCache calls)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/parser.ts` `HTML_IMG_RE` regex: Same pattern can be adapted for detecting local image references in HTML img tags
- `src/downloader.ts` `MIME_TO_EXT` map: Reference for known image extensions (though scanner scope is broader than images)

### Established Patterns
- Pure module with exported functions (parser.ts, replacer.ts pattern): Scanner should follow the same pattern — exported pure functions, no class needed
- TypeScript strict mode: All code must pass strict type checking
- Vitest for testing: Scanner tests should use the same test framework

### Integration Points
- `app.metadataCache` — primary data source for reference detection
- `app.vault.getFiles()` / `app.vault.getMarkdownFiles()` — file enumeration
- `app.vault.cachedRead()` — content access for HTML img regex and canvas parsing
- Scanner output consumed by Phase 6 confirmation modal and Phase 7 command wiring

</code_context>

<deferred>
## Deferred Ideas

- Per-document scanning (SCAN-02) — dropped from v1.1 entirely
- Per-document cleanup command (CMD-02) — dropped from v1.1 entirely
- Thumbnail preview in orphan list — Phase 6 concern (modal UI)
- Caching scan results across invocations — unnecessary for manual-trigger command

</deferred>

---

*Phase: 04-reference-scanner*
*Context gathered: 2026-04-10*
