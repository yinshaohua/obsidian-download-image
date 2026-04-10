import { describe, it, expect } from 'vitest';
import { TFile } from 'obsidian';
import {
  scanOrphanedAttachments,
  waitForCache,
  buildReferencedSet,
  collectOrphans,
  isDotPrefixedDir,
} from '../src/scanner';

// ─── Mock App Builder ────────────────────────────────────────────────────────
//
// Constructs a minimal App mock that satisfies the scanner's API surface.
// All vault/metadataCache methods are implemented as pure functions over
// the supplied fixture data. No real Obsidian instance is used.

interface MockCacheData {
  links?: Array<{ link: string }>;
  embeds?: Array<{ link: string }>;
  frontmatterLinks?: Array<{ link: string }>;
}

interface MockAppOptions {
  files: TFile[];
  markdownFiles: TFile[];
  caches: Map<string, MockCacheData>;
  canvasContent?: Record<string, string>;
  markdownContent?: Record<string, string>;
  resolvedLinksEmpty?: boolean;
}

function buildMockApp(opts: MockAppOptions): unknown {
  const {
    files,
    markdownFiles,
    caches,
    canvasContent = {},
    markdownContent = {},
    resolvedLinksEmpty = false,
  } = opts;

  return {
    vault: {
      getFiles: () => files,
      getMarkdownFiles: () => markdownFiles,
      getAbstractFileByPath: (p: string) => files.find(f => f.path === p) ?? null,
      cachedRead: async (file: TFile) => {
        if (canvasContent[file.path] !== undefined) return canvasContent[file.path];
        if (markdownContent[file.path] !== undefined) return markdownContent[file.path];
        return '';
      },
    },
    metadataCache: {
      resolvedLinks: resolvedLinksEmpty ? {} : { 'dummy.md': {} },
      on: (_evt: string, cb: () => void) => {
        cb(); // simulate immediate resolution in tests
        return { id: 'ref' };
      },
      offref: () => {},
      getFileCache: (file: TFile) => caches.get(file.path) ?? null,
      getFirstLinkpathDest: (link: string, _src: string) =>
        files.find(f => f.path === link || f.name === link) ?? null,
    },
  };
}

// ─── isDotPrefixedDir ────────────────────────────────────────────────────────

describe('isDotPrefixedDir', () => {
  it('returns true for root dot-dir (.obsidian/...)', () => {
    expect(isDotPrefixedDir('.obsidian/config.json')).toBe(true);
  });

  it('returns true for nested dot-dir (notes/.git/HEAD)', () => {
    expect(isDotPrefixedDir('notes/.git/HEAD')).toBe(true);
  });

  it('returns true for .trash directory', () => {
    expect(isDotPrefixedDir('.trash/deleted.png')).toBe(true);
  });

  it('returns false for normal top-level path', () => {
    expect(isDotPrefixedDir('attachments/image.png')).toBe(false);
  });

  it('returns false for normal nested path', () => {
    expect(isDotPrefixedDir('folder/subfolder/photo.jpg')).toBe(false);
  });
});

// ─── scanOrphanedAttachments ─────────────────────────────────────────────────

