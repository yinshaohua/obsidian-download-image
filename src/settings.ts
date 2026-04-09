import {App, PluginSettingTab, Setting} from "obsidian";
import DownloadImagePlugin from "./main";

export interface DownloadImageSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: DownloadImageSettings = {
	mySetting: 'default'
}

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
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
