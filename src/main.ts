import {Editor, MarkdownView, Plugin} from 'obsidian';
import {DownloadImageSettings, DEFAULT_SETTINGS, DownloadImageSettingTab} from "./settings";
import {extractImages} from "./parser";

export default class DownloadImagePlugin extends Plugin {
	settings: DownloadImageSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'download-images',
			name: 'Download images in current note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const refs = extractImages(editor.getValue());
				// Phase 2: download logic
				// Phase 3: replacement logic
				console.log(`[obsidian-download-image] Found ${refs.length} image refs`);
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