describe('scanOrphanedAttachments', () => {

  // ── SCAN-01: vault-wide orphan identification ──────────────────────────────

  describe('SCAN-01: vault-wide orphan identification', () => {
    it('returns empty array when all attachments are referenced', async () => {
      const img1 = new TFile('attachments/a.png', 1000);
      const img2 = new TFile('attachments/b.png', 2000);
      const img3 = new TFile('attachments/c.png', 3000);
      const md1 = new TFile('note1.md', 500);
      const md2 = new TFile('note2.md', 500);
      const md3 = new TFile('note3.md', 500);
      const caches = new Map<string, MockCacheData>([
        ['note1.md', { embeds: [{ link: 'attachments/a.png' }] }],
        ['note2.md', { embeds: [{ link: 'attachments/b.png' }] }],
        ['note3.md', { embeds: [{ link: 'attachments/c.png' }] }],
      ]);
      const app = buildMockApp({
        files: [img1, img2, img3, md1, md2, md3],
        markdownFiles: [md1, md2, md3],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
    });

    it('returns exactly the unreferenced file when one of three is orphaned', async () => {
      const img1 = new TFile('attachments/referenced1.png', 1000);
      const img2 = new TFile('attachments/referenced2.png', 2000);
      const img3 = new TFile('attachments/orphan.png', 3000);
      const md1 = new TFile('note1.md', 500);
      const md2 = new TFile('note2.md', 500);
      const caches = new Map<string, MockCacheData>([
        ['note1.md', { embeds: [{ link: 'attachments/referenced1.png' }] }],
        ['note2.md', { embeds: [{ link: 'attachments/referenced2.png' }] }],
      ]);
      const app = buildMockApp({
        files: [img1, img2, img3, md1, md2],
        markdownFiles: [md1, md2],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
      expect(result[0]?.file.path).toBe('attachments/orphan.png');
      expect(result[0]?.size).toBe(3000);
    });

    it('returns empty array when vault has no attachment files', async () => {
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [md],
        markdownFiles: [md],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
    });
  });

  // ── SCAN-03: attachment-only scope ────────────────────────────────────────

  describe('SCAN-03: attachment-only scope', () => {
    it('never returns .md files even if unreferenced by other documents', async () => {
      const unreferencedMd = new TFile('standalone.md', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [unreferencedMd],
        markdownFiles: [unreferencedMd],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.extension)).not.toContain('md');
    });

    it('never returns .canvas files even if not referenced', async () => {
      const canvas = new TFile('board.canvas', 300);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [canvas],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.extension)).not.toContain('canvas');
    });

    it('identifies orphaned .pdf, .mp3, and other non-document types', async () => {
      const pdf = new TFile('docs/report.pdf', 1000);
      const mp3 = new TFile('audio/track.mp3', 2000);
      const img = new TFile('images/photo.png', 3000);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [pdf, mp3, img],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(3);
      const paths = result.map(r => r.file.path);
      expect(paths).toContain('docs/report.pdf');
      expect(paths).toContain('audio/track.mp3');
      expect(paths).toContain('images/photo.png');
    });
  });

  // ── SCAN-04: MetadataCache readiness ─────────────────────────────────────

  describe('SCAN-04: MetadataCache readiness', () => {
    it('proceeds immediately when resolvedLinks is non-empty', async () => {
      const img = new TFile('attachments/img.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [img],
        markdownFiles: [],
        caches,
        resolvedLinksEmpty: false,
      });
      // Should resolve without hanging
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
    });

    it('waits for resolved event when resolvedLinks is empty', async () => {
      const img = new TFile('attachments/img.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [img],
        markdownFiles: [],
        caches,
        resolvedLinksEmpty: true,
      });
      // buildMockApp's on('resolved', cb) calls cb() synchronously,
      // so waitForCache will unblock and scan will proceed normally
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
    });
  });

  // ── SCAN-05: reference detection — all 5 sources ─────────────────────────

  describe('SCAN-05: reference detection — all 5 sources', () => {
    it('detects references from cache.links (wikilinks)', async () => {
      const img = new TFile('attachments/linked.png', 1000);
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>([
        ['note.md', { links: [{ link: 'attachments/linked.png' }] }],
      ]);
      const app = buildMockApp({
        files: [img, md],
        markdownFiles: [md],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result.map(r => r.file.path)).not.toContain('attachments/linked.png');
    });

    it('detects references from cache.embeds (image embeds)', async () => {
      const img = new TFile('attachments/embedded.png', 1000);
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>([
        ['note.md', { embeds: [{ link: 'attachments/embedded.png' }] }],
      ]);
      const app = buildMockApp({
        files: [img, md],
        markdownFiles: [md],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result.map(r => r.file.path)).not.toContain('attachments/embedded.png');
    });

    it('detects references from cache.frontmatterLinks', async () => {
      const img = new TFile('attachments/fm-ref.png', 1000);
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>([
        ['note.md', { frontmatterLinks: [{ link: 'attachments/fm-ref.png' }] }],
      ]);
      const app = buildMockApp({
        files: [img, md],
        markdownFiles: [md],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result.map(r => r.file.path)).not.toContain('attachments/fm-ref.png');
    });

    it('detects local HTML img src references', async () => {
      const img = new TFile('attachments/photo.png', 1000);
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>([['note.md', {}]]);
      const app = buildMockApp({
        files: [img, md],
        markdownFiles: [md],
        caches,
        markdownContent: {
          'note.md': '<p>See image: <img src="attachments/photo.png" alt="photo"></p>',
        },
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result.map(r => r.file.path)).not.toContain('attachments/photo.png');
    });

    it('detects canvas JSON file node references', async () => {
      const img = new TFile('attachments/canvas-img.png', 1000);
      const canvas = new TFile('board.canvas', 300);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [img, canvas],
        markdownFiles: [],
        caches,
        canvasContent: {
          'board.canvas': JSON.stringify({
            nodes: [
              { id: '1', type: 'file', file: 'attachments/canvas-img.png', x: 0, y: 0, width: 400, height: 300 },
              { id: '2', type: 'text', text: 'Hello world' },
            ],
            edges: [],
          }),
        },
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result.map(r => r.file.path)).not.toContain('attachments/canvas-img.png');
    });
  });

  // ── D-03: dot-directory exclusion ─────────────────────────────────────────

  describe('D-03: dot-directory exclusion', () => {
    it('excludes files in .obsidian/ directory', async () => {
      const obsidianFile = new TFile('.obsidian/plugins/plugin.js', 100);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [obsidianFile],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.path)).not.toContain('.obsidian/plugins/plugin.js');
    });

    it('excludes files in .trash/ directory', async () => {
      const trashFile = new TFile('.trash/deleted.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [trashFile],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.path)).not.toContain('.trash/deleted.png');
    });

    it('excludes files in nested dot-prefixed directory (notes/.hidden/x.png)', async () => {
      const nestedDotFile = new TFile('notes/.hidden/secret.png', 800);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [nestedDotFile],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.path)).not.toContain('notes/.hidden/secret.png');
    });
  });

  // ── D-04: user-configurable exclusions ────────────────────────────────────

  describe('D-04: user-configurable exclusions', () => {
    it('excludes files under a user-specified folder', async () => {
      const privateImg = new TFile('private/secret.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [privateImg],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, ['private']);
      expect(result).toHaveLength(0);
      expect(result.map(r => r.file.path)).not.toContain('private/secret.png');
    });

    it('does not exclude files outside the specified folder', async () => {
      const publicImg = new TFile('public/photo.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [publicImg],
        markdownFiles: [],
        caches,
      });
      const result = await scanOrphanedAttachments(app as never, ['private']);
      expect(result).toHaveLength(1);
      expect(result[0]?.file.path).toBe('public/photo.png');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles malformed canvas JSON without crashing', async () => {
      const canvas = new TFile('board.canvas', 100);
      const orphan = new TFile('attachments/orphan.png', 500);
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [canvas, orphan],
        markdownFiles: [],
        caches,
        canvasContent: {
          'board.canvas': 'not valid json{{',
        },
      });
      // Should not throw; orphan is still detected after malformed canvas is skipped
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
      expect(result[0]?.file.path).toBe('attachments/orphan.png');
    });

    it('skips files where getFileCache returns null (no crash)', async () => {
      const img = new TFile('attachments/img.png', 500);
      const md = new TFile('note.md', 500);
      // No cache entry -> getFileCache returns null for note.md
      const caches = new Map<string, MockCacheData>();
      const app = buildMockApp({
        files: [img, md],
        markdownFiles: [md],
        caches,
      });
      // img is unreferenced; null cache for md must not crash
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
      expect(result[0]?.file.path).toBe('attachments/img.png');
    });

    it('filters out http/https/data src from HTML img scan (only local paths count)', async () => {
      // These remote/data URIs must NOT add anything to the reference set
      const localOrphan = new TFile('attachments/local.png', 500);
      const md = new TFile('note.md', 500);
      const caches = new Map<string, MockCacheData>([['note.md', {}]]);
      const app = buildMockApp({
        files: [localOrphan, md],
        markdownFiles: [md],
        caches,
        markdownContent: {
          'note.md': [
            '<img src="https://example.com/remote.png">',
            '<img src="http://cdn.example.com/img.jpg">',
            '<img src="data:image/png;base64,abc123==">',
          ].join('\n'),
        },
      });
      // No local img referenced, so localOrphan must still appear as orphan
      const result = await scanOrphanedAttachments(app as never, []);
      expect(result).toHaveLength(1);
      expect(result[0]?.file.path).toBe('attachments/local.png');
    });
  });
});

