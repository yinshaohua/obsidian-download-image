import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DownloadImageSettings, DEFAULT_SETTINGS, DownloadImageSettingTab} from "./settings";
import {extractImages} from "./parser";
import {downloadImages} from "./downloader";
import {buildReplacementMap, applyReplacements} from "./replacer";

export default class DownloadImagePlugin extends Plugin {
	settings: DownloadImageSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'download-images',
			name: 'Download images in current note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const content = editor.getValue();
				const refs = extractImages(content);
				if (refs.length === 0) {
					new Notice('No remote images found in current note');
					return;
				}

				const notePath = view.file?.path ?? '';

				// Real-time progress Notice — reuse single Notice instance
				const progressNotice = new Notice('Downloading images...', 0);

				try {
					const results = await downloadImages(refs, this.app, notePath, {
						concurrency: this.settings.concurrency,
						namingStrategy: this.settings.namingStrategy,
						onProgress: (completed, total) => {
							progressNotice.setMessage(`Downloading ${completed}/${total} images...`);
						},
					});

					// Hide progress notice
					progressNotice.hide();

					// Deduplicate by URL for accurate counts
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

					// Always log summary
					console.log(`[download-image] ${refs.length} refs found, ${uniqueResults.length} unique URLs, ${ok} ok, ${failedResults.length} failed`);
					for (const r of uniqueResults) {
						if (r.status === 'ok') {
							console.log(`  OK ${r.ref.url} -> ${r.localPath}`);
						} else {
							console.warn(`  FAIL ${r.ref.url}: ${r.error}`);
						}
					}

					// Replace URLs in document via single editor.transaction
					if (ok > 0) {
						const currentContent = editor.getValue();
						const replacements = buildReplacementMap(currentContent, results);
						if (replacements.length > 0) {
							const newContent = applyReplacements(currentContent, replacements);
							// Single transaction = single undo step
							editor.transaction({
								changes: [{
									from: { line: 0, ch: 0 },
									to: { line: editor.lineCount(), ch: 0 },
									text: newContent,
								}],
							});
						}
					}

					// Concise summary notice
					const dupes = refs.length - uniqueResults.length;
					new Notice(
						`Downloaded ${ok} image(s)${failedResults.length > 0 ? `, ${failedResults.length} failed (see console)` : ''}` +
						(dupes > 0 ? ` (${dupes} duplicate refs skipped)` : '')
					);

				} catch (err) {
					progressNotice.hide();
					console.error('[download-image] Unexpected error:', err);
					new Notice('Image download failed unexpectedly. Check console for details.');
				}
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
