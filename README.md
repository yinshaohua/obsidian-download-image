# Download Image

Download Image is an Obsidian community plugin that finds remote image URLs in the current note, downloads those files into your vault, and rewrites the note to point at the local attachments instead.

It is intended for users who want notes to remain self-contained, available offline, and less dependent on third-party image hosts.

## What the plugin does

The plugin currently provides two commands:

- **Save remote files in current note** — scans the active note for remote image references, downloads each unique image into the vault, and replaces the remote URLs with local paths.
- **Clean unused attachments** — scans for orphaned attachments, lets you review them, and then either moves them to `.trash` or permanently deletes them based on settings.

## Settings

The plugin includes a settings tab with options for:

- **Image naming strategy**
  - URL hash
  - Timestamp prefix
  - Content hash
- **Concurrent downloads**
- **Cleanup method**
  - Move to `.trash`
  - Permanent delete
- **Excluded folders** for orphan scans

## How to use

1. Open a note that contains remote image links.
2. Run **Save remote files in current note** from the command palette.
3. Wait for the progress notice to finish.
4. Review the updated note content and the downloaded attachments in your vault.

To remove unused downloaded files later:

1. Run **Clean unused attachments** from the command palette.
2. Review the detected orphaned files in the cleanup modal.
3. Confirm removal using Obsidian’s standard trash behavior.

## Installation for users

### From a release build

Once a release is published, copy these files into your vault at:

```text
<Vault>/.obsidian/plugins/download-image/
```

Required release assets:

- `main.js`
- `manifest.json`

Optional asset:

- `styles.css`

Then reload Obsidian and enable **Download Image** in **Settings → Community plugins**.

### Manual development install

This repository is also usable for local plugin development. Build the plugin, then copy the release artifacts into:

```text
<Vault>/.obsidian/plugins/download-image/
```

## Development

### Requirements

- Node.js 18+
- npm

### Install dependencies

Use the project dependency wrapper instead of bare `npm install`:

```bash
npm run deps:install
```

By default, this behaves like `npm install` and creates `./node_modules` in the project directory.

If you want to keep dependencies outside this OneDrive-synced project directory, run the PowerShell Profile function `setenv` from the project root first so `EXTERNAL_NODE_MODULES` points at `C:/local_data/obsidian-download-image/node_modules`, then run:

```bash
npm run deps:install
```

Do not use bare `npm install` for the external dependency workflow. `EXTERNAL_NODE_MODULES` is a project-specific variable, not an npm setting, so npm will ignore it unless you go through `npm run deps:install`. A bare `npm install` will still create `./node_modules` in the current project directory.

See [External node_modules guide](EXTERNAL-NODE-MODULES-GUIDE.md) for details.

### Run the development build

```bash
npm run dev
```

### Run the production build

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Repository structure

Key project files:

- `manifest.json` — plugin metadata used by Obsidian releases
- `package.json` — npm scripts and development metadata
- `.planning/` — version-controlled project plans, requirements, decisions, and verification records
- `src/main.ts` — plugin lifecycle and command registration
- `src/settings.ts` — persisted settings and settings UI
- `versions.json` — plugin version to minimum Obsidian version mapping

Source code lives in `src/`. Keep `src/main.ts` small and focused on plugin lifecycle tasks such as loading settings, registering commands, and adding settings tabs. Put feature logic in focused modules such as downloader, parser, replacer, scanner, modal, and settings files.

Planning artifacts in `.planning/` are committed with the repository. Local GSD runtime state in `.gsd/` remains ignored.

## Development conventions

- Use TypeScript and keep strict type safety in mind when changing source files.
- Use npm and esbuild; the release bundle is generated as top-level `main.js`.
- Keep the plugin small and avoid large runtime dependencies.
- Prefer browser-compatible APIs unless the plugin is intentionally desktop-only.
- Register workspace events, DOM events, and intervals with Obsidian cleanup helpers so plugin unload is safe.
- Persist settings through `loadData()` and `saveData()` and provide sensible defaults.
- Add user-facing commands with stable command IDs.
- Avoid hidden telemetry, remote code execution, or unnecessary network requests.
- Do not access files outside the vault unless the behavior is essential, documented, and explicitly user initiated.
- Do not commit generated dependencies or build output such as `node_modules/` or `main.js` during normal development.

## Release process for maintainers

When preparing a plugin release (the current repository version is `1.0.0`):

1. Update `manifest.json` version using SemVer.
2. Update `versions.json` so each plugin version maps to the correct minimum Obsidian version.
3. Ensure `package.json` metadata still matches the plugin identity.
4. Run:

   ```bash
   npm run build
   npm test
   ```

5. Create a GitHub release whose tag exactly matches `manifest.json`'s version number.
   - Do **not** prefix the tag with `v`.
6. Upload the release assets:
   - `main.js`
   - `manifest.json`
   - `styles.css` if present

## Community plugin submission notes

This repository is the source for the public Obsidian community plugin release.

For community review and catalog updates, maintainers should ensure that:

- the repository README describes the real plugin behavior
- `manifest.json` contains accurate plugin metadata
- release assets are attached individually to the GitHub release
- the release tag exactly matches the plugin version
- the plugin follows Obsidian community plugin guidelines and developer policies

The community plugin submission flow itself happens through the Obsidian plugin review/catalog process, but this repository must stay aligned with that release contract.

## Notes on behavior

- The plugin only downloads remote images when you explicitly run the command.
- Duplicate image URLs in the same note are deduplicated during a run.
- Download and cleanup progress is surfaced with Obsidian notices.
- Failures are summarized in notices and logged to the developer console for troubleshooting.

## License

0BSD