// ─── waitForCache (unit) ─────────────────────────────────────────────────────

describe('waitForCache', () => {
  it('resolves immediately when resolvedLinks is non-empty', async () => {
    const app = buildMockApp({
      files: [],
      markdownFiles: [],
      caches: new Map(),
      resolvedLinksEmpty: false,
    });
    await expect(waitForCache(app as never)).resolves.toBeUndefined();
  });

  it('resolves after resolved event when resolvedLinks is empty', async () => {
    const app = buildMockApp({
      files: [],
      markdownFiles: [],
      caches: new Map(),
      resolvedLinksEmpty: true,
    });
    await expect(waitForCache(app as never)).resolves.toBeUndefined();
  });
});

// ─── buildReferencedSet (unit) ────────────────────────────────────────────────

describe('buildReferencedSet', () => {
  it('finds paths from cache.links', async () => {
    const img = new TFile('attachments/linked.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([
      ['note.md', { links: [{ link: 'attachments/linked.png' }] }],
    ]);
    const app = buildMockApp({ files: [img, md], markdownFiles: [md], caches });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/linked.png')).toBe(true);
  });

  it('finds paths from cache.embeds', async () => {
    const img = new TFile('attachments/embed.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([
      ['note.md', { embeds: [{ link: 'attachments/embed.png' }] }],
    ]);
    const app = buildMockApp({ files: [img, md], markdownFiles: [md], caches });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/embed.png')).toBe(true);
  });

  it('finds paths from cache.frontmatterLinks', async () => {
    const img = new TFile('attachments/fm.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([
      ['note.md', { frontmatterLinks: [{ link: 'attachments/fm.png' }] }],
    ]);
    const app = buildMockApp({ files: [img, md], markdownFiles: [md], caches });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/fm.png')).toBe(true);
  });

  it('finds local HTML img src paths', async () => {
    const img = new TFile('attachments/local.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([['note.md', {}]]);
    const app = buildMockApp({
      files: [img, md],
      markdownFiles: [md],
      caches,
      markdownContent: { 'note.md': '<img src="attachments/local.png" alt="x">' },
    });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/local.png')).toBe(true);
  });

  it('ignores http/https img src (not local references)', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([['note.md', {}]]);
    const app = buildMockApp({
      files: [md],
      markdownFiles: [md],
      caches,
      markdownContent: { 'note.md': '<img src="https://example.com/img.png">' },
    });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.size).toBe(0);
  });

  it('ignores data: URI img src', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>([['note.md', {}]]);
    const app = buildMockApp({
      files: [md],
      markdownFiles: [md],
      caches,
      markdownContent: { 'note.md': '<img src="data:image/png;base64,abc123">' },
    });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.size).toBe(0);
  });

  it('finds canvas JSON file node references', async () => {
    const img = new TFile('attachments/canvas-img.png', 1000);
    const canvas = new TFile('board.canvas', 300);
    const caches = new Map<string, MockCacheData>();
    const app = buildMockApp({
      files: [img, canvas],
      markdownFiles: [],
      caches,
      canvasContent: {
        'board.canvas': JSON.stringify({
          nodes: [
            { id: '1', type: 'file', file: 'attachments/canvas-img.png', x: 0, y: 0, width: 400, height: 300 },
            { id: '2', type: 'text', text: 'Note' },
          ],
          edges: [],
        }),
      },
    });
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/canvas-img.png')).toBe(true);
  });

  it('silently skips malformed canvas JSON without crashing', async () => {
    const canvas = new TFile('board.canvas', 100);
    const caches = new Map<string, MockCacheData>();
    const app = buildMockApp({
      files: [canvas],
      markdownFiles: [],
      caches,
      canvasContent: { 'board.canvas': '{ this is not valid json >>>' },
    });
    await expect(buildReferencedSet(app as never)).resolves.toBeDefined();
  });

  it('handles null getFileCache gracefully (no crash)', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, MockCacheData>(); // no entry -> returns null
    const app = buildMockApp({ files: [md], markdownFiles: [md], caches });
    await expect(buildReferencedSet(app as never)).resolves.toBeDefined();
  });
});

