import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFile } from 'obsidian';

const noticeMessages: string[] = [];

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

vi.mock('../src/scanner', () => ({
  scanOrphanedAttachments: vi.fn(),
}));

vi.mock('../src/modal', () => ({
  showCleanupModal: vi.fn(),
}));

import { scanOrphanedAttachments } from '../src/scanner';
import { showCleanupModal } from '../src/modal';
import type { DownloadImageSettings } from '../src/settings';
import { executeCleanup } from '../src/main';

function makeMockApp(overrides: Record<string, unknown> = {}) {
  const fileManager = {
    trashFile: vi.fn().mockResolvedValue(undefined),
    ...((overrides.fileManager as Record<string, unknown> | undefined) ?? {}),
  };

  return {
    vault: {
      ...((overrides.vault as Record<string, unknown> | undefined) ?? {}),
    },
    fileManager,
  } as unknown;
}

function makeSettings(overrides: Partial<DownloadImageSettings> = {}): DownloadImageSettings {
  return {
    namingStrategy: 'original',
    concurrency: 3,
    excludedFolders: [],
    ...overrides,
  };
}

function makeFile(path: string): TFile {
  return new TFile(path, 1024);
}

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

      expect((app as any).fileManager.trashFile).not.toHaveBeenCalled();
    });
  });

  describe('deletion behavior', () => {
    it('calls fileManager.trashFile(file) for each selected file', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const app = makeMockApp();
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect((app as any).fileManager.trashFile).toHaveBeenCalledWith(file1);
      expect((app as any).fileManager.trashFile).toHaveBeenCalledWith(file2);
      expect((app as any).fileManager.trashFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('error resilience', () => {
    it('continues deleting after individual file failure', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFileFn = vi.fn()
        .mockRejectedValueOnce(new Error('permission denied'))
        .mockResolvedValueOnce(undefined);
      const app = makeMockApp({ fileManager: { trashFile: trashFileFn } });
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(trashFileFn).toHaveBeenCalledTimes(2);
    });

    it('logs failed file path to console.error', async () => {
      const file1 = makeFile('attachments/broken.png');
      const trashFileFn = vi.fn().mockRejectedValueOnce(new Error('fail'));
      const app = makeMockApp({ fileManager: { trashFile: trashFileFn } });
      const settings = makeSettings();
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
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleaned 2 attachments');
    });

    it('shows partial failure message', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFileFn = vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fail'));
      const app = makeMockApp({ fileManager: { trashFile: trashFileFn } });
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleaned 1 attachments, 1 failed (see debug log)');
    });

    it('shows all-failed message', async () => {
      const file1 = makeFile('a.png');
      const file2 = makeFile('b.jpg');
      const trashFileFn = vi.fn().mockRejectedValue(new Error('fail'));
      const app = makeMockApp({ fileManager: { trashFile: trashFileFn } });
      const settings = makeSettings();
      mockScan.mockResolvedValue([{ file: file1, size: 10 }, { file: file2, size: 20 }]);
      mockModal.mockResolvedValue([file1, file2]);

      await executeCleanup(app as any, settings);

      expect(noticeMessages).toContain('Cleanup failed: 2 files could not be removed (see debug log)');
    });
  });
});
