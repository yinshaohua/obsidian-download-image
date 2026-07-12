---
phase: "01"
plan: "02"
---

# T02: Rewrote README.md to document the real Download Image plugin, its commands, install flow, and release/submission requirements.

**Rewrote README.md to document the real Download Image plugin, its commands, install flow, and release/submission requirements.**

## What Happened

I read the task plan plus the current README, manifest, package metadata, main plugin entrypoint, settings module, and the prior T01 summary before changing anything. The existing README was still the Obsidian sample-plugin template, so I replaced it with plugin-specific documentation that explains what Download Image does, which commands it exposes, which settings it persists, how users install release artifacts, and how maintainers build, test, version, and publish the plugin for Obsidian community review. I also added explicit repository/release notes tying this repository to the community-plugin submission contract so future maintainers can see the release expectations directly in the most visible project document. No code paths changed in this task; the work was documentation-only and kept aligned to manifest.json, package.json, src/main.ts, and src/settings.ts.

## Verification

I verified the rewritten README content directly and ran a fallback residue check that searches for the sample-template phrases the task explicitly forbids. The prescribed `rg` verification could not run in this shell because the environment reported a shim-read failure before executing ripgrep, so I used an equivalent Node/Python content check against README.md. I also ran the full Vitest suite to confirm the documentation change did not disturb the repository state; all 5 test files and 142 tests passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `rg -n "sample plugin|your-plugin-name|Open modal \(simple\)|This is a sample plugin" README.md && exit 1 || exit 0` | 1 | ❌ fail | 16ms |
| 2 | `node -e "const fs=require('fs'); const s=fs.readFileSync('README.md','utf8'); const re=/sample plugin|your-plugin-name|Open modal \(simple\)|This is a sample plugin/i; process.exit(re.test(s)?1:0)"` | 0 | ✅ pass | 72ms |
| 3 | `python - <<'PY'
import pathlib, time
p = pathlib.Path('README.md')
text = p.read_text(encoding='utf-8')
patterns = [r'sample plugin', r'your-plugin-name', r'Open modal \\(simple\\)', r'This is a sample plugin']
import re
start = time.time()
found = []
for pat in patterns:
    m = re.search(pat, text, re.I)
    if m:
        found.append(pat)
ms = int((time.time()-start)*1000)
print(f'patterns_found={found}')
raise SystemExit(1 if found else 0)
PY` | 0 | ✅ pass | 79ms |
| 4 | `npm test` | 0 | ✅ pass | 3010ms |

## Deviations

The task-specified ripgrep command could not execute in the local shell because the environment failed while reading a shim file before launching `rg`. I preserved the intent of the verification by running equivalent content checks over README.md with Node and Python instead of treating the shell issue as a product blocker.

## Known Issues

None in the shipped README content. The only issue encountered was the shell-level shim failure preventing direct `rg` execution.

## Files Created/Modified

- `README.md`
