# Download Image

Download Image is an Obsidian community plugin that finds remote image URLs in the current note, downloads those files into your vault, and rewrites the note to point at the local attachments instead.

It is intended for users who want notes to remain self-contained, available offline, and less dependent on third-party image hosts.

## What the plugin does

The plugin currently provides two commands:

- **Download images in current note** — scans the active note for remote image references, downloads each unique image into the vault, and replaces the remote URLs with local paths.
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
2. Run **Download images in current note** from the command palette.
3. Wait for the progress notice to finish.
4. Review the updated note content and the downloaded attachments in your vault.

To remove unused downloaded files later:

1. Run **Clean unused attachments** from the command palette.
2. Review the detected orphaned files in the cleanup modal.
3. Confirm removal using your configured cleanup method.

## Installation for users

### From a release build

Once a release is published, copy these files into your vault at:

```text
<Vault>/.obsidian/plugins/obsidian-download-image/
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
<Vault>/.obsidian/plugins/obsidian-download-image/
```

## Development

### Requirements

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

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
- `src/main.ts` — plugin lifecycle and command registration
- `src/settings.ts` — persisted settings and settings UI
- `versions.json` — plugin version to minimum Obsidian version mapping

## Release process for maintainers

When preparing a plugin release:

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
