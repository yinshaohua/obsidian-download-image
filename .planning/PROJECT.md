# Download Image

## What This Is

Download Image is an Obsidian community plugin that downloads remote images from the current note into the user's vault and rewrites the note to use local attachments. It also helps users review and remove unused attachments so notes remain self-contained and available offline.

## Core Value

Remote images referenced by a note can be made local reliably without breaking note content or accessing data outside the vault.

## Requirements

### Validated

- [x] Download each unique remote image referenced by the active note into vault storage and replace its remote URL with a local attachment path.
- [x] Find unused attachments and let the user review them before moving them to trash or permanently deleting them according to settings.
- [x] Provide configurable naming, concurrency, cleanup, and excluded-folder behavior.
- [x] Keep plugin metadata, documentation, release assets, version mapping, and maintainer submission instructions ready for Obsidian community review (R001, M002).

### Active

None. The migrated M002 milestone is complete.

### Out of Scope

- Creating GitHub releases or mutating the external `obsidian-releases` repository without explicit maintainer approval.
- Telemetry, remote code execution, and network requests unrelated to a user-initiated image download.
- Access outside the Obsidian vault unless a future feature explicitly requires and documents it.

## Context

- This is an existing TypeScript Obsidian community plugin built with npm and esbuild.
- Source code lives in `src/`; tests live in `tests/`; `src/main.ts` is limited to plugin lifecycle and command registration.
- Release-facing metadata spans `manifest.json`, `package.json`, `versions.json`, `README.md`, and `SUBMISSION_CHECKLIST.md` and should be reviewed as one contract.
- M002 replaced sample-plugin residue, added the local release verifier and submission checklist, corrected the plugin ID to `download-image`, and added the tag-driven release workflow.

## Constraints

- **Platform**: Use Obsidian/browser-compatible APIs and retain mobile compatibility (`isDesktopOnly: false`).
- **Privacy**: Avoid telemetry, unnecessary network traffic, remote code execution, and access outside the vault.
- **Lifecycle**: Register Obsidian events, DOM events, and intervals through plugin cleanup helpers.
- **Dependencies**: Use project-local `node_modules/` and the `npm run deps:install` script.
- **Release**: GitHub release tags must be bare SemVer and must match `manifest.json`; release assets are `main.js`, `manifest.json`, and optionally `styles.css`.
- **Repository**: Do not commit generated dependencies or `main.js` outside an explicit release workflow.
- **Planning**: Keep durable project artifacts in `.planning/` under version control; keep transient GSD runtime data in `.gsd/` ignored.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat community-catalog submission as release-readiness work; keep external GitHub mutations behind explicit approval. | Release and PR operations use the maintainer's identity and affect external repositories. | Good (D001) |
| Keep package, manifest, version map, README, and submission checklist aligned as one release contract. | Cross-file verification catches documentation and metadata drift that a successful build cannot. | Good |
| Prefer a complete README rewrite when template residue dominates. | A clean rewrite avoids hidden sample content and makes the actual plugin contract explicit. | Good |
| Use a dependency-free local verifier plus a written checklist for release handoff. | Maintainers get a reproducible preflight check while external release actions remain manual. | Good |
| Track `.planning/` while ignoring `.gsd/`. | Plans, requirements, and verification records are durable project history; runtime databases and logs are machine-local state. | Good |

---
*Last updated: 2026-07-12 after placing gsd-core planning artifacts under version control.*
