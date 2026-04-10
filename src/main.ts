import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DownloadImageSettings, DEFAULT_SETTINGS, DownloadImageSettingTab} from "./settings";
import {extractImages} from "./parser";
import {downloadImages} from "./downloader";

export default class DownloadImagePlugin extends Plugin {
	settings: DownloadImageSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'download-images',
			name: 'Download images in current note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const refs = extractImages(editor.getValue());
				if (refs.length === 0) {
					new Notice('No remote images found in current note');
					return;
				}

				const notePath = view.file?.path ?? '';

				try {
					// Phase 2: download and save to vault
					const results = await downloadImages(refs, this.app, notePath);

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
							console.log(`  ✓ ${r.ref.url} → ${r.localPath}`);
						} else {
							console.warn(`  ✗ ${r.ref.url}: ${r.error}`);
						}
					}

					const dupes = refs.length - uniqueResults.length;
					new Notice(
						`Downloaded ${ok} image(s)${failedResults.length > 0 ? `, ${failedResults.length} failed (see console)` : ''}` +
						(dupes > 0 ? ` (${dupes} duplicate refs skipped)` : '')
					);

					// Phase 3: document replacement logic will go here
				} catch (err) {
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
