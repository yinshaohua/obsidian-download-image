# Pitfalls Research

**Domain:** Obsidian community plugin — orphaned attachment scanning and cleanup (v1.1 milestone)
**Researched:** 2026-04-10
**Confidence:** HIGH (verified against official Obsidian API docs, real-world plugin post-mortems from oz-clear-unused-images, clean-unused-attachments, and find-unlinked-files projects, and confirmed community reports)

---

## Critical Pitfalls

### Pitfall C1: vault.trash ENOENT When .trash Folder Does Not Yet Exist

**What goes wrong:**
`vault.trash(file, false)` fails with `ENOENT: no such file or directory` on a fresh vault (or any vault where files have never been deleted before). The `.trash` folder inside the vault root is not created at vault initialization — it is created lazily on first use. If the plugin calls `vault.trash()` before the folder exists, the OS-level rename/move operation fails because the destination directory is absent. This is the exact failure mode the user already encountered with the "Clear Unused Images" plugin.

**Why it happens:**
Developers call `vault.trash()` assuming Obsidian has already created the `.trash` folder. On a fresh vault, or after the folder was manually deleted, or on first-run after installing the plugin, the folder does not exist. Obsidian does not pre-create it.

**How to avoid:**
Before calling `vault.trash(file, false)` in Obsidian-trash mode, verify the folder exists and create it if absent:

```typescript
const trashPath = normalizePath('.trash');
if (!(await this.app.vault.adapter.exists(trashPath))) {
  await this.app.vault.adapter.mkdir(trashPath);
}
await this.app.vault.trash(file, false);
```

Also wrap every `vault.trash()` call in a try/catch and surface a specific error message for ENOENT so the user knows what happened — not a generic "delete failed".

**Warning signs:**
- `vault.trash()` called without a preceding existence check on `.trash`
- No try/catch around the deletion loop
- ENOENT in the developer console immediately after invoking the cleanup command

**Phase to address:** Phase 1 of v1.1 — any task that implements file deletion

---

### Pitfall C2: Using resolvedLinks to Find Attachment References — It Does Not Include Embeds

**What goes wrong:**
`app.metadataCache.resolvedLinks` is a map of source-file paths to destination-file paths. It tracks standard wiki-links (`[[Note]]`) and markdown links (`[text](path)`) that point to other notes. It does **not** include image or attachment embeds (`![[image.png]]`, `![](image.jpg)`). A plugin that iterates `resolvedLinks` to build the "referenced files" set will miss every attachment embed and falsely classify all downloaded images as orphaned.

**Why it happens:**
`resolvedLinks` is the most prominent link-related API on `MetadataCache`. Developers reach for it without checking whether embeds are a separate structure. The TypeScript docs describe it as "all resolved links" — which sounds complete, but means only link-type references, not embed-type references.

**How to avoid:**
Build the referenced-files set by iterating every markdown file and calling `getFileCache(file).embeds` to collect all embedded attachment paths. Resolve each embed path using `getFirstLinkpathDest(embed.link, sourceFile)` to get the canonical `TFile`:

```typescript
const referencedPaths = new Set<string>();

for (const mdFile of this.app.vault.getMarkdownFiles()) {
  const cache = this.app.metadataCache.getFileCache(mdFile);
  if (!cache) continue;

  // Standard wikilinks and markdown links to other files
  for (const link of cache.links ?? []) {
    const dest = this.app.metadataCache.getFirstLinkpathDest(link.link, mdFile.path);
    if (dest) referencedPaths.add(dest.path);
  }

  // Image/attachment embeds (![[...]] and ![...](...))
  for (const embed of cache.embeds ?? []) {
    const dest = this.app.metadataCache.getFirstLinkpathDest(embed.link, mdFile.path);
    if (dest) referencedPaths.add(dest.path);
  }

  // Frontmatter links (Obsidian 1.4+)
  for (const fmLink of cache.frontmatterLinks ?? []) {
    const dest = this.app.metadataCache.getFirstLinkpathDest(fmLink.link, mdFile.path);
    if (dest) referencedPaths.add(dest.path);
  }
}
```

**Warning signs:**
- Using `app.metadataCache.resolvedLinks` as the sole source of reference data
- Not accessing `cache.embeds` from `getFileCache()`
- Orphan scan returns every local image as unreferenced even on a fresh download

