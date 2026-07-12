---
phase: "02"
plan: "01"
---

# T01: Added a release-readiness verifier script and npm command that audit cross-file metadata, root assets, and README coverage for Obsidian submission prep.

**Added a release-readiness verifier script and npm command that audit cross-file metadata, root assets, and README coverage for Obsidian submission prep.**

## What Happened

Created `scripts/verify-release.mjs` as a standalone Node.js script using only built-in modules (`fs`, `path`, `process`). The script reads `manifest.json`, `package.json`, `versions.json`, and `README.md`, then evaluates version parity, required manifest fields, description length, plugin ID policy, empty optional fields, minAppVersion mapping, release asset presence, and README coverage. The output is a clear pass/warn/fail checklist using ✅/⚠️/❌ markers and the process exits with code 1 only when hard failures are present. Updated `package.json` to expose the script through `npm run verify-release`. Running the verifier showed the expected warning for the current `obsidian-download-image` plugin ID and also surfaced an additional non-blocking warning for the empty `authorUrl` field already present in `manifest.json`. No runtime plugin code was changed. Full regression verification then passed with the existing test suite and production build.

## Verification

Ran `npm run verify-release` and confirmed the new script exits successfully with 7 passing checks and 2 warnings, including the expected plugin ID warning and a non-blocking empty `authorUrl` warning. Then ran `npm test && npm run build`, which passed all 142 tests across 5 test files and completed the production TypeScript/esbuild build without errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run verify-release` | 0 | ✅ pass | 898ms |
| 2 | `npm test && npm run build` | 0 | ✅ pass | 4410ms |

## Deviations

The task plan said the verifier output should show the plugin ID warning and pass everything else. The implemented script also emitted a second warning for the existing empty `authorUrl` field because that warning behavior was explicitly required by the plan's optional-field check.

## Known Issues

The repository still uses the plugin id `obsidian-download-image`, which the verifier flags as a submission-risk warning because Obsidian community review rejects plugin IDs containing `obsidian`. `manifest.json` also still contains an empty `authorUrl` field that should be removed or populated before submission.

## Files Created/Modified

- `scripts/verify-release.mjs`
- `package.json`
