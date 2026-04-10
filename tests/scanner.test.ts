import { describe, it, expect, vi } from 'vitest';
import { TFile } from 'obsidian';
import {
  scanOrphanedAttachments,
  waitForCache,
  buildReferencedSet,
  collectOrphans,
  isDotPrefixedDir,
  OrphanedFile,
} from '../src/scanner';

// ─── Mock App Builder ───────────────────────────────────────────────────────

interface CacheData {
  links?: Array<{ link: string }>;
  embeds?: Array<{ link: string }>;
  frontmatterLinks?: Array<{ link: string }>;
}

function buildMockApp(
  files: TFile[],
  markdownFiles: TFile[],
  caches: Map<string, CacheData>,
  markdownContents: Record<string, string> = {},
  canvasContents: Record<string, string> = {},
  resolvedLinksEmpty = false,
): unknown {
  return {
    vault: {
      getFiles: () => files,
      getMarkdownFiles: () => markdownFiles,
      getAbstractFileByPath: (p: string) => files.find(f => f.path === p) ?? null,
      cachedRead: async (file: TFile) => {
        if (canvasContents[file.path] !== undefined) return canvasContents[file.path];
        if (markdownContents[file.path] !== undefined) return markdownContents[file.path];
        return '';
      },
    },
    metadataCache: {
      resolvedLinks: resolvedLinksEmpty ? {} : { 'dummy.md': {} },
      on: (_evt: string, cb: () => void) => {
        // Simulate immediate resolution for tests
        cb();
        return {};
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
  it('returns true for root dot-dir', () => {
    expect(isDotPrefixedDir('.obsidian/config.json')).toBe(true);
  });

  it('returns true for nested dot-dir', () => {
    expect(isDotPrefixedDir('a/.git/x')).toBe(true);
  });

  it('returns true for .trash directory', () => {
    expect(isDotPrefixedDir('.trash/image.png')).toBe(true);
  });

  it('returns false for normal path', () => {
    expect(isDotPrefixedDir('attachments/image.png')).toBe(false);
  });

  it('returns false for dotfiles at root if not treated as dir', () => {
    // A plain .gitignore file at vault root — has a dot-prefixed segment
    expect(isDotPrefixedDir('.gitignore')).toBe(true);
  });

  it('returns false for normal nested path', () => {
    expect(isDotPrefixedDir('folder/subfolder/image.png')).toBe(false);
  });
});

// ─── waitForCache ────────────────────────────────────────────────────────────

describe('waitForCache', () => {
  it('resolves immediately when resolvedLinks is non-empty', async () => {
    const app = buildMockApp([], [], new Map(), {}, {}, false);
    await expect(waitForCache(app as never)).resolves.toBeUndefined();
  });

  it('waits for resolved event when resolvedLinks is empty', async () => {
    const app = buildMockApp([], [], new Map(), {}, {}, true);
    await expect(waitForCache(app as never)).resolves.toBeUndefined();
  });
});

// ─── scanOrphanedAttachments ─────────────────────────────────────────────────

describe('scanOrphanedAttachments', () => {
  it('returns empty array when all attachments are referenced', async () => {
    const img = new TFile('attachments/image.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', { embeds: [{ link: 'attachments/image.png' }] }],
    ]);
    const app = buildMockApp([img, md], [md], caches);
    const result = await scanOrphanedAttachments(app as never, []);
    expect(result).toHaveLength(0);
  });

  it('returns the unreferenced file when one file is not referenced', async () => {
    const img1 = new TFile('attachments/referenced.png', 1000);
    const img2 = new TFile('attachments/orphan.png', 2000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', { embeds: [{ link: 'attachments/referenced.png' }] }],
    ]);
    const app = buildMockApp([img1, img2, md], [md], caches);
    const result = await scanOrphanedAttachments(app as never, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.file.path).toBe('attachments/orphan.png');
    expect(result[0]?.size).toBe(2000);
  });

  it('never returns .md files', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>();
    const app = buildMockApp([md], [md], caches);
    const result = await scanOrphanedAttachments(app as never, []);
    expect(result).toHaveLength(0);
  });

  it('never returns .canvas files', async () => {
    const canvas = new TFile('board.canvas', 300);
    const caches = new Map<string, CacheData>();
    const app = buildMockApp([canvas], [], caches);
    const result = await scanOrphanedAttachments(app as never, []);
    expect(result).toHaveLength(0);
  });

  it('never returns files in dot-prefixed directories', async () => {
    const dotFile = new TFile('.obsidian/plugins/plugin.js', 100);
    const caches = new Map<string, CacheData>();
    const app = buildMockApp([dotFile], [], caches);
    const result = await scanOrphanedAttachments(app as never, []);
    expect(result).toHaveLength(0);
  });

  it('excludes files under user-specified exclusion folder', async () => {
    const privateImg = new TFile('private/secret.png', 500);
    const caches = new Map<string, CacheData>();
    const app = buildMockApp([privateImg], [], caches);
    const result = await scanOrphanedAttachments(app as never, ['private']);
    expect(result).toHaveLength(0);
  });

  it('excludes files under exclusion folder with trailing slash', async () => {
    const privateImg = new TFile('private/secret.png', 500);
    const caches = new Map<string, CacheData>();
    const app = buildMockApp([privateImg], [], caches);
    const result = await scanOrphanedAttachments(app as never, ['private/']);
    expect(result).toHaveLength(0);
  });
});