**Phase to address:** Phase 1 of v1.1 — vault scanning and reference index construction

---

### Pitfall C3: Canvas Files Are Not Markdown — getMarkdownFiles Misses Their Attachment References

**What goes wrong:**
`vault.getMarkdownFiles()` returns only `.md` files. Canvas files (`.canvas`) are JSON documents that can reference attachments via file nodes (`"type": "file"`, `"file": "attachments/image.png"`). Any attachment used on a canvas but not embedded in any markdown note will be classified as orphaned and deleted — even though it is actively in use.

**Why it happens:**
Developers build the reference set by scanning markdown only. Canvas files look different (JSON, not markdown) and are not returned by `getMarkdownFiles()`. The `MetadataCache` does index canvas files, but `getFileCache()` on a `.canvas` file may not return the `embeds` array in all Obsidian versions.

**How to avoid:**
After building the reference set from markdown files, additionally scan canvas files. Canvas JSON structure is well-documented (JSON Canvas spec). Read each `.canvas` file and parse its nodes:

```typescript
const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
for (const cf of canvasFiles) {
  const raw = await this.app.vault.read(cf);
  try {
    const data = JSON.parse(raw) as { nodes?: Array<{ type: string; file?: string }> };
    for (const node of data.nodes ?? []) {
      if (node.type === 'file' && node.file) {
        const dest = this.app.vault.getAbstractFileByPath(normalizePath(node.file));
        if (dest instanceof TFile) referencedPaths.add(dest.path);
      }
    }
  } catch {
    // Malformed canvas — skip, log warning
  }
}
```

**Warning signs:**
- Reference index built solely from `getMarkdownFiles()` loop
- No canvas file handling in the scan logic
- Vault contains `.canvas` files with embedded images

**Phase to address:** Phase 1 of v1.1 — vault scanning

---

### Pitfall C4: MetadataCache Not Fully Populated When Scan Command Is Invoked

**What goes wrong:**
On vault startup, `MetadataCache` resolves links and builds its indexes asynchronously. If the user invokes the orphan scan command immediately after Obsidian loads (or after a large vault resync), the cache may be mid-population. `getFileCache()` can return `null` for files not yet indexed. `resolvedLinks` may be empty or incomplete. The scan runs successfully — and returns every attachment as "orphaned" — because the reference set was built against an empty cache.

**Why it happens:**
`metadataCache.resolvedLinks` and `getFileCache()` are available immediately but may be empty while background indexing is in progress. The `resolved` event fires when indexing completes. Plugins that do not wait for this event run into stale data.

**How to avoid:**
Check whether the cache is ready before scanning. If not ready, defer with the `'resolved'` event or inform the user:

```typescript
private async waitForCache(): Promise<void> {
  return new Promise(resolve => {
    // If already resolved (Object.keys > 0), proceed immediately
    if (Object.keys(this.app.metadataCache.resolvedLinks).length > 0) {
      resolve();
      return;
    }
    const ref = this.app.metadataCache.on('resolved', () => {
      this.app.metadataCache.offref(ref);
      resolve();
    });
  });
}
```

Alternatively, show a Notice explaining the scan will be more accurate after the vault fully loads, and count `null` results from `getFileCache()` as "skip this file" (not "unreferenced").

**Warning signs:**
- No wait for `metadataCache.on('resolved', ...)` before scan
- `getFileCache()` return values not checked for `null`
- Scan immediately after plugin load returns implausibly large orphan count

**Phase to address:** Phase 1 of v1.1 — scan orchestration

---

### Pitfall C5: HTML img Tags and Frontmatter Image Properties Are Invisible to the Metadata Cache

**What goes wrong:**
The Obsidian MetadataCache parses wiki-links and standard markdown image embeds. It does not parse:
- HTML `<img src="attachments/photo.jpg">` tags embedded in markdown
- YAML frontmatter properties that reference attachment paths as plain strings (not wiki-links): `cover: attachments/photo.jpg`
- Custom plugin-managed references (Excalidraw auto-exported sidecars, Web Clipper metadata)