// ─── collectOrphans (unit) ───────────────────────────────────────────────────

describe('collectOrphans', () => {
  it('skips .md files unconditionally', () => {
    const md = new TFile('note.md', 500);
    const app = buildMockApp({ files: [md], markdownFiles: [md], caches: new Map() });
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips .canvas files unconditionally', () => {
    const canvas = new TFile('board.canvas', 300);
    const app = buildMockApp({ files: [canvas], markdownFiles: [], caches: new Map() });
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips files in dot-prefixed directories', () => {
    const dotFile = new TFile('.obsidian/settings.json', 100);
    const app = buildMockApp({ files: [dotFile], markdownFiles: [], caches: new Map() });
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips files listed in the referenced set', () => {
    const img = new TFile('attachments/image.png', 1000);
    const app = buildMockApp({ files: [img], markdownFiles: [], caches: new Map() });
    const referenced = new Set(['attachments/image.png']);
    const result = collectOrphans(app as never, referenced, []);
    expect(result).toHaveLength(0);
  });

  it('returns unreferenced attachment files with correct size', () => {
    const img = new TFile('attachments/orphan.png', 2048);
    const app = buildMockApp({ files: [img], markdownFiles: [], caches: new Map() });
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(1);
    expect(result[0]?.file.path).toBe('attachments/orphan.png');
    expect(result[0]?.size).toBe(2048);
  });

  it('applies user exclusion list', () => {
    const img = new TFile('private/secret.png', 500);
    const app = buildMockApp({ files: [img], markdownFiles: [], caches: new Map() });
    const result = collectOrphans(app as never, new Set(), ['private']);
    expect(result).toHaveLength(0);
  });
});