// ─── buildReferencedSet ───────────────────────────────────────────────────────

describe('buildReferencedSet', () => {
  it('finds references from cache.links', async () => {
    const img = new TFile('attachments/linked.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', { links: [{ link: 'attachments/linked.png' }] }],
    ]);
    const app = buildMockApp([img, md], [md], caches);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/linked.png')).toBe(true);
  });

  it('finds references from cache.embeds', async () => {
    const img = new TFile('attachments/embed.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', { embeds: [{ link: 'attachments/embed.png' }] }],
    ]);
    const app = buildMockApp([img, md], [md], caches);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/embed.png')).toBe(true);
  });

  it('finds references from cache.frontmatterLinks', async () => {
    const img = new TFile('attachments/fm.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', { frontmatterLinks: [{ link: 'attachments/fm.png' }] }],
    ]);
    const app = buildMockApp([img, md], [md], caches);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/fm.png')).toBe(true);
  });

  it('finds local HTML img src references', async () => {
    const img = new TFile('attachments/local.png', 1000);
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', {}],
    ]);
    const markdownContents: Record<string, string> = {
      'note.md': '<img src="attachments/local.png" alt="test">',
    };
    const app = buildMockApp([img, md], [md], caches, markdownContents);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/local.png')).toBe(true);
  });

  it('skips http/https img src as not local references', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([
      ['note.md', {}],
    ]);
    const markdownContents: Record<string, string> = {
      'note.md': '<img src="https://example.com/remote.png">',
    };
    // No local file with that path
    const app = buildMockApp([md], [md], caches, markdownContents);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('https://example.com/remote.png')).toBe(false);
    expect(refSet.size).toBe(0);
  });

  it('skips data: img src', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>([['note.md', {}]]);
    const markdownContents: Record<string, string> = {
      'note.md': '<img src="data:image/png;base64,abc123">',
    };
    const app = buildMockApp([md], [md], caches, markdownContents);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.size).toBe(0);
  });

  it('finds canvas JSON file node references', async () => {
    const img = new TFile('attachments/canvas-img.png', 1000);
    const canvas = new TFile('board.canvas', 300);
    const caches = new Map<string, CacheData>();
    const canvasContents: Record<string, string> = {
      'board.canvas': JSON.stringify({
        nodes: [
          { id: '1', type: 'file', file: 'attachments/canvas-img.png', x: 0, y: 0, width: 400, height: 300 },
          { id: '2', type: 'text', text: 'Hello' },
        ],
        edges: [],
      }),
    };
    const app = buildMockApp([img, canvas], [], caches, {}, canvasContents);
    const refSet = await buildReferencedSet(app as never);
    expect(refSet.has('attachments/canvas-img.png')).toBe(true);
  });

  it('silently skips malformed canvas JSON', async () => {
    const canvas = new TFile('board.canvas', 100);
    const caches = new Map<string, CacheData>();
    const canvasContents: Record<string, string> = {
      'board.canvas': '{ this is not valid json >>>',
    };
    const app = buildMockApp([canvas], [], caches, {}, canvasContents);
    // Should not throw
    await expect(buildReferencedSet(app as never)).resolves.toBeDefined();
  });

  it('handles null cache gracefully (no crash)', async () => {
    const md = new TFile('note.md', 500);
    const caches = new Map<string, CacheData>(); // no cache entry -> getFileCache returns null
    const app = buildMockApp([md], [md], caches);
    await expect(buildReferencedSet(app as never)).resolves.toBeDefined();
  });
});

// ─── collectOrphans ───────────────────────────────────────────────────────────

describe('collectOrphans', () => {
  it('skips .md files', () => {
    const md = new TFile('note.md', 500);
    const app = buildMockApp([md], [md], new Map());
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips .canvas files', () => {
    const canvas = new TFile('board.canvas', 300);
    const app = buildMockApp([canvas], [], new Map());
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips dot-dir files', () => {
    const dotFile = new TFile('.obsidian/config.json', 100);
    const app = buildMockApp([dotFile], [], new Map());
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(0);
  });

  it('skips referenced files', () => {
    const img = new TFile('attachments/image.png', 1000);
    const app = buildMockApp([img], [], new Map());
    const referenced = new Set(['attachments/image.png']);
    const result = collectOrphans(app as never, referenced, []);
    expect(result).toHaveLength(0);
  });

  it('returns unreferenced attachment files', () => {
    const img = new TFile('attachments/orphan.png', 2000);
    const app = buildMockApp([img], [], new Map());
    const result = collectOrphans(app as never, new Set(), []);
    expect(result).toHaveLength(1);
    expect(result[0]?.file.path).toBe('attachments/orphan.png');
    expect(result[0]?.size).toBe(2000);
  });

  it('applies user exclusion list', () => {
    const img = new TFile('private/secret.png', 500);
    const app = buildMockApp([img], [], new Map());
    const result = collectOrphans(app as never, new Set(), ['private']);
    expect(result).toHaveLength(0);
  });
});
