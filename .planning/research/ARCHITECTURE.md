# Architecture Research

**Domain:** Obsidian plugin — orphaned attachment scanning and cleanup (v1.1 milestone)
**Researched:** 2026-04-10
**Confidence:** HIGH (verified against official obsidian.d.ts API, existing codebase inspection, production plugin references)

---

## Context: What Already Exists

The v1.0 pipeline is a four-module architecture with clean separation. This v1.1 research covers only what is NEW or MODIFIED.

```
src/
├── main.ts        [MODIFIED]  — add two new commands; orchestrate scanner
├── parser.ts      [unchanged] — not touched; v1.1 does not re-parse in-document refs
├── downloader.ts  [unchanged] — not touched
├── replacer.ts    [unchanged] — not touched
├── settings.ts    [MODIFIED]  — add cleanupMethod setting
└── scanner.ts     [NEW]       — vault-wide orphan detection logic
    modal.ts       [NEW]       — confirmation + results UI modal
```

No existing module is removed. The two new modules are purpose-built and do not introduce cross-dependencies with the download pipeline.

---

## Standard Architecture

### System Overview — v1.1 Addition

```
┌───────────────────────────────────────────────────────────────┐
│  Obsidian Runtime                                             │
│  vault.getFiles()  metadataCache.resolvedLinks                │
└───────────────────┬───────────────────────────────────────────┘
                    │ two new commands registered in onload()
┌───────────────────▼───────────────────────────────────────────┐
│  Plugin Core  (main.ts)  [MODIFIED]                           │
│  - Existing: "Download images" command (unchanged)            │
│  - New: "Scan vault for orphaned attachments" command         │
│  - New: "Scan current note for orphaned attachments" command  │
└────────────┬───────────────────────┬──────────────────────────┘
             │                       │
             ▼                       ▼
     ┌───────────────┐     ┌──────────────────────┐
     │  scanner.ts   │     │     modal.ts          │
     │  [NEW]        │     │     [NEW]             │
     │               │     │                       │
     │  scanVault()  │────▶│  OrphanListModal      │
     │  scanNote()   │     │  - show file list     │
     └───────────────┘     │  - confirm button     │
             │             │  - run cleanup        │
             │             │  - show result Notice │
             ▼             └──────────────────────┘
     Obsidian Vault APIs
     vault.trash() / vault.delete()
```

### Component Responsibilities

| Component | File | New/Modified | Responsibility |
|-----------|------|-------------|----------------|
| Plugin Core | `src/main.ts` | MODIFIED | Register two new commands; call scanner; open confirmation modal |
| Scanner | `src/scanner.ts` | NEW | Compute orphan sets using vault + metadataCache APIs; pure logic, no UI |
| Confirmation Modal | `src/modal.ts` | NEW | Display orphan list, confirm action, execute cleanup, show result Notice |
| Settings | `src/settings.ts` | MODIFIED | Add `cleanupMethod: 'obsidian-trash' | 'permanent'` field |
| Parser, Downloader, Replacer | existing | UNCHANGED | Not involved in v1.1 |

---

## Recommended Project Structure

```
src/
├── main.ts          # Plugin class — lifecycle + command registration (existing, extended)
├── parser.ts        # Image ref extraction (unchanged)
├── downloader.ts    # Image fetch + save (unchanged)
├── replacer.ts      # Document URL replacement (unchanged)
├── settings.ts      # Settings interface + tab (modified: add cleanupMethod)
├── scanner.ts       # NEW: orphan detection — scanVault(), scanNote()
└── modal.ts         # NEW: OrphanListModal — confirmation + cleanup execution
```

### Structure Rationale

