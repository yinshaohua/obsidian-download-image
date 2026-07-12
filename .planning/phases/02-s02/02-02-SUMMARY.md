---
phase: "02"
plan: "02"
---

# T02: Added a maintainer-facing submission checklist that documents release preflight steps, current submission blockers, the exact community-plugins.json entry, and the manual Obsidian catalog submission boundary.

**Added a maintainer-facing submission checklist that documents release preflight steps, current submission blockers, the exact community-plugins.json entry, and the manual Obsidian catalog submission boundary.**

## What Happened

Created `SUBMISSION_CHECKLIST.md` at the repository root as the documentation half of the release-readiness slice. The checklist is structured as a maintainer workflow with actionable checkboxes and covers preflight verification, known blockers, GitHub release creation, the exact `community-plugins.json` entry shape, opening the `obsidian-releases` pull request, post-submission follow-up, and the D001 decision boundary that keeps external GitHub actions manual. The document explicitly references `npm run verify-release` from T01 as the automated preflight command and records the current repository-specific blockers derived from local reality: the plugin ID `obsidian-download-image` must be changed before submission, `authorUrl` is currently an empty string in `manifest.json`, and no `.github/workflows/release.yml` exists yet. It also calls out that the README install path must be updated to match the final plugin ID. No source code or runtime behavior changed in this task; the deliverable is the maintainer checklist itself.

## Verification

Verified that `SUBMISSION_CHECKLIST.md` exists, contains seven top-level `##` sections, includes the required release/submission keywords and blocker content, and contains no `TBD` or `TODO` placeholders by running the planned shell and Node-based document checks.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f SUBMISSION_CHECKLIST.md` | 0 | ✅ pass | 35ms |
| 2 | `node -e "const c=require('fs').readFileSync('SUBMISSION_CHECKLIST.md','utf8'); const s=(c.match(/^## /gm)||[]).length; console.log(s+' sections'); process.exit(s >= 6 ? 0 : 1)"` | 0 | ✅ pass | 71ms |
| 3 | `node -e "const c=require('fs').readFileSync('SUBMISSION_CHECKLIST.md','utf8'); if(/TBD|TODO/i.test(c)){console.log('Found TBD/TODO');process.exit(1)}else{console.log('No placeholders');process.exit(0)}"` | 0 | ✅ pass | 60ms |
| 4 | `node -e "const c=require('fs').readFileSync('SUBMISSION_CHECKLIST.md','utf8'); if(/verify-release/.test(c)&&/community-plugins\.json/.test(c)&&/obsidian-download-image/.test(c)){console.log('Key content present');process.exit(0)}else{process.exit(1)}"` | 0 | ✅ pass | 57ms |

## Deviations

None.

## Known Issues

The repository still has the documented submission blockers: `manifest.json` uses the ID `obsidian-download-image`, `authorUrl` is an empty string, and no `.github/workflows/release.yml` exists yet. The checklist documents these issues but does not resolve them because this task's scope is the maintainer documentation, not the metadata or CI changes.

## Files Created/Modified

- `SUBMISSION_CHECKLIST.md`
