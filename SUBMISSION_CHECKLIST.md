# Submission checklist

Use this checklist when preparing the plugin for the Obsidian community catalog. It covers the local preflight checks, the manual GitHub release steps, and the external `obsidian-releases` pull request.

## Preflight verification

- [ ] Run `npm run verify-release` from the repository root.
- [ ] Resolve every reported error before continuing.
- [ ] Review and resolve submission-risk warnings where possible before continuing.
- [ ] Run `npm test && npm run build` to confirm the test suite and production build are clean.
- [ ] Confirm the release assets are present at the repository root after the build:
  - `main.js`
  - `manifest.json`
  - `styles.css` if the plugin ships styles

## Known blockers

Resolve these issues before submitting the plugin to the Obsidian community catalog:

- [ ] **Plugin ID uniqueness must be confirmed.** The repository now uses `download-image`; verify that this ID is still available in Obsidian's `community-plugins.json` before opening the catalog PR.
- [ ] **`repo` must be replaced with the final GitHub path.** Update the example `community-plugins.json` entry below so it points to the exact public `owner/repo` that hosts the release assets.
- [ ] **Release assets must exist on the published GitHub release.** Run the local checks first, then confirm the real GitHub release contains `main.js`, `manifest.json`, and `styles.css` before opening the external PR.

## Create the GitHub release

- [ ] Confirm `manifest.json`, `package.json`, and `versions.json` all reflect the intended release version.
- [ ] If the version is changing, bump it before building.
- [ ] Run `npm run build` again after any metadata or source change.
- [ ] Create a GitHub release whose tag exactly matches the plugin version in `manifest.json`.
- [ ] Use a bare semantic version tag such as `1.0.0`.
- [ ] Do **not** prefix the tag with `v`.
- [ ] Attach these release assets individually:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- [ ] Verify the published release page shows the correct tag and all expected assets.

## community-plugins.json entry

Add or update this object in `community-plugins.json` in the `obsidian-releases` repository:

```json
{
  "id": "download-image",
  "name": "Download Image",
  "author": "yinsh",
  "description": "Download remote images in the current note to local vault storage.",
  "repo": "<github-username>/obsidian-download-image"
}
```

Notes:

- [ ] The `id` value must exactly match `manifest.json` after the plugin ID is fixed.
- [ ] Replace `repo` with the real GitHub `owner/repo` path for this repository.
- [ ] Recheck the description and author fields against the final release metadata before opening the PR.

## Open the obsidian-releases PR

- [ ] Fork `obsidianmd/obsidian-releases`.
- [ ] Create a branch for the catalog update.
- [ ] Add or update the plugin entry in `community-plugins.json`.
- [ ] Verify the submitted entry points to the exact GitHub repository that hosts the release assets.
- [ ] Open a pull request against `obsidianmd/obsidian-releases`.
- [ ] Reference the Obsidian plugin submission documentation in the PR description if helpful for reviewers.
- [ ] Double-check that the GitHub release already exists before opening the PR, because the validation workflow will inspect the repository and assets.

Reference docs:

- Obsidian plugin submission and release guidance: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Obsidian developer policies: https://docs.obsidian.md/Developer+policies

## Post-submission

- [ ] Monitor the `obsidian-releases` pull request for reviewer feedback.
- [ ] Respond to requests for metadata, repository, or release-asset fixes.
- [ ] Watch the automated validation checks in `obsidian-releases`.
- [ ] Expect validation to check manifest fields, plugin ID uniqueness, and repository/release accessibility.
- [ ] If reviewers request an updated release, publish the corrected assets first and then update the PR as needed.

## Decision boundary (D001)

Creating the GitHub release and opening or updating the external `obsidian-releases` pull request are manual maintainer actions that require approval and repository access. This checklist prepares the repository state and the exact submission materials, but it does not perform those external GitHub mutations automatically.