- **scanner.ts separate from main.ts:** The scanner contains non-trivial logic (set intersection, file filtering) that needs independent unit tests without Obsidian runtime. Keeping it isolated mirrors the existing pattern of parser.ts and downloader.ts.
- **modal.ts separate from scanner.ts:** UI concerns (HTML rendering, button wiring, Notice display) are isolated from scanning logic. Scanner returns a plain `TFile[]`; the modal decides what to show and what to do. This also allows the same scanner to be called from tests without pulling in Modal dependencies.
- **No new subfolders:** The project is small enough that flat `src/` is appropriate. Adding folders would be premature.

---

## Architectural Patterns

### Pattern 1: MetadataCache.resolvedLinks for Vault-Wide Reference Set

**What:** Build a Set of all vault paths that are referenced by any markdown file, then subtract from all non-markdown files to find orphans.

**When to use:** Any time the feature requires "which attachments are linked from any document."

**Trade-offs:** Fast (O(files)) and requires no file reads. resolvedLinks is pre-computed by Obsidian and updated automatically. The risk is that it only covers Obsidian-resolved internal links — raw markdown `![](path)` to local files is captured, but external URLs to remote images are not (which is correct for this use case).

**Algorithm:**
```typescript
// Build the complete set of referenced attachment paths
function findVaultOrphans(app: App): TFile[] {
    // Step 1: collect every path that appears as a link target
    const referenced = new Set<string>();
    for (const targets of Object.values(app.metadataCache.resolvedLinks)) {
        for (const targetPath of Object.keys(targets)) {
            referenced.add(targetPath);
        }
    }

    // Step 2: every non-markdown file not in referenced is an orphan
    return app.vault.getFiles().filter(file =>
        file.extension !== 'md' && !referenced.has(file.path)
    );
}
```

**Confidence:** HIGH — `MetadataCache.resolvedLinks` is `Record<string, Record<string, number>>` per official obsidian.d.ts. The outer key is source file path, inner key is destination file path, value is link count.

### Pattern 2: scanNote() via Parser Re-use + Vault File Listing

**What:** For "scan current note for orphaned attachments," find all attachment files in the vault whose path matches a local path that was previously in the document but no longer appears.

**When to use:** The "scan current note" command — finds attachments that were downloaded by this plugin into the vault but are no longer referenced by the document.

**Trade-offs:** More complex than vault-wide scan. Must parse the current document for local references, then compare against all files in the note's attachment folder. Cannot use resolvedLinks alone because that reflects the current state (the references are already gone).

**Practical approach:** Scan the attachment folder(s) associated with the current note. Any non-markdown file in those folders that is NOT referenced in resolvedLinks[currentNote.path] is a candidate orphan. This is conservative — it may surface files from other notes in the same folder. The user sees the list before any action is taken, which is the safety net.

```typescript
function findNoteOrphans(app: App, notePath: string): TFile[] {
    // References this specific note makes to other files
    const noteRefs = new Set<string>(
        Object.keys(app.metadataCache.resolvedLinks[notePath] ?? {})
    );

    // Determine the attachment folder for this note
    const attachFolder = deriveAttachmentFolder(app, notePath);

    // Files in the attachment folder not referenced by this note
    return app.vault.getFiles().filter(file =>
        file.extension !== 'md' &&
        file.path.startsWith(attachFolder) &&
        !noteRefs.has(file.path)
    );
}
```

### Pattern 3: Modal for Confirmation-Before-Destructive-Action

**What:** Extend `Modal` from `'obsidian'`; `onOpen()` renders a list of orphan file paths and two buttons (Confirm / Cancel). Confirm button executes cleanup and shows a result Notice.

**When to use:** Anytime a plugin action is destructive and irreversible (or hard to undo). Required by the v1.1 spec.

**Trade-offs:** Slightly more code than a `Notice`-only approach, but critical for user trust with file deletion. Obsidian's Modal API is simple — just `onOpen()` builds DOM, `this.close()` tears it down.

