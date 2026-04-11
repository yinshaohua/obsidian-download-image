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
    const { contentEl } = this;
    contentEl.empty();

    // Title
    contentEl.createEl('h2', { text: 'Clean Orphaned Attachments' });

    // Sort by vault path alphabetically (D-02)
    const sorted = [...this.orphans].sort((a, b) =>
      a.file.path.localeCompare(b.file.path)
    );

    // Checkbox state map: file path -> <input>
    const checkboxMap = new Map<string, HTMLInputElement>();

    // Select All / Deselect All toggle (D-05)
    const toggleBtn = contentEl.createEl('button', { text: 'Deselect All' });
    toggleBtn.onclick = () => {
      const allChecked = [...checkboxMap.values()].every(cb => cb.checked);
      checkboxMap.forEach(cb => { cb.checked = !allChecked; });
      toggleBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    };

    // Scrollable container (D-06)
    const listEl = contentEl.createEl('div');
    listEl.style.maxHeight = '400px';
    listEl.style.overflowY = 'auto';
    listEl.style.marginTop = '8px';

    // File rows (D-01, D-03, D-04)
    for (const orphan of sorted) {
      const row = listEl.createEl('div', { cls: 'cleanup-modal-row' });
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = '4px 0';

      // Checkbox — checked by default (D-04)
      const cb = row.createEl('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = true;
      cb.id = 'cleanup-' + orphan.file.path;
      checkboxMap.set(orphan.file.path, cb);

      // Label with three columns: name, folder, size (D-01)
      const label = row.createEl('label');
      label.htmlFor = cb.id;
      label.style.display = 'flex';
      label.style.flex = '1';
      label.style.gap = '8px';

      const nameSpan = label.createEl('span', { text: orphan.file.name });
      nameSpan.style.flex = '2';

      const folder = orphan.file.path.includes('/')
        ? orphan.file.path.substring(0, orphan.file.path.lastIndexOf('/'))
        : '/';
      const folderSpan = label.createEl('span', { text: folder });
      folderSpan.style.flex = '2';
      folderSpan.style.color = 'var(--text-muted)';

      const sizeSpan = label.createEl('span', { text: formatFileSize(orphan.size) });
      sizeSpan.style.flex = '1';
      sizeSpan.style.textAlign = 'right';
    }

    // Action buttons using Setting API
    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Confirm')
        .setCta()
        .onClick(() => {
          const selected = [...checkboxMap.entries()]
            .filter(([, cb]) => cb.checked)
            .map(([path]) => this.orphans.find(o => o.file.path === path)!.file);
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
