import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { OrphanedFile } from './scanner';

/**
 * Converts a byte count to a human-readable size string.
 * Thresholds: < 1024 = B, < 1 048 576 = KB, else MB.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/**
 * Confirmation modal that displays orphaned attachments with per-item
 * deselect checkboxes. Wraps the user's confirm/cancel/dismiss action
 * in a Promise via the injected resolveFn.
 */
export class CleanupModal extends Modal {
  private readonly orphans: OrphanedFile[];
  private readonly resolveFn: (value: TFile[] | null) => void;
  private resolved = false;

  constructor(
    app: App,
    orphans: OrphanedFile[],
    resolveFn: (value: TFile[] | null) => void
  ) {
    super(app);
    this.orphans = orphans;
    this.resolveFn = resolveFn;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();

    modalEl.addClass('download-image-cleanup-modal');
    contentEl.addClass('download-image-cleanup-modal__content');

    new Setting(contentEl)
      .setName('Clean orphaned attachments')
      .setHeading();

    // Sort by vault path alphabetically (D-02)
    const sorted = [...this.orphans].sort((a, b) =>
      a.file.path.localeCompare(b.file.path)
    );

    // Checkbox state map: file path -> <input>
    const checkboxMap = new Map<string, HTMLInputElement>();

    const toggleSetting = new Setting(contentEl)
      .setName('Selection')
      .setDesc('Choose which orphaned attachments to remove.');

    let toggleBtnText = 'Deselect all';
    let toggleBtn: HTMLButtonElement | null = null;
    toggleSetting.addButton(btn => {
      btn.setButtonText(toggleBtnText)
        .onClick(() => {
          const allChecked = [...checkboxMap.values()].every(cb => cb.checked);
          checkboxMap.forEach(cb => { cb.checked = !allChecked; });
          toggleBtnText = allChecked ? 'Select all' : 'Deselect all';
          toggleBtn?.setText(toggleBtnText);
        });
      toggleBtn = btn.buttonEl;
    });

    // Scrollable container (D-06) — flex:1 fills remaining space
    const listEl = contentEl.createDiv({ cls: 'download-image-cleanup-modal__list' });

    // File rows (D-01, D-03, D-04)
    for (const orphan of sorted) {
      const row = listEl.createDiv({ cls: 'download-image-cleanup-modal__row' });

      // Checkbox — checked by default (D-04)
      const cb = row.createEl('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.id = 'cleanup-' + orphan.file.path;
      checkboxMap.set(orphan.file.path, cb);

      // Label with three columns: name, folder, size (D-01)
      const label = row.createEl('label', { cls: 'download-image-cleanup-modal__label' });
      label.htmlFor = cb.id;

      label.createSpan({
        text: orphan.file.name,
        cls: 'download-image-cleanup-modal__name',
      });

      const folder = orphan.file.path.includes('/')
        ? orphan.file.path.substring(0, orphan.file.path.lastIndexOf('/'))
        : '/';
      label.createSpan({
        text: folder,
        cls: 'download-image-cleanup-modal__folder',
      });

      label.createSpan({
        text: formatFileSize(orphan.size),
        cls: 'download-image-cleanup-modal__size',
      });
    }

    // Action buttons using Setting API
    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Confirm')
        .setCta()
        .onClick(() => {
          const selected = [...checkboxMap.entries()]
            .filter(([, cb]) => cb.checked)
            .map(([path]) => this.orphans.find(o => o.file.path === path)?.file)
            .filter((file): file is TFile => file !== undefined);
          this.resolved = true;
          this.resolveFn(selected);
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => {
          this.resolved = true;
          this.resolveFn(null);
          this.close();
        }));
  }

  /**
   * Safety net for all close paths (ESC, X button, background click).
   * Only resolves if not already resolved by Confirm/Cancel buttons (D-09).
   */
  onClose(): void {
    if (!this.resolved) {
      this.resolved = true;
      this.resolveFn(null);
    }
    this.contentEl.empty();
  }
}

/**
 * Async helper that wraps CleanupModal in a Promise.
 * Returns selected TFile[] on Confirm, or null on Cancel/dismiss.
 * Shows a Notice instead of the modal when orphans list is empty (D-07).
 */
export async function showCleanupModal(
  app: App,
  orphans: OrphanedFile[]
): Promise<TFile[] | null> {
  if (orphans.length === 0) {
    new Notice('No orphaned attachments found');
    return null;
  }
  return new Promise(resolve => {
    new CleanupModal(app, orphans, resolve).open();
  });
}
