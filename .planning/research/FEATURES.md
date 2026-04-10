# Feature Research

**Domain:** Obsidian plugin — orphaned attachment scanning and cleanup
**Researched:** 2026-04-10
**Confidence:** HIGH (multiple mature plugins surveyed, Obsidian API docs confirmed)

---

## Context: What Already Exists

The following features are **already built** in v1.0 and are NOT targets for this milestone:

- Command palette command to download remote images in the active document
- Parser for Markdown `![](url)`, Wiki `![[url]]`, base64, and HTML `<img>` references
- Downloader with concurrency control and error handling
- Document replacement (in-place URL substitution with local paths)
- Settings tab with naming strategy and concurrency controls

This milestone (v1.1) adds **orphaned attachment cleanup** on top of that foundation.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the Obsidian community considers standard based on survey of five existing cleanup plugins (Clean Unused Attachments, Nuke Orphans, File Cleaner, Clear Unused Images, Find Unlinked Files).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Vault-wide orphan scan | Every existing cleanup plugin offers this as the primary command; users have no other discoverable way to find unreferenced files | LOW | `app.vault.getFiles()` + iterate `app.metadataCache.resolvedLinks` to build referenced-file set; files not in set are orphans |
| Preview list before deletion | Multiple forum threads show users fear accidental data loss; "always ask before trashing" is the stated design of Nuke Orphans; preview is step 2 of Clean Unused Attachments' 5-step flow | MEDIUM | Modal or leaf pane showing file paths with file sizes; must be cancellable |
| Move to Obsidian .trash (default) | Official plugin developer docs recommend `vault.trash()` over `vault.delete()`; all mature cleanup plugins default to .trash not permanent delete | LOW | `vault.trash(file, false)` moves to `.trash` folder; this is the safest default |
| Permanent delete option (configurable) | Power users expect explicit permanent-delete opt-in; File Cleaner, Clear Unused Images, and Nuke Orphans all offer it | LOW | `vault.delete(file)` — must be behind explicit settings toggle, never the default |
| Result count Notice after cleanup | The existing v1.0 pipeline already shows Notices; users expect feedback about how many files were cleaned | LOW | `new Notice('Deleted N orphaned attachments')` — consistent with existing plugin notification pattern |
| Attachment-only scope (not all files) | Users want to clean attachments (images, PDFs, etc.) not notes; scanning all files is dangerous and unexpected | LOW | Filter by extension: images (png, jpg, gif, webp, svg, etc.) and documents (pdf); skip .md and .canvas files |

### Differentiators (Competitive Advantage)

Features that would set this plugin apart given that it integrates with the existing image-download workflow.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Current-document orphan scan | No other surveyed plugin scans per-document scope; matches the existing plugin's document-centric UX model (download command also operates on current document) | MEDIUM | Cross-reference attachments in the vault attachment folder that were previously downloaded for this document vs. what's still referenced in the current document; requires tracking which file was the "source" of a download or relying on folder conventions |
| Folder exclusion list | Clear Unused Images and Nuke Orphans both offer regex/path exclusions; users with organized vaults need to protect curated folders | LOW | Comma-separated folder paths in settings; simple prefix-match is sufficient |
| Scope-limited scan (attachment folder only) | Obsidian's default attachment folder is a known path; scanning only that folder reduces false positives and is faster | LOW | `app.vault.getAbstractFileByPath(attachmentFolderPath)` then filter `getFiles()` to that subtree |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-cleanup on file delete/rename | "It's hard to delete every attachment after deleting a note" (Obsidian forum) | Silent destructive side effects; Obsidian's own file-event system does not guarantee the deleted note's link set is fully resolved at the time of the event, making it easy to delete still-referenced files | Provide a manual command that's easy to run; project already marks this as Out of Scope for v1.1 |
| Scheduled/background cleanup | Reduce manual work for large vaults | Silent data loss; user may not notice attachments disappearing; background jobs conflict with Obsidian's own metadata resolution timing | Manual command with a low-friction shortcut is sufficient |
| Undo within the plugin (custom history) | Restore accidentally deleted files | Complexity outweighs benefit; Obsidian already has `.trash` which is the undo mechanism | Default to `.trash` so Obsidian's own trash workflow handles recovery; no custom undo needed |
| Recursive canvas/dataview reference parsing | Some users use Canvas files or Dataview queries that reference attachments not visible in markdown links | High complexity and fragile parsing; Dataview queries are dynamic and cannot be statically analyzed | Document the limitation; treat canvas embed syntax as a future enhancement |
| Cleaning attachment subfolders per note | Logseq/Roam-style one-attachment-folder-per-note organization | Obsidian allows this but the default attachment folder model is simpler; supporting both adds conditional logic throughout the scanner | Support the default flat attachment folder model; defer per-note subfolder support |

---

## Feature Dependencies