**Example structure:**
```typescript
class OrphanListModal extends Modal {
    constructor(
        app: App,
        private orphans: TFile[],
        private settings: DownloadImageSettings,
        private onConfirm: (files: TFile[]) => Promise<void>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: `${this.orphans.length} orphaned attachment(s) found` });

        const list = contentEl.createEl('ul');
        for (const file of this.orphans) {
            list.createEl('li', { text: file.path });
        }

        new ButtonComponent(contentEl)
            .setButtonText('Delete')
            .setCta()
            .onClick(async () => {
                this.close();
                await this.onConfirm(this.orphans);
            });

        new ButtonComponent(contentEl)
            .setButtonText('Cancel')
            .onClick(() => this.close());
    }

    onClose() {
        this.contentEl.empty();
    }
}
```

### Pattern 4: Cleanup via vault.trash() / vault.delete()

**What:** Use the official high-level Vault API for deletion. Do not use the adapter directly.

**When to use:** Always — for the same reasons as the existing codebase avoids `adapter.writeBinary`.

**API signatures (from official obsidian.d.ts):**
```typescript
vault.trash(file: TAbstractFile, system: boolean): Promise<void>
// system=true  → OS system trash (reversible via OS)
// system=false → Obsidian .trash folder (reversible within Obsidian)

vault.delete(file: TAbstractFile, permanent?: boolean): Promise<void>
// permanent=true  → irreversible permanent deletion
// permanent=false → same as trash(file, false) — Obsidian trash
```

**Setting mapping:**
```
cleanupMethod === 'obsidian-trash' → vault.trash(file, false)
cleanupMethod === 'permanent'      → vault.delete(file, true)
```

---

## Data Flow

### Vault-Wide Scan Command

```
User invokes "Scan vault for orphaned attachments"
    │
    ▼
main.ts command callback (no editorCallback — does not need active editor)
    │
    ▼
scanner.findVaultOrphans(app)
    │  uses: app.vault.getFiles()
    │  uses: app.metadataCache.resolvedLinks
    └── returns TFile[] (orphans)
    │
    ▼
if orphans.length === 0:
    new Notice('No orphaned attachments found')
    return
    │
    ▼
new OrphanListModal(app, orphans, settings, onConfirmCallback).open()
    │
    ▼
[user sees list, clicks Delete or Cancel]
    │
    ├── Cancel → modal.close(), done
    │
    └── Delete →
            for each orphan:
                vault.trash(file, false)  or  vault.delete(file, true)
                    (based on settings.cleanupMethod)
            new Notice(`Deleted ${n} attachment(s)`)
```

### Current-Note Scan Command

```
User invokes "Scan current note for orphaned attachments"
    │
    ▼
main.ts command callback (editorCallback — needs active markdown view)
    │  view.file?.path → notePath
    │
    ▼
scanner.findNoteOrphans(app, notePath)
    │  uses: app.metadataCache.resolvedLinks[notePath]
    │  uses: app.vault.getFiles()
    │  uses: attachment folder derivation
    └── returns TFile[] (candidates)
    │
    ▼
(same modal + cleanup flow as vault-wide scan)
```

### Settings Extension Data Flow

```
User opens Settings → plugin tab
    │
    ▼
DownloadImageSettingTab.display()
    │  renders existing: namingStrategy, concurrency
    │  renders NEW: cleanupMethod dropdown
    │       options: 'obsidian-trash' (default), 'permanent'
    │
    ▼
onChange → plugin.settings.cleanupMethod = value
         → plugin.saveSettings()
```

---

## Integration Points

### New vs Modified: Explicit Boundary