Attachments referenced only via these patterns will not appear in `cache.embeds` and will be flagged as orphans. The same bug is documented in oz-clear-unused-images (issues #40, #48, #51, #52) and is the most common source of data loss in orphan cleanup plugins.

**Why it happens:**
Developers trust that `getFileCache().embeds` captures all references. It captures only references that Obsidian's own parser recognizes in Obsidian-format markdown. Raw HTML and plain-string frontmatter are outside Obsidian's link graph.

**How to avoid:**
After building the cache-based reference set, additionally scan raw file content with a regex pass for HTML `src=` and `href=` attributes, and for frontmatter values that match known attachment paths. At minimum, apply the same regex-based extraction used in the existing `parser.ts` module to scan all vault markdown files for HTML img tags:

```typescript
// After cache-based scan, add raw HTML img scan
for (const mdFile of this.app.vault.getMarkdownFiles()) {
  const content = await this.app.vault.cachedRead(mdFile);
  const htmlImgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlImgRegex.exec(content)) !== null) {
    const dest = this.app.vault.getAbstractFileByPath(normalizePath(m[1]));
    if (dest instanceof TFile) referencedPaths.add(dest.path);
  }
}
```

For this project specifically: the v1.0 download feature uses the existing `parser.ts` which already handles HTML img tags. Reusing that parser for the orphan scan prevents the asymmetry where downloaded images could be found and orphaned in the same session.

**Warning signs:**
- Vault contains notes with HTML img tags that reference local images
- `getFileCache().embeds` is the only reference-detection mechanism
- Users with Web Clipper or Excalidraw report false-positive deletions

**Phase to address:** Phase 1 of v1.1 — reference scanning completeness

---

### Pitfall C6: Permanent Deletion Without Per-File Confirmation or Undo Path

**What goes wrong:**
Bulk permanent deletion with no undo path and no dry-run is catastrophic when the orphan detection has false positives (and it will — see C5). One confirmed false positive during permanent-delete mode destroys data with no recovery. The user who reported the third-party plugin failure was lucky it crashed rather than silently deleting files.

**Why it happens:**
Permanent delete is offered as a convenience alongside trash options. Implementing it is a single `vault.delete(file)` call — trivial to add, dangerous to get wrong. Developers ship it without enforcing a safe default or confirmation step.

**How to avoid:**
- Default the cleanup method to "Move to Obsidian trash" (`vault.trash(file, false)`), never to permanent delete
- Require permanent delete to be explicitly opt-in via settings, with a visible warning in the settings UI ("Files cannot be recovered")
- Always show the orphan list to the user before any deletion occurs — never auto-delete on scan completion
- Do not offer permanent delete until vault-trash mode has been validated in earlier phases
- Consider adding a "dry run" command that only shows the list without offering delete

**Warning signs:**
- Default setting is permanent delete or system trash
- No confirmation step between "scan complete" and "delete now"
- Orphan list UI has a "delete all" button with no per-item granularity

**Phase to address:** Phase 2 of v1.1 — confirmation UI and deletion execution

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Only scan attachment folder, not full vault | Faster scan for large vaults | Misses images saved to vault root or custom attachment paths; orphan report is incomplete | Never — attachment folder path is configurable per-folder in Obsidian 1.x |
| Trust `resolvedLinks` alone for reference detection | No need to iterate `getFileCache()` | Every embedded image falsely marked as orphan (see C2) | Never |
| Skip canvas file scanning | Simpler implementation | Canvas-embedded images deleted if not also in markdown | Never — canvas is a first-class Obsidian feature |
| Permanent delete as default | Simpler UX (no trash management) | Catastrophic on any false positive; no undo | Never in v1.1; defer until scanning is proven accurate |
| Build reference set from regex on raw content only | Simpler than MetadataCache API | Code blocks and commented-out links treated as active references | Acceptable as a supplemental pass alongside cache-based detection |
| Read all files with `vault.read()` instead of `cachedRead()` | Always gets latest disk state | Slower; unnecessary for files not modified outside Obsidian | Use `cachedRead()` for the scan pass; only use `vault.read()` for files you then modify |

---

## Integration Gotchas

Common mistakes when connecting to Obsidian's APIs for this feature.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `vault.trash()` | Calling without checking `.trash` folder existence | Check `adapter.exists('.trash')`, mkdir if absent, then trash |
| `vault.trash()` | Using `useSystemTrash: true` without checking OS support | Default to `false` (Obsidian trash); expose system trash as opt-in with a warning that it can fail silently on some OSes |
| `metadataCache` | Using `resolvedLinks` for attachment detection | Use `getFileCache(file).embeds` with `getFirstLinkpathDest()` resolution |
| `metadataCache` | Reading it before `'resolved'` event fires | Wait for `metadataCache.on('resolved', ...)` or check `Object.keys(resolvedLinks).length > 0` |
| `vault.getFiles()` | Including `.obsidian/` config files in the scan candidate list | Filter to attachment extensions only; exclude `.obsidian/` path prefix and `.trash/` prefix |
| Modal confirmation UI | Using a plain `Notice` for the orphan list | Use a `Modal` (extends the Obsidian Modal class) so the list is scrollable and per-item selection is possible |
| `vault.delete()` | Using it directly as the default delete method | Use `vault.trash(file, false)` as the safe default; `vault.delete()` only when user explicitly configures permanent delete |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `vault.read()` every file to scan for HTML img references | Disk I/O blocks the UI; vault appears frozen during scan | Use `cachedRead()` for read-only scan pass | ~500+ markdown files |
| Serial per-file `await vault.read()` in a loop with no batching | Scan takes 30–60 seconds in large vaults | Use `Promise.all` with a concurrency cap (reuse the existing `concurrency` setting) | ~200+ files |
| Re-running the full scan on every command invocation with no caching | Re-reading unchanged files each time | Cache scan results in memory; invalidate on `vault.on('modify'/'create'/'delete')` events | Irrelevant for manual-trigger command; only matters if auto-scan is added later |
| Building the orphan list in a single synchronous block | UI freezes during MetadataCache iteration | Use `app.vault.getMarkdownFiles()` + async read loop; yield with `await Promise.resolve()` periodically for large vaults | ~1000+ files |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw vault paths in the orphan list (e.g., `attachments/img-1712600000000.png`) | User cannot identify which images to keep | Show file name, file size, and a thumbnail (Obsidian provides `vault.getResourcePath()` for local image preview) |
| Single "Delete All" button with no per-item granularity | One false positive forces user to choose between losing that file or skipping the whole cleanup | Show checkboxes per file; default all checked; allow uncheck before confirming |
| Starting deletion immediately after scan with no intermediate confirmation screen | User cannot review the list before irreversible action | Always show list → confirm → delete, never scan → delete in one step |
| Progress feedback only at end ("Deleted 12 files") | For large cleanups, the command appears to hang | Show a progress Notice while deletion is running, updated per file |
| Confusing terminology: "orphan", "unused", "unreferenced" | Users unsure what qualifies as orphaned | Use consistent language: "attachments not referenced by any note in your vault" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Orphan scan:** Verify `cache.embeds` is used in addition to `cache.links` — verify by downloading an image in v1.0, then running the orphan scan and confirming the downloaded file does NOT appear as orphaned
- [ ] **Canvas support:** Verify canvas file nodes are scanned — verify by creating a canvas, adding an image node, running the scan, and confirming that image is NOT listed as orphaned
- [ ] **HTML img support:** Verify HTML `<img src="...">` tags are detected — verify by manually inserting `<img src="attachments/test.png">` in a note and confirming that file is NOT listed
- [ ] **.trash folder creation:** Verify first-run works on a vault with no `.trash` folder — verify by deleting `.trash/` manually, then running cleanup, and confirming no ENOENT error
- [ ] **System trash option:** Verify system trash fallback behavior — if system trash fails, the plugin should catch the error and offer to use Obsidian trash instead, not silently succeed with a no-op
- [ ] **Empty orphan list:** Verify the plugin handles zero orphans gracefully — should show "No orphaned attachments found" Notice, not crash or show an empty modal
- [ ] **Confirmation before delete:** Verify no file is deleted without the user seeing the list and pressing confirm — scan result alone must not trigger deletion
- [ ] **MetadataCache null check:** Verify `getFileCache()` returning `null` does not crash the scan — every call must be null-guarded

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ENOENT on vault.trash | LOW | Catch exception, show actionable Notice: "Could not move to Obsidian trash. Try enabling Obsidian trash in Settings > Files & Links first." |
| False positive deletion via Obsidian trash | LOW | Files are in `.trash/` folder — user can recover via Obsidian Trash Explorer plugin or by browsing `.trash/` in the system file manager |
| False positive deletion via system trash | LOW–MEDIUM | Files are in OS recycle bin — recoverable before bin is emptied |
| False positive deletion via permanent delete | HIGH | No automated recovery; user must restore from vault backup or sync history (iCloud, Obsidian Sync, Git) |
| Cache not populated — scan returns all files as orphaned | LOW | Cancel deletion before confirming, restart Obsidian and retry; fix is to wait for `'resolved'` event in the scan orchestrator |
| Canvas attachments deleted | MEDIUM | Re-download or re-import from source; canvas references break until restored |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| C1: vault.trash ENOENT on missing .trash folder | Phase 04-01 (deletion execution) | Test on vault with no .trash folder; confirm no ENOENT |
| C2: resolvedLinks misses embeds | Phase 04-01 (reference scanning) | Download an image via v1.0 command, run orphan scan, confirm it is NOT listed |
| C3: Canvas file references missed | Phase 04-01 (reference scanning) | Add image to canvas, run scan, confirm image NOT listed as orphan |
| C4: MetadataCache not populated | Phase 04-01 (scan orchestrator) | Invoke scan immediately after vault opens on large vault; confirm no false positives |
| C5: HTML img and frontmatter references invisible | Phase 04-01 (reference scanning) | Insert HTML img tag referencing local file, run scan, confirm NOT listed |
| C6: Permanent delete without confirmation | Phase 04-02 (confirmation UI + settings) | Verify default is Obsidian trash; verify permanent delete requires Settings opt-in and shows warning |

---

## Sources

- [oz-clear-unused-images GitHub Issues — HTML img false positives (#40, #48, #51)](https://github.com/ozntel/oz-clear-unused-images-obsidian/issues) — HIGH confidence (confirmed real-world bug reports)
- [clean-unused-attachments v2.0 "Actually Works Now" release note](https://github.com/sense5/clean-unused-attachments) — MEDIUM confidence (implies prior versions had scanning correctness issues)
- [Obsidian Forum — Problem with Image Loss (Custom Attachment Location + Clear Unused Images)](https://forum.obsidian.md/t/problem-with-image-loss-when-using-custom-attachment-location-and-clear-unused-images/107875) — HIGH confidence (data loss report)
- [Obsidian Developer Docs — MetadataCache resolvedLinks](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks) — HIGH confidence (official)
- [Obsidian Developer Docs — getFileCache](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/getFileCache) — HIGH confidence (official)
- [DeepWiki — MetadataCache and Link Resolution](https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution) — HIGH confidence (resolvedLinks does not include embeds — confirmed)
- [Obsidian Developer Docs — vault.trash](https://docs.obsidian.md/Reference/TypeScript+API/Vault/trash) — HIGH confidence (official)
- [Obsidian Forum — System trash setting ignored on Windows and Android](https://forum.obsidian.md/t/system-trash-setting-is-ignored-on-windows-and-on-android/103076) — HIGH confidence (confirmed bug: system trash falls back to Obsidian trash silently)
- [Obsidian Forum — .trash folder creation and access](https://forum.obsidian.md/t/how-to-access-trash-in-vault/4693) — HIGH confidence (confirmed .trash not pre-created)
- [obsidian-community-lib — waitForResolvedLinks utility](https://obsidian-community.github.io/obsidian-community-lib/modules.html) — MEDIUM confidence (community utility confirming the timing issue is well-known enough to warrant a library helper)
- [Obsidian Forum — Adopt Orphan plugin — uses MetadataCache for links to avoid codeblock false positives](https://github.com/obsidianmd/obsidian-releases/pull/6707) — MEDIUM confidence (confirms MetadataCache-based approach over raw regex for reference detection)
- [Obsidian Help — Canvas format is JSON with file nodes](https://help.obsidian.md/plugins/canvas) — HIGH confidence (official; canvas references are not standard markdown embeds)

---
*Pitfalls research for: Obsidian plugin — orphaned attachment scanning and cleanup (v1.1 milestone)*
*Researched: 2026-04-10*