```
[Vault-wide orphan scan]
    └──requires──> [MetadataCache.resolvedLinks index built]
                       └──requires──> [Vault fully resolved (metadataCache 'resolved' event)]

[Preview list before deletion]
    └──requires──> [Vault-wide orphan scan]

[Delete action (trash / permanent)]
    └──requires──> [Preview list before deletion] (user must confirm)
    └──requires──> [Cleanup method setting]

[Current-document orphan scan]
    └──requires──> [Vault-wide orphan scan logic] (reuses same referenced-file set)
    └──enhances──> [Existing download command] (natural companion: download images then clean old ones)

[Folder exclusion list]
    └──enhances──> [Vault-wide orphan scan] (filters results before presenting to user)

[Cleanup method setting (trash vs delete)]
    └──requires──> [Existing settings tab framework] (already built — DownloadImageSettingTab)

[Result Notice]
    └──requires──> [Delete action]
```

### Dependency Notes

- **Vault-wide orphan scan requires metadataCache to be resolved:** Do not run the scan on plugin load or on a cold vault. Wait for the `resolved` event or check `app.metadataCache.resolvedLinks` is populated. Running before resolution produces false positives (unreferenced files that are actually referenced but not yet indexed).
- **Current-document scan reuses vault scan logic:** It is not a separate algorithm. The vault scan builds the complete referenced-file set; the per-document variant simply restricts the "files to check" set to attachments associated with the current document's folder or naming pattern.
- **Delete action requires user confirmation:** This is not optional. Deletion without preview is the single most complained-about pattern in the Obsidian forum threads reviewed.
- **Settings tab is already built:** Adding cleanup method and exclusion list settings extends `DownloadImageSettingTab` and `DownloadImageSettings` — no new settings infrastructure needed.

---

## MVP Definition

### Launch With (v1.1)

Minimum needed for the milestone to be useful.

- [ ] Vault-wide orphan scan command — finds all unreferenced attachments across the vault
- [ ] Preview modal showing orphan list — file paths and sizes, with ability to deselect individual files
- [ ] Cleanup method setting — "Move to .trash" (default) or "Permanent delete" (explicit opt-in)
- [ ] Execute cleanup with result Notice — "Deleted N files, moved N files to trash"
- [ ] Attachment-only filter — never scan or delete .md or .canvas files

### Add After Validation (v1.x)

- [ ] Current-document orphan scan command — add when users validate they want document-scoped cleanup; dependency on the vault scan makes this straightforward once the core is working
- [ ] Folder exclusion list in settings — add when users report false positives from curated folders

### Future Consideration (v2+)

- [ ] Canvas file link awareness — only if Canvas becomes a primary usage pattern for users of this plugin
- [ ] Per-note attachment folder support — defer until Obsidian's attachment folder configuration changes or user demand is confirmed

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Vault-wide orphan scan | HIGH | LOW | P1 |
| Preview modal before deletion | HIGH | MEDIUM | P1 |
| Move to .trash (default cleanup) | HIGH | LOW | P1 |
| Result Notice after cleanup | MEDIUM | LOW | P1 |
| Attachment-only scope filter | HIGH | LOW | P1 |
| Permanent delete opt-in setting | MEDIUM | LOW | P1 |
| Current-document orphan scan | MEDIUM | MEDIUM | P2 |
| Folder exclusion list | MEDIUM | LOW | P2 |
| Canvas link awareness | LOW | HIGH | P3 |
| Per-note attachment folder support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when core is validated
- P3: Nice to have, future milestone

---

## Competitor Feature Analysis

| Feature | Nuke Orphans | Clean Unused Attachments | Clear Unused Images | Our Approach |
|---------|--------------|--------------------------|---------------------|--------------|
| Scan scope | Whole vault | Whole vault | Whole vault | Whole vault + per-document variant |
| Preview before delete | Confirmation dialog only | Full sidebar list with thumbnails | Delete log modal | Modal list with individual deselect |
| Deletion methods | Trash only (respects Obsidian setting) | Trash + permanent | Trash + system trash + permanent | Trash (default) + permanent (settings opt-in) |
| Folder exclusion | Regex path patterns | None visible | Comma-separated list | Comma-separated list (v1.x) |
| Undo | None (rely on trash) | Built-in restore from trash | None | Rely on Obsidian .trash |
| UI surface | Command palette modal | Sidebar leaf pane | Modal | Command palette modal |
| Integration with download workflow | None | None | None | Natural companion to existing download command |

---

## Sources

- [Remove unused attachments — Obsidian Forum](https://forum.obsidian.md/t/remove-unused-attachments/4856)
- [GitHub — sense5/clean-unused-attachments](https://github.com/sense5/clean-unused-attachments)
- [GitHub — sandorex/nuke-orphans-plugin](https://github.com/sandorex/nuke-orphans-plugin)
- [GitHub — ozntel/oz-clear-unused-images-obsidian](https://github.com/ozntel/oz-clear-unused-images-obsidian)
- [MetadataCache — Obsidian Developer Docs](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache)
- [resolvedLinks — Obsidian Developer Docs](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks)
- [Vault — Obsidian Plugin Developer Docs (trash vs delete)](https://marcusolsson.github.io/obsidian-plugin-docs/vault)
- [All cleanup Obsidian plugins — ObsidianStats](https://www.obsidianstats.com/tags/cleanup)

---
*Feature research for: orphaned attachment cleanup (Obsidian plugin v1.1)*
*Researched: 2026-04-10*
