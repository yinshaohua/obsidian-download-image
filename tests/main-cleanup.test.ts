import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile } from 'obsidian';

// Track Notice constructor calls
const noticeMessages: string[] = [];

// Mock obsidian module to intercept Notice constructor
vi.mock('obsidian', async () => {
  const actual = await vi.importActual<typeof import('obsidian')>('obsidian');
  return {
    ...actual,
    Notice: class MockNotice extends actual.Notice {
      constructor(msg: string, duration?: number) {
        super(msg, duration);
        noticeMessages.push(msg);
      }
    },
  };
});

// Mock scanner and modal modules
vi.mock('../src/scanner', () => ({
  scanOrphanedAttachments: vi.fn(),
}));

vi.mock('../src/modal', () => ({
  showCleanupModal: vi.fn(),
}));

import { scanOrphanedAttachments } from '../src/scanner';
import { showCleanupModal } from '../src/modal';
import type { DownloadImageSettings } from '../src/settings';

// Will be implemented in main.ts
import { executeCleanup } from '../src/main';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockApp(overrides: Record<string, unknown> = {}) {
  return {
    vault: {
      trash: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getAbstractFileByPath: vi.fn().mockReturnValue(null),
      createFolder: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  } as unknown;
}

function makeSettings(overrides: Partial<DownloadImageSettings> = {}): DownloadImageSettings {
  return {
    namingStrategy: 'original',
    concurrency: 3,
    cleanupMethod: 'trash',
    excludedFolders: [],
    ...overrides,
  };
}

function makeFile(path: string): TFile {
  return new TFile(path, 1024);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('executeCleanup', () => {
  const mockScan = scanOrphanedAttachments as ReturnType<typeof vi.fn>;
  const mockModal = showCleanupModal as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    noticeMessages.length = 0;
  });

  describe('scan and modal wiring', () => {
    it('calls scanOrphanedAttachments with app and excludedFolders', async () => {
      const app = makeMockApp();
      const settings = makeSettings({ excludedFolders: ['templates'] });
      mockScan.mockResolvedValue([]);
      mockModal.mockResolvedValue(null);

      await executeCleanup(app as any, settings);

      expect(mockScan).toHaveBeenCalledWith(app, ['templates']);
    });

    it('calls showCleanupModal with app and scan results', async () => {
      const app = makeMockApp();
      const settings = makeSettings();
      const orphans = [{ file: makeFile('img.png'), size: 100 }];
      mockScan.mockResolvedValue(orphans);
      mockModal.mockResolvedValue(null);

      await executeCleanup(app as any, settings);

      expect(mockModal).toHaveBeenCalledWith(app, orphans);
    });

    it('does nothing when modal returns null', async () => {
      const app = makeMockApp();
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: makeFile('a.png'), size: 10 }]);
      mockModal.mockResolvedValue(null);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.trash).not.toHaveBeenCalled();
      expect((app as any).vault.delete).not.toHaveBeenCalled();
    });
  });

  describe('deletion methods', () => {
    it('calls vault.trash(file, false) for each file when cleanupMethod is trash', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const app = makeMockApp();
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.trash).toHaveBeenCalledWith(file1, false);
      expect((app as any).vault.trash).toHaveBeenCalledWith(file2, false);
      expect((app as any).vault.trash).toHaveBeenCalledTimes(2);
    });

    it('calls vault.delete(file) for each file when cleanupMethod is delete', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const app = makeMockApp();
      const settings = makeSettings({ cleanupMethod: 'delete' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.delete).toHaveBeenCalledWith(file1);
      expect((app as any).vault.delete).toHaveBeenCalledWith(file2);
      expect((app as any).vault.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('.trash ENOENT guard', () => {
    it('pre-creates .trash folder when missing and cleanupMethod is trash', async () => {
      const file1 = makeFile('a.png');
      const app = makeMockApp({ getAbstractFileByPath: vi.fn().mockReturnValue(null) });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }]);
      mockModal.mockResolvedValue([file1]);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.getAbstractFileByPath).toHaveBeenCalledWith('.trash');
      expect((app as any).vault.createFolder).toHaveBeenCalledWith('.trash');
    });

    it('skips .trash pre-creation when folder already exists', async () => {
      const file1 = makeFile('a.png');
      const app = makeMockApp({ getAbstractFileByPath: vi.fn().mockReturnValue({ path: '.trash' }) });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }]);
      mockModal.mockResolvedValue([file1]);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.createFolder).not.toHaveBeenCalled();
    });

    it('skips .trash pre-creation when cleanupMethod is delete', async () => {
      const file1 = makeFile('a.png');
      const app = makeMockApp();
      const settings = makeSettings({ cleanupMethod: 'delete' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }]);
      mockModal.mockResolvedValue([file1]);

      await executeCleanup(app as any, settings);

      expect((app as any).vault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('error resilience', () => {
    it('continues deleting after individual file failure', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFn = vi.fn()
        .mockRejectedValueOnce(new Error('permission denied'))
        .mockResolvedValueOnce(undefined);
      const app = makeMockApp({ trash: trashFn });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(trashFn).toHaveBeenCalledTimes(2);
    });

    it('logs failed file path to console.error', async () => {
      const file1 = makeFile('attachments/broken.png');
      const trashFn = vi.fn().mockRejectedValueOnce(new Error('fail'));
      const app = makeMockApp({ trash: trashFn });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }]);
      mockModal.mockResolvedValue([file1]);

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await executeCleanup(app as any, settings);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('attachments/broken.png'),
        expect.anything()
      );
      spy.mockRestore();
    });
  });

  describe('result Notice messages', () => {
    it('shows "Cleaned N attachments" on full success', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const app = makeMockApp();
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleaned 2 attachments');
    });

    it('shows partial failure message', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFn = vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'));
      const app = makeMockApp({ trash: trashFn });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleaned 1 attachments, 1 failed (see console)');
    });

    it('shows all-failed message', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFn = vi.fn().mockRejectedValue(new Error('fail'));
      const app = makeMockApp({ trash: trashFn });
      const settings = makeSettings({ cleanupMethod: 'trash' });
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleanup failed: 2 files could not be removed (see console)');
    });
  });
});
