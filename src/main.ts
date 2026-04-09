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

				// Phase 2: download and save to vault
				const results = await downloadImages(refs, this.app, notePath);

				const ok = results.filter(r => r.status === 'ok').length;
				const failed = results.filter(r => r.status === 'failed').length;

				// Phase 3 will replace URLs in document; for now log results
				console.log(`[download-image] Done: ${ok} downloaded, ${failed} failed`);

				// Phase 3: document replacement logic will go here
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
