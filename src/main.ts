import {App, Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DownloadImageSettings, DEFAULT_SETTINGS, DownloadImageSettingTab} from "./settings";
import {extractImages} from "./parser";
import {downloadImages} from "./downloader";
import {buildReplacementMap, applyReplacements} from "./replacer";
import {scanOrphanedAttachments} from "./scanner";
import {showCleanupModal} from "./modal";

/**
 * Extracted cleanup pipeline for testability (D-03).
 * Runs scan -> modal -> trash with error resilience.
 */
export async function executeCleanup(
	app: App,
	settings: DownloadImageSettings
): Promise<void> {
	const orphans = await scanOrphanedAttachments(app, settings.excludedFolders);
	const selected = await showCleanupModal(app, orphans);

	if (selected === null) {
		return;
	}

	const progressNotice = new Notice('Cleaning up...', 0);

	let successCount = 0;
	let failCount = 0;

	try {
		for (const file of selected) {
			try {
				await app.fileManager.trashFile(file);
				successCount++;
			} catch (err) {
				failCount++;
				console.error(`[download-image] Failed to remove ${file.path}:`, err instanceof Error ? err.message : String(err));
			}
		}

		progressNotice.hide();
		if (failCount === 0) {
			new Notice(`Cleaned ${successCount} attachments`);
		} else if (successCount > 0) {
			new Notice(`Cleaned ${successCount} attachments, ${failCount} failed (see debug log)`);
		} else {
			new Notice(`Cleanup failed: ${failCount} files could not be removed (see debug log)`);
		}
	} catch (err) {
		progressNotice.hide();
		console.error('[download-image] Unexpected cleanup error:', err);
		new Notice('Cleanup failed unexpectedly. Check the debug log for details.');
	}
}

export default class DownloadImagePlugin extends Plugin {
	settings: DownloadImageSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'save-remote-files-in-current-note',
			name: 'Save remote files in current note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const content = editor.getValue();
				const refs = extractImages(content);
				if (refs.length === 0) {
					new Notice('No remote images found in current note');
					return;
				}

				const notePath = view.file?.path ?? '';
				const progressNotice = new Notice('Downloading images...', 0);

				try {
					const results = await downloadImages(refs, this.app, notePath, {
						concurrency: this.settings.concurrency,
						namingStrategy: this.settings.namingStrategy,
						onProgress: (completed, total) => {
							progressNotice.setMessage(`Downloading ${completed}/${total} images...`);
						},
					});

					progressNotice.hide();

					const seen = new Set<string>();
					const uniqueResults: typeof results = [];
					for (const r of results) {
						if (!seen.has(r.ref.url)) {
							seen.add(r.ref.url);
							uniqueResults.push(r);
						}
					}

					const ok = uniqueResults.filter(r => r.status === 'ok').length;
					const failedResults = uniqueResults.filter(r => r.status === 'failed');

					if (ok > 0) {
						const currentContent = editor.getValue();
						const replacements = buildReplacementMap(currentContent, results);
						if (replacements.length > 0) {
							const newContent = applyReplacements(currentContent, replacements);
							editor.transaction({
								changes: [{
									from: { line: 0, ch: 0 },
									to: { line: editor.lineCount(), ch: 0 },
									text: newContent,
								}],
							});
						}
					}

					const dupes = refs.length - uniqueResults.length;
					new Notice(
						`Downloaded ${ok} image(s)${failedResults.length > 0 ? `, ${failedResults.length} failed (see debug log)` : ''}` +
						(dupes > 0 ? ` (${dupes} duplicate refs skipped)` : '')
					);
				} catch (err) {
					progressNotice.hide();
					console.error('[download-image] Unexpected error:', err);
					new Notice('Image download failed unexpectedly. Check the debug log for details.');
				}
			}
		});

		this.addCommand({
			id: 'clean-unused-attachments',
			name: 'Clean unused attachments',
			callback: async () => {
				await executeCleanup(this.app, this.settings);
			}
		});

		this.addSettingTab(new DownloadImageSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<DownloadImageSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
