import { App, TFile, normalizePath } from 'obsidian';

/**
 * Represents an orphaned attachment file — a vault file not referenced
 * by any document. Used by Phase 6 confirmation modal and Phase 7 deletion.
 */
export interface OrphanedFile {
  file: TFile;    // TFile reference for Phase 6 modal display and Phase 7 deletion
  size: number;   // file.stat.size in bytes for Phase 6 modal display
}

/**
 * Main entry point: waits for MetadataCache readiness, builds the complete
 * reference set from all 5 sources, then returns all attachment files not
 * included in that reference set.
 *
 * @param app        Obsidian App instance
 * @param exclusions Additional folder paths to exclude (Phase 5 user config)
 */
export async function scanOrphanedAttachments(
  app: App,
  exclusions: string[] = []
): Promise<OrphanedFile[]> {
  await waitForCache(app);
  const referencedPaths = await buildReferencedSet(app);
  return collectOrphans(app, referencedPaths, exclusions);
}

/**
 * Waits until MetadataCache is ready before scanning.
 * If resolvedLinks is already populated, resolves immediately (D-07).
 * Otherwise, registers a one-time 'resolved' listener.
 */
export async function waitForCache(app: App): Promise<void> {
  return new Promise(resolve => {
    if (Object.keys(app.metadataCache.resolvedLinks).length > 0) {
      resolve();
      return;
    }
    // Use let so the ref is assigned before the callback could fire synchronously
    let ref: ReturnType<typeof app.metadataCache.on>;
    ref = app.metadataCache.on('resolved', () => {
      app.metadataCache.offref(ref);
      resolve();
    });
  });
}

/**
 * Builds a Set of vault-relative file paths that are referenced by at least
 * one document. Covers all 5 reference sources (D-05, SCAN-05):
 *
 *   1. MetadataCache links (wikilinks, markdown links)
 *   2. MetadataCache embeds (![[...]], ![](...)  )
 *   3. MetadataCache frontmatterLinks
 *   4. HTML <img src="..."> local references (C5 — invisible to MetadataCache)
 *   5. Canvas JSON file nodes (C3 — getMarkdownFiles() excludes .canvas files)
 */
export async function buildReferencedSet(app: App): Promise<Set<string>> {
  const referencedPaths = new Set<string>();

  // Sources 1–3: MetadataCache links, embeds, frontmatterLinks
  for (const mdFile of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(mdFile);
    if (!cache) continue; // null-guard: C4 — skip files not yet indexed

    for (const link of cache.links ?? []) {
      const dest = app.metadataCache.getFirstLinkpathDest(link.link, mdFile.path);
      if (dest) referencedPaths.add(dest.path);
    }

    for (const embed of cache.embeds ?? []) {
      const dest = app.metadataCache.getFirstLinkpathDest(embed.link, mdFile.path);
      if (dest) referencedPaths.add(dest.path);
    }

    for (const fmLink of cache.frontmatterLinks ?? []) {
      const dest = app.metadataCache.getFirstLinkpathDest(fmLink.link, mdFile.path);
      if (dest) referencedPaths.add(dest.path);
    }
  }

  // Source 4: HTML <img src="..."> local references (C5)
  // The parser.ts HTML_IMG_RE only keeps http/https; here we invert: keep LOCAL src values.
  const HTML_LOCAL_IMG_RE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*\/?>/gi;
  for (const mdFile of app.vault.getMarkdownFiles()) {
    const content = await app.vault.cachedRead(mdFile); // D-08: cachedRead, never vault.read()
    HTML_LOCAL_IMG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HTML_LOCAL_IMG_RE.exec(content)) !== null) {
      const src = m[1] ?? m[2] ?? m[3];
      if (!src) continue;
      // Skip remote URLs and data URIs — only local vault paths matter here
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) continue;
      const dest = app.vault.getAbstractFileByPath(normalizePath(src));
      if (dest instanceof TFile) referencedPaths.add(dest.path);
    }
  }

  // Source 5: Canvas JSON file nodes (C3 — .canvas files not returned by getMarkdownFiles)
  const canvasFiles = app.vault.getFiles().filter(f => f.extension === 'canvas');
  for (const cf of canvasFiles) {
    const raw = await app.vault.cachedRead(cf); // D-08
    try {
      const data = JSON.parse(raw) as { nodes?: Array<{ type: string; file?: string }> };
      for (const node of data.nodes ?? []) {
        if (node.type === 'file' && node.file) {
          const dest = app.vault.getAbstractFileByPath(normalizePath(node.file));
          if (dest instanceof TFile) referencedPaths.add(dest.path);
        }
      }
    } catch {
      // Malformed canvas JSON — skip silently (not a crash condition)
      console.warn(`[scanner] Skipping malformed canvas file: ${cf.path}`);
    }
  }

  return referencedPaths;
}

/**
 * Iterates all vault files and collects those that are not in the reference
 * set and not excluded by type, dot-dir rule, or user exclusion list.
 *
 * @param app            Obsidian App instance
 * @param referencedPaths  Set of paths known to be referenced
 * @param exclusions     User-configured folder exclusion list (D-04)
 */
export function collectOrphans(
  app: App,
  referencedPaths: Set<string>,
  exclusions: string[]
): OrphanedFile[] {
  const orphans: OrphanedFile[] = [];

  for (const file of app.vault.getFiles()) {
    // SCAN-03, D-02: skip Markdown and Canvas document types
    if (file.extension === 'md' || file.extension === 'canvas') continue;

    // D-03: skip dot-prefixed directories unconditionally
    if (isDotPrefixedDir(file.path)) continue;

    // D-04: skip user-configured exclusions
    if (exclusions.some(ex => {
      const prefix = ex.endsWith('/') ? ex : ex + '/';
      return file.path.startsWith(prefix) || file.path === ex;
    })) continue;

    // If not referenced, it is an orphan
    if (!referencedPaths.has(file.path)) {
      orphans.push({ file, size: file.stat.size });
    }
  }

  return orphans;
}

/**
 * Returns true if any segment of the given vault-relative path starts with
 * a dot. This catches .obsidian/, .trash/, .git/ at any nesting level (D-03).
 *
 * Examples:
 *   ".obsidian/config.json" → true   (root dot-dir)
 *   "notes/.git/HEAD"       → true   (nested dot-dir)
 *   "attachments/image.png" → false
 */
export function isDotPrefixedDir(filePath: string): boolean {
  return filePath.split('/').some(segment => segment.startsWith('.'));
}