| Module | Change Type | What Changes |
|--------|------------|--------------|
| `src/settings.ts` | Modified | Add `cleanupMethod: 'obsidian-trash' \| 'permanent'` to interface + `DEFAULT_SETTINGS` + new Setting in tab |
| `src/main.ts` | Modified | Add two `addCommand` calls in `onload()`; import `scanner` and `OrphanListModal`; no changes to existing command |
| `src/scanner.ts` | New file | `findVaultOrphans(app)` and `findNoteOrphans(app, notePath)` — pure logic, no UI imports |
| `src/modal.ts` | New file | `OrphanListModal extends Modal` — UI only, no scanning logic |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `main.ts` → `scanner.ts` | Direct function call, returns `TFile[]` | Scanner receives `app` reference; does not receive settings |
| `main.ts` → `modal.ts` | Instantiate `OrphanListModal`, pass `TFile[]`, `settings`, and async confirm callback | Modal is disposable; main.ts owns the callback logic |
| `modal.ts` → vault | Via callback provided by main.ts (not direct import) | Keeps modal decoupled from cleanup strategy |
| `scanner.ts` → Obsidian API | `app.vault.getFiles()`, `app.metadataCache.resolvedLinks` | No side effects; read-only |
| `settings.ts` → `main.ts` | `DownloadImageSettings` interface extended with `cleanupMethod` | Backwards compatible via `DEFAULT_SETTINGS` |

### External API Surface (Obsidian)

| API | Source | Purpose | Confidence |
|-----|--------|---------|-----------|
| `app.vault.getFiles(): TFile[]` | `obsidian.d.ts` | Enumerate all vault files | HIGH |
| `app.metadataCache.resolvedLinks: Record<string, Record<string, number>>` | `obsidian.d.ts` | Map of all resolved internal links | HIGH |
| `vault.trash(file, system: boolean): Promise<void>` | `obsidian.d.ts` | Move to trash (Obsidian or OS) | HIGH |
| `vault.delete(file, permanent?: boolean): Promise<void>` | `obsidian.d.ts` | Delete file (permanent or Obsidian trash) | HIGH |
| `Modal` (class from `'obsidian'`) | `obsidian.d.ts` | Base for confirmation modal | HIGH |
| `ButtonComponent` (from `'obsidian'`) | `obsidian.d.ts` | Buttons in modal content | HIGH |

---

## Build Order

The dependency graph for v1.1 is shallow. Build from leaves toward the orchestrator, exactly like v1.0.

```
Step 1 — Extend settings.ts
    Add cleanupMethod field to interface, defaults, and settings tab UI
    No dependencies on new modules
    Rationale: all other modules depend on the settings type being stable

Step 2 — Implement scanner.ts
    findVaultOrphans(app) — vault-wide scan
    findNoteOrphans(app, notePath) — note-scoped scan
    Zero UI imports; can be unit tested with a mocked app object
    Rationale: pure logic, test-first, no dependencies on modal

Step 3 — Implement modal.ts
    OrphanListModal extends Modal
    Receives TFile[] and confirm callback; does not import scanner
    Rationale: depends only on the TFile type (stable from Obsidian) and settings type (stable from Step 1)

Step 4 — Wire main.ts
    Import scanner + modal; register two new commands
    The two new commands do not interfere with the existing download command
    Rationale: integration step goes last when all components have defined interfaces

Step 5 — Unit tests for scanner.ts
    Mock app.vault.getFiles() and app.metadataCache.resolvedLinks
    Test: vault-wide orphan detection, note-scoped orphan detection, edge cases (empty vault, all referenced)
    Rationale: scanner.ts is the most complex new logic; tests validate the set-difference algorithm
```

**No new external dependencies.** The scanner uses only Obsidian built-in APIs. The modal uses only Obsidian's built-in `Modal` and `ButtonComponent`. No npm packages required.

---

## Anti-Patterns

### Anti-Pattern 1: Parsing Markdown to Find References Instead of Using MetadataCache

**What people do:** Read every markdown file with `vault.read()`, regex-scan for image/link syntax, build a reference set manually.

**Why it's wrong:** Slow on large vaults (one async read per file). Duplicates logic already computed by Obsidian. Regex will miss some link formats. MetadataCache is the authoritative, pre-computed, always-current reference index.

**Do this instead:** Read `app.metadataCache.resolvedLinks` which is already populated. Zero file reads required for the scan phase.

