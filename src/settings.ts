import {App, PluginSettingTab, Setting} from "obsidian";
import DownloadImagePlugin from "./main";

export type NamingStrategy = 'original' | 'timestamp' | 'hash';

export interface DownloadImageSettings {
	namingStrategy: NamingStrategy;
	concurrency: number;
	excludedFolders: string[];
}

export const DEFAULT_SETTINGS: DownloadImageSettings = {
	namingStrategy: 'original',
	concurrency: 3,
	excludedFolders: [],
};

export class DownloadImageSettingTab extends PluginSettingTab {
	plugin: DownloadImagePlugin;

	constructor(app: App, plugin: DownloadImagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Download')
			.setHeading();

		new Setting(containerEl)
			.setName('Image naming strategy')
			.setDesc(
				'How downloaded images are named. URL hash derives a deterministic name from the image URL; ' +
				'Timestamp adds a date prefix; Content hash uses file content for deduplication.'
			)
			.addDropdown(dropdown => dropdown
				.addOptions({
					original: 'URL hash',
					timestamp: 'Timestamp prefix',
					hash: 'Content hash',
				})
				.setValue(this.plugin.settings.namingStrategy)
				.onChange(async (value) => {
					this.plugin.settings.namingStrategy = value as NamingStrategy;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Concurrent downloads')
			.setDesc('Maximum number of simultaneous image downloads (1-10).')
			.addSlider(slider => slider
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.concurrency)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.concurrency = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Cleanup')
			.setHeading();

		new Setting(containerEl)
			.setName('Attachment removal')
			.setDesc('Unused attachments are removed with Obsidian’s standard file trash behavior.');

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Folder paths to exclude from orphan scan (one per line). Uses exact prefix matching.')
			.addTextArea(textarea => textarea
				.setPlaceholder('Enter one folder path per line.')
				.setValue(this.plugin.settings.excludedFolders.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.excludedFolders = value
						.split('\n')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
				}));
	}
}
