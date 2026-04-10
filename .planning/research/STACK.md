# Technology Stack

**Project:** obsidian-download-image
**Milestone:** v1.1 — Clean Unused Attachments
**Researched:** 2026-04-10
**Confidence:** HIGH

## Summary Verdict

No new npm packages are needed for the orphaned attachment cleanup feature. Every capability required — vault-wide file enumeration, reference graph querying, file deletion/trash, and confirmation dialogs — is provided by the Obsidian API already installed as a runtime dependency. The existing build toolchain (TypeScript + esbuild) is unchanged.

---

## Existing Stack (Unchanged)

The following is already in place from milestone v1.0 and requires no changes:

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ^5.8.3 | Plugin implementation language |
| esbuild | 0.25.5 | Bundler — produces single `main.js` |
| ESLint + typescript-eslint | 9.30.1 / 8.35.1 | Code quality enforcement |
| eslint-plugin-obsidianmd | 0.1.9 | Obsidian-specific lint rules |
| vitest | ^4.1.4 | Unit test runner |
| obsidian | latest | Runtime API (externalized from bundle) |

No version changes needed. No new packages to add.

---

## New Obsidian API Surface for v1.1

These are the specific API components needed for the orphaned attachment features. All are part of the `obsidian` package already declared as a dependency. All are available since Obsidian 1.5.7, which is already the project's `minAppVersion`.

### 1. Vault-Wide File Enumeration

**Use `vault.getFiles()` and `vault.getMarkdownFiles()`.**

```typescript
import { TFile } from 'obsidian';

// All vault files (any extension) — for finding attachment candidates
const allFiles: TFile[] = this.app.vault.getFiles();

// Only Markdown files — for iterating over documents that contain references
const mdFiles: TFile[] = this.app.vault.getMarkdownFiles();
```

Rationale: `getFiles()` returns all `TFile` instances synchronously from Obsidian's in-memory file tree. No filesystem I/O occurs. `getMarkdownFiles()` is a filtered subset. Both methods are synchronous and fast regardless of vault size — Obsidian maintains the file index at all times. Confidence: HIGH (obsidian.d.ts, official docs).

Signatures (from obsidian.d.ts, available since 0.9.7):
```typescript
getMarkdownFiles(): TFile[];
getFiles(): TFile[];
```

### 2. Reference Graph: Which Files Are Referenced

**Use `metadataCache.resolvedLinks` combined with `metadataCache.getFileCache().embeds` for complete coverage.**

```typescript
import { TFile } from 'obsidian';

function buildReferencedPathSet(app: App): Set<string> {
    const referenced = new Set<string>();

    // resolvedLinks covers wikilinks and markdown links (fast, pre-built index)
    // Structure: Record<sourcePath, Record<destPath, linkCount>>
    for (const destMap of Object.values(app.metadataCache.resolvedLinks)) {
        for (const destPath of Object.keys(destMap)) {
            referenced.add(destPath);
        }
    }

    // getFileCache().embeds covers ![[file]] embeds explicitly
    // Needed because resolvedLinks may merge links and embeds in some versions
    for (const mdFile of app.vault.getMarkdownFiles()) {
        const cache = app.metadataCache.getFileCache(mdFile);
        for (const embed of cache?.embeds ?? []) {
            const resolved = app.metadataCache.getFirstLinkpathDest(
                embed.link,
                mdFile.path
            );
            if (resolved) referenced.add(resolved.path);
        }
    }

    return referenced;
}
```

Rationale: `resolvedLinks` is a flat pre-built map across the entire vault — it is the fastest approach and covers most cases. The `getFileCache().embeds` pass is added because `resolvedLinks` tracks resolved destinations by path, and image embeds (`![[image.png]]`) may not be separately indexed from regular links in all Obsidian versions. Using both guarantees completeness. `getFirstLinkpathDest` resolves a bare filename (e.g., `image.png`) to a full vault-relative path (e.g., `attachments/image.png`) accounting for Obsidian's shortest-path resolution rule. Confidence: HIGH (obsidian.d.ts signatures verified, community pattern confirmed by multiple orphan-scanner plugins).