### Anti-Pattern 2: Deleting Files Without User Confirmation

**What people do:** Immediately call `vault.delete()` in the command callback after computing orphan list.

**Why it's wrong:** Destructive and irreversible. The v1.1 spec explicitly requires showing the list before cleanup. Community plugin review guidelines flag plugins that perform destructive actions without confirmation.

**Do this instead:** Always show `OrphanListModal` first. Only delete in the `onConfirm` callback after explicit user action.

### Anti-Pattern 3: Registering the Vault-Wide Scan as an editorCallback

**What people do:** Use `editorCallback` (which requires active Markdown editor) for the vault-wide scan command.

**Why it's wrong:** Vault-wide orphan scanning does not operate on the current document. It should be available from any context — including canvas, graph view, or no active file. Using `editorCallback` would hide the command whenever no editor is open.

**Do this instead:** Use `callback` (no guard) for vault-wide scan. Use `editorCallback` only for the per-note scan, which does need to know which note is active.

### Anti-Pattern 4: Deleting via vault.adapter Directly

**What people do:** Call `app.vault.adapter.remove(path)` for permanent deletion.

**Why it's wrong:** Bypasses Obsidian's file cache and event system. Identical concern to the existing Pitfall C3 in PITFALLS.md. Will break on mobile. Does not fire vault events that other plugins (sync, backlinks) depend on.

**Do this instead:** `vault.delete(file, true)` for permanent, `vault.trash(file, false)` for Obsidian trash.

### Anti-Pattern 5: Treating All vault.getFiles() Results as Attachment Candidates

**What people do:** Mark any file not in resolvedLinks as an orphan, including `.md` files.

**Why it's wrong:** Markdown files with no incoming links are not attachments — they are valid notes. A note that no other note links to is not an "orphaned attachment."

**Do this instead:** Filter by `file.extension !== 'md'` before comparing against resolvedLinks. Optionally also exclude `.canvas`, `.json`, and plugin-specific files (though for v1.1, a conservative filter on non-markdown files is sufficient).

---

## Scaling Considerations

| Concern | Small vault (<500 files) | Large vault (5000+ files) |
|---------|--------------------------|--------------------------|
| resolvedLinks traversal | Instant | Still fast — it's an in-memory object traversal, O(links) |
| vault.getFiles() | Instant | Fast — returns cached in-memory array |
| Modal file list rendering | Fine | Consider paginating or limiting display if >100 orphans shown |
| Deletion loop | Instant for typical orphan counts | Sequential `await vault.trash()` per file; no batching needed at this scale |

The scanner does not require any optimization for realistic vault sizes. `resolvedLinks` and `getFiles()` are both synchronous reads of in-memory Obsidian state.

---

## Sources

- [obsidian.d.ts (raw)](https://raw.githubusercontent.com/obsidianmd/obsidian-api/master/obsidian.d.ts) — HIGH confidence, canonical API signatures
- [MetadataCache.resolvedLinks docs](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks) — HIGH confidence
- [Modals docs](https://docs.obsidian.md/Plugins/User+interface/Modals) — HIGH confidence
- [nuke-orphans-plugin (sandorex)](https://github.com/sandorex/nuke-orphans-plugin) — MEDIUM confidence (same problem space, TypeScript/esbuild stack)
- [find-unlinked-files (Vinzent03)](https://github.com/Vinzent03/find-unlinked-files) — MEDIUM confidence (reference implementation for resolvedLinks orphan scanning algorithm)
- [oz-clear-unused-images (ozntel)](https://github.com/ozntel/oz-clear-unused-images-obsidian) — MEDIUM confidence (reference for three-mode deletion strategy)
- [MetadataCache DeepWiki](https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution) — MEDIUM confidence (explains resolvedLinks structure and update semantics)

---

*Architecture research for: obsidian-download-image v1.1 — Clean Unused Attachments*
*Researched: 2026-04-10*
