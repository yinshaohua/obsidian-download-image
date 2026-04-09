---
phase: 02-download-storage
plan: 01
subsystem: api
tags: [obsidian, requestUrl, vault, base64, download, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-parsing
    provides: ImageRef interface and extractImages function from parser.ts

provides:
  - src/downloader.ts — complete download engine: DownloadResult type, HTTP download via requestUrl with 30s timeout, base64 local decode via atob/Uint8Array, vault save via getAvailablePathForAttachment + createBinary, per-image error isolation with one retry, CONCURRENCY=3 batch processing
  - src/main.ts updated — editorCallback wired with downloadImages, results counted and logged, Phase 3 marker preserved

affects:
  - 02-02 (document replacement) — needs DownloadResult[] with localPath for URL substitution
  - 03 (settings) — will make CONCURRENCY configurable, currently hardcoded at 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requestUrl + Promise.race for HTTP download with timeout (no bare fetch)"
    - "atob + Uint8Array for base64 decode (browser-only, no Node.js Buffer)"
    - "getAvailablePathForAttachment + vault.createBinary for vault storage"
    - "Promise.allSettled for batch error isolation (ERR-01 pattern)"
    - "Per-image retry: one retry for HTTP, no retry for base64"

key-files:
  created:
    - src/downloader.ts
  modified:
    - src/main.ts

key-decisions:
  - "base64 refs skip retry — no network involved, decode error is deterministic"
  - "Promise.allSettled over Promise.all — ensures one rejection never blocks the batch"
  - "deriveFilenameFromUrl strips query/fragment before path extraction to handle CDN URLs"
  - "Content-Type validation rejects text/html to prevent HTML injection into vault (T-02-01)"
  - "ESLint lint failure noted as pre-existing issue (missing @eslint/json dep in eslint-plugin-obsidianmd)"

patterns-established:
  - "Pattern: fetchWithTimeout wraps requestUrl in Promise.race against setTimeout rejection"
  - "Pattern: all catch blocks narrow unknown type — e instanceof Error ? e.message : String(e)"
  - "Pattern: processOneRef dispatches on ref.type to separate HTTP and base64 code paths"

requirements-completed: [DL-01, DL-02, DL-03, ERR-01, ERR-02]

# Metrics
duration: 3min
completed: 2026-04-10
---

# Phase 02 Plan 01: Download Engine Summary

**HTTP download via requestUrl with 30s timeout + base64 decode via atob, saved to vault using getAvailablePathForAttachment, with CONCURRENCY=3 batch processing and per-image error isolation**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-10T16:56:50Z
- **Completed:** 2026-04-10T16:59:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/downloader.ts` (256 lines) implementing all 14 CONTEXT.md decisions (D-01 through D-14)
- All threat mitigations from threat register implemented: Content-Type validation (T-02-01), status check before arrayBuffer (T-02-02), 30s timeout + 15MB mobile limit + concurrency cap (T-02-03), path resolution via getAvailablePathForAttachment (T-02-05), mobile size check on base64 decoded buffer (T-02-07)
- Wired `downloadImages` into `main.ts` editorCallback — plugin pipeline now functional end-to-end (parse → download → log)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create downloader.ts** - `20d0517` (feat)
2. **Task 2: Wire downloadImages into main.ts** - `f31362d` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/downloader.ts` — Complete download module: DownloadResult type, MIME_TO_EXT map, pure helpers (isValidImageContentType, deriveFilenameFromUrl, deriveFilenameFromBase64, decodeBase64Image), network layer (fetchWithTimeout, saveToVault), pipeline (processOneRef, downloadOneWithRetry), exported orchestrator (downloadImages)
- `src/main.ts` — Added Notice import, downloadImages import, replaced Phase 2 placeholder with full download pipeline; Phase 3 marker comment preserved

## Decisions Made

- base64 refs do not retry on failure — decode errors are deterministic (not transient network errors); retrying would produce identical failure
- `Promise.allSettled` chosen over `Promise.all` for batch processing — aligns with ERR-01 requirement that one failure must not block other images
- `deriveFilenameFromUrl` strips `?` and `#` before `.split('/').pop()` — prevents CDN query strings from corrupting filenames (PITFALLS C6)
- Content-Type must start with `image/` or be `application/octet-stream` — rejects `text/html` redirect pages before they reach the vault (T-02-01, PITFALLS L2)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run lint` exits with error: `Cannot find module '@eslint/json'` in `eslint-plugin-obsidianmd`. This is a **pre-existing issue** that existed before this plan (not introduced by any changes here). TypeScript compilation (`npx tsc --noEmit --skipLibCheck`) and esbuild bundle (`npm run build`) both pass cleanly. The lint tool dependency issue is out-of-scope for this plan.

## Known Stubs

None - `downloadImages` returns real `DownloadResult[]` with actual vault paths. No placeholder data flows to downstream consumers.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's threat model. All T-02-01 through T-02-07 mitigations are implemented in `src/downloader.ts`.

## Next Phase Readiness

- `src/downloader.ts` exports `DownloadResult[]` with `localPath` (vault-relative path on success) — Phase 02-02 (document replacement) can use this directly to build the URL substitution map
- `src/main.ts` has `// Phase 3: document replacement logic will go here` marker at the correct insertion point
- CONCURRENCY is hardcoded at 3 — Phase 3 settings plan should add a configurable field

---
*Phase: 02-download-storage*
*Completed: 2026-04-10*