Signatures:
```typescript
// MetadataCache
resolvedLinks: Record<string, Record<string, number>>;
getFileCache(file: TFile): CachedMetadata | null;
getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;

// CachedMetadata
interface CachedMetadata {
    links?: LinkCache[];
    embeds?: EmbedCache[];   // ![[]] embed references
    tags?: TagCache[];
    headings?: HeadingCache[];
    // ...
}

// EmbedCache (extends ReferenceCache)
interface EmbedCache extends ReferenceCache {}
interface ReferenceCache extends Reference, CacheItem {
    // .link contains the raw link text (e.g., "image.png" or "folder/image.png")
    // .original contains the full syntax as written
}
```

### 3. File Deletion and Trash

**Use `vault.trash(file, system)` for user-recoverable deletion. Use `vault.delete(file)` only for permanent delete.**

```typescript
// Move to Obsidian's .trash folder (recoverable within Obsidian)
await this.app.vault.trash(file, false);

// Move to OS system trash (recoverable via OS, works on desktop)
await this.app.vault.trash(file, true);

// Permanent delete — no recovery
await this.app.vault.delete(file);
```

Rationale: `vault.trash(file, system: boolean)` is the correct API for user-safe file removal. When `system` is `false`, it moves to Obsidian's own `.trash` folder at the vault root (works on desktop and mobile). When `system` is `true`, it attempts the OS system trash; if that fails (e.g., mobile), it falls back to the local `.trash` folder. `vault.delete()` is permanent and should only be used when the user has explicitly selected "permanent delete" in settings. Confidence: HIGH (obsidian.d.ts signature verified).

Signatures:
```typescript
// vault.trash — preferred for user-facing cleanup
trash(file: TAbstractFile, system: boolean): Promise<void>;

// vault.delete — permanent, use only when user opts in
delete(file: TAbstractFile, force?: boolean): Promise<void>;
```

The plugin's configurable cleanup method setting (`.trash` vs permanent delete) maps directly to this: use `vault.trash(file, false)` for the default case and `vault.delete(file)` when the user has explicitly chosen permanent deletion.

### 4. Confirmation Modal

**Extend the `Modal` class to display the orphan list and get user confirmation.**

```typescript
import { App, Modal, TFile } from 'obsidian';

export class OrphanConfirmModal extends Modal {
    private orphans: TFile[];
    private onConfirm: (confirmed: boolean) => void;

    constructor(app: App, orphans: TFile[], onConfirm: (confirmed: boolean) => void) {
        super(app);
        this.orphans = orphans;
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;
        titleEl.setText(`Found ${this.orphans.length} orphaned attachment(s)`);
        // Build list and confirm/cancel buttons using contentEl DOM methods
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

// Usage
new OrphanConfirmModal(this.app, orphans, (confirmed) => {
    if (confirmed) { /* execute cleanup */ }
}).open();
```

Rationale: `Modal` is Obsidian's built-in dialog primitive. Extending it produces a native-looking dialog that respects Obsidian's theme and works on both desktop and mobile. No external UI library is needed. The callback pattern (passing `onConfirm` via constructor) is the standard pattern in Obsidian plugins and avoids promises that would require manual resolution. `titleEl` and `contentEl` are public `HTMLElement` properties suitable for building the file list. Confidence: HIGH (obsidian.d.ts, official Obsidian Modal docs).

Modal class signature (from obsidian.d.ts, line 4106):
```typescript
export class Modal implements CloseableComponent {
    app: App;
    scope: Scope;
    containerEl: HTMLElement;
    modalEl: HTMLElement;
    titleEl: HTMLElement;
    contentEl: HTMLElement;
    open(): void;
    close(): void;
    onOpen(): void;   // override this
    onClose(): void;  // override this
}
```

### 5. User Feedback (Already in Use)

**Use `Notice` for result summary — no changes from v1.0.**

```typescript
new Notice(`Cleaned up ${deletedCount} orphaned attachment(s).`);
```

`Notice` already handles mobile and desktop. No changes needed.

---

## Integration With Existing Architecture

The new feature modules slot cleanly into the existing pattern:

