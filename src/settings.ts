import {App, PluginSettingTab, Setting} from "obsidian";
import DownloadImagePlugin from "./main";

export type NamingStrategy = 'original' | 'timestamp' | 'hash';

export interface DownloadImageSettings {
	namingStrategy: NamingStrategy;
	concurrency: number;
}

export const DEFAULT_SETTINGS: DownloadImageSettings = {
	namingStrategy: 'original',
	concurrency: 3,
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
			.setName('Image naming strategy')
			.setDesc(
				'How downloaded images are named. Original keeps the URL filename; ' +
				'Timestamp adds a date prefix; Hash uses content-based naming for deduplication.'
			)
			.addDropdown(dropdown => dropdown
				.addOptions({
					original: 'Original filename',
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
	}
}
