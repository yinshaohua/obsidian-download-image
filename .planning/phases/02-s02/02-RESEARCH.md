# S02 — Research

**Date:** 2026-04-30

## Summary

This slice is straightforward, targeted release-readiness work on known repository surfaces rather than new runtime/plugin behavior. S01 already established the governing pattern: treat `README.md`, `package.json`, `manifest.json`, and `versions.json` as one submission contract and verify them together. The key gap for S02 is that the repository still lacks the maintainer-facing release/submission artifact promised by the roadmap, and the current repo state also shows one important readiness mismatch: there is no `.github/workflows/release.yml`, even though the milestone context expects a tag-triggered release workflow.

Current release-facing state is mixed. `README.md` now documents the real plugin, includes current-version guidance (`1.0.0`), and explains that release tags must be bare semver without a `v` prefix. `package.json`, `manifest.json`, and `versions.json` are version-consistent, and `npm test && npm run build` passes (5 test files, 142 tests, production build succeeds). However, `manifest.json` still uses `id: "obsidian-download-image"` and an empty `authorUrl`, while the milestone context says submission readiness should use `download-image` and avoid empty optional fields. The checklist/release-verification work should therefore both document the exact submission steps and explicitly surface these unresolved blockers rather than assuming the repository is already fully compliant.

## Recommendation

Build this slice around two deliverables: (1) a maintainer checklist document that captures the exact release and `obsidian-releases` PR steps, including the intended `community-plugins.json` entry shape and preflight checks; and (2) an executable verification script or scripted audit that proves current asset/build readiness and flags known blockers such as plugin ID format, missing release workflow, and empty optional manifest fields. This follows the project’s established verification-first pattern and aligns with the `verify-before-complete` skill rule that claims of readiness need fresh evidence, not inferred confidence.

Do not change runtime plugin code in this slice. Keep the work confined to release/submission materials plus verification surfaces. Also respect D001: prepare external actions, but stop short of creating a GitHub release or opening the external PR.

## Implementation Landscape

### Key Files

- `README.md` — Already rewritten for the real plugin; contains maintainer release notes, bare-tag guidance, and current version anchor. Reuse this as source material, but do not duplicate too much of it in the checklist.
- `package.json` — Current npm-visible package identity is `obsidian-download-image`; scripts already provide the core verification commands: `npm test`, `npm run build`, `npm run lint`.
- `manifest.json` — Current submission-critical metadata. Notable current state: `id` is still `obsidian-download-image`, description is 66 chars and ends with a period, `authorUrl` is present but empty, and `isDesktopOnly` is `false`.
- `versions.json` — Version map is currently consistent with `manifest.json` (`1.0.0` → `1.5.7`).
- `.github/workflows/lint.yml` — Existing CI only. It installs dependencies, builds, and lints on push/PR. There is currently no release workflow in `.github/workflows/`.
- `main.js` — Already present at repo root as a build artifact target; useful for release-asset existence checks, but should not be committed as new generated work in this slice.
- `styles.css` — Present at repo root; include it in checklist/release asset verification because it is an optional but currently available release asset.
- `LICENSE` — Present at repo root; useful for checklist completeness, though not part of release upload assets.

### Build Order

1. **Prove current release-readiness baseline** first with a scripted audit plus `npm test && npm run build`. This establishes what is already true versus what remains blocked.
2. **Create the maintainer checklist artifact** next, driven by the verified repository state and milestone constraints. Include exact manual steps for release creation and `obsidian-releases` submission/update.
3. **Add/align release verification automation** last if the slice is expected to leave behind a reusable command/script. This should encode the same checks the checklist references so future maintainers can rerun one command before release.

### Verification Approach

- Run `npm test && npm run build` and record the result as fresh evidence.
- Add a targeted metadata/release audit that checks at least:
  - `manifest.json`, `package.json`, and `versions.json` version parity
  - required manifest fields present
  - description length ≤ 250 and ends with a period
  - plugin ID policy check against the intended Obsidian submission rule (no `obsidian` in `id`)
  - empty optional fields such as `authorUrl`
  - presence/absence of `.github/workflows/release.yml`
  - presence of release assets `main.js`, `manifest.json`, and `styles.css`
  - README coverage for release-tag guidance and install path
- Verify the checklist document itself by ensuring it includes:
  - exact release asset list
  - exact tag format guidance (`x.y.z`, no `v`)
  - exact manual PR/update steps for `community-plugins.json`
  - a note to check plugin ID uniqueness before submission
  - an explicit statement that GitHub release / external PR remain manual by project decision D001

## Constraints

- Obsidian community-plugin validation is sensitive to plugin metadata; the milestone context explicitly calls out that plugin IDs containing `obsidian` are rejected, so the checklist must not silently bless the current manifest state.
- External mutations are out of scope for the slice: no actual GitHub release creation and no actual `obsidian-releases` PR without explicit approval.
- Per repo guidance, generated release artifacts are `main.js`, `manifest.json`, and optional `styles.css`; the checklist should treat these as top-level plugin-folder assets.

## Common Pitfalls

- **Assuming build success means submission readiness** — S01 already showed that documentation/metadata drift can survive a green build; keep the scripted contract audit.
- **Documenting the current repo state instead of the required submission state** — the repo currently still has a sample-derived manifest ID issue and no release workflow; the checklist must distinguish “current status” from “required before submission.”
- **Baking in the wrong plugin folder/ID guidance** — `README.md` still references `<Vault>/.obsidian/plugins/obsidian-download-image/`, while the milestone context says the submission target ID should be `download-image`; the planner should decide whether the slice documents the intended submitted ID or explicitly records this mismatch as a blocker.

## Open Risks

- The largest risk is scope ambiguity: if the slice is supposed to produce only documentation, it may leave known blockers unencoded; if it is supposed to also close submission blockers, planner/executor will need to include manifest/workflow fixes.
- `download-image` uniqueness in `community-plugins.json` is still unverified and must remain a checklist item unless the slice explicitly performs the lookup.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| GitHub Actions | `github-workflows` | available |
| GitHub Actions | `xixu-me/skills@github-actions-docs` | available via `npx skills add xixu-me/skills@github-actions-docs` |
| Obsidian plugin release workflow | `gapmiss/obsidian-plugin-skill@obsidian` | available via `npx skills add gapmiss/obsidian-plugin-skill@obsidian` |

## Sources

- Repo inspection showed current release surfaces: `README.md`, `package.json`, `manifest.json`, `versions.json`, `.github/workflows/lint.yml`, `main.js`, `styles.css`, and `LICENSE`.
- Fresh verification in this research run: `npm test && npm run build` passed with 5 test files and 142 tests, followed by a successful production build.
- Skill discovery confirmed an installed `github-workflows` skill is directly relevant if the planner decides S02 should also add the missing release workflow; external skills exist but are not required to proceed.