| New Module | Integrates With | Pattern |
|------------|-----------------|---------|
| `scanner.ts` — orphan detection logic | `app.vault`, `app.metadataCache` | Pure functions, takes `App` as parameter |
| `cleanup.ts` — deletion execution | `app.vault.trash()` / `vault.delete()` | Async, returns result summary |
| `OrphanConfirmModal` | `Modal` (obsidian) | Class extending `Modal`, callback-based |
| New commands in `main.ts` | `this.addCommand(...)` | Same pattern as existing download command |
| Settings addition in `settings.ts` | `DownloadImageSettings` | Add `cleanupMethod: 'trash' | 'permanent'` field |

No changes to the existing `parser.ts`, `downloader.ts`, or `replacer.ts` are required for this milestone.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `node:fs` for file deletion | Breaks on Obsidian mobile, violates plugin guidelines | `vault.trash()` / `vault.delete()` |
| Any regex-based reference scanning | Incomplete — misses wiki embeds, frontmatter links, complex cases | `metadataCache.resolvedLinks` + `getFileCache().embeds` |
| Direct `.trash` folder path manipulation | Fragile, non-portable | `vault.trash(file, false)` handles this automatically |
| React / any component framework | No complex UI needed | `Modal` + `contentEl` DOM manipulation is sufficient |
| `p-limit` or concurrency library | Deletion of N files can be sequential — no concurrency needed | `for...of` with `await` is correct and readable |
| `metadataCache.unresolvedLinks` alone | Unresolved links map broken wikilinks, not all orphans | Combine `resolvedLinks` + `embeds` instead |

---

## Stack Patterns by Variant

**If cleanup method is "move to trash" (default):**
- Use `vault.trash(file, false)` — moves to vault's `.trash` folder
- Works on desktop and mobile without special handling
- User can recover files from `.trash` folder

**If cleanup method is "permanent delete" (user opt-in):**
- Use `vault.delete(file)` — no recovery possible
- Gate behind explicit setting confirmation to prevent accidental data loss

**If scanning current document only (single-document orphan command):**
- Use `metadataCache.getFileCache(currentFile)?.embeds` instead of full vault scan
- Compare embed targets against vault files to find deleted-but-still-referenced paths
- This is faster and scoped — no need to iterate all markdown files

---

## Version Compatibility

| API | Available Since | Notes |
|-----|----------------|-------|
| `vault.getFiles()` | 0.9.7 | Already available |
| `vault.getMarkdownFiles()` | 0.9.7 | Already available |
| `vault.trash()` | 0.9.x | Already available |
| `vault.delete()` | 0.9.x | Already available |
| `metadataCache.resolvedLinks` | 0.9.x | Already available |
| `metadataCache.getFileCache()` | 0.9.x | Already available |
| `metadataCache.getFirstLinkpathDest()` | 0.9.x | Already available |
| `Modal` class | 0.9.x | Already available |
| `CachedMetadata.embeds` | 0.9.7 | Already available |

All required APIs are available since well before the project's `minAppVersion: "1.5.7"`. No manifest change is required for this milestone.

---

## Installation

No new packages to install.

```bash
# Nothing to add — existing dependencies are complete
npm install   # installs existing devDependencies only
```

---

## Sources

- Obsidian API type definitions (local): `node_modules/obsidian/obsidian.d.ts` — signatures for `vault.trash`, `vault.delete`, `vault.getFiles`, `vault.getMarkdownFiles`, `MetadataCache.resolvedLinks`, `MetadataCache.getFileCache`, `CachedMetadata.embeds`, `Modal` class verified directly
- MetadataCache documentation: https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache
- MetadataCache resolvedLinks: https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks
- Obsidian Modals guide: https://docs.obsidian.md/Plugins/User+interface/Modals
- Vault API guide: https://docs.obsidian.md/Plugins/Vault
- MetadataCache and Link Resolution (DeepWiki): https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution
- Reference implementation pattern: https://github.com/Vinzent03/find-unlinked-files (orphan file detection)
- Reference implementation pattern: https://github.com/josmarcristello/Obsidian-Find-Orphaned-Images (orphaned image detection)

---
*Stack research for: Obsidian plugin orphaned attachment scanning and cleanup*
*Researched: 2026-04-10*
