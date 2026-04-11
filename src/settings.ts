import {App, PluginSettingTab, Setting} from "obsidian";
import DownloadImagePlugin from "./main";

export type NamingStrategy = 'original' | 'timestamp' | 'hash';

export type CleanupMethod = 'trash' | 'delete';

export interface DownloadImageSettings {
	namingStrategy: NamingStrategy;
	concurrency: number;
	cleanupMethod: CleanupMethod;
	excludedFolders: string[];
}

export const DEFAULT_SETTINGS: DownloadImageSettings = {
	namingStrategy: 'original',
	concurrency: 3,
	cleanupMethod: 'trash',
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

		// ── Download section ──
		containerEl.createEl('h2', { text: 'Download' });

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

		// ── Cleanup section ──
		containerEl.createEl('h2', { text: 'Cleanup' });

		// Cleanup method dropdown
		new Setting(containerEl)
			.setName('Cleanup method')
			.setDesc('How orphaned attachments are removed.')
			.addDropdown(dropdown => dropdown
				.addOptions({
					trash: 'Move to .trash',
					delete: 'Permanent delete',
				})
				.setValue(this.plugin.settings.cleanupMethod)
				.onChange(async (value) => {
					this.plugin.settings.cleanupMethod = value as CleanupMethod;
					await this.plugin.saveSettings();
					warningEl.style.display = value === 'delete' ? 'block' : 'none';
				}));

		// Inline warning for permanent delete
		const warningEl = containerEl.createEl('p', {
			text: 'Warning: Files will be permanently deleted and cannot be recovered.',
			cls: 'mod-warning',
		});
		warningEl.style.display =
			this.plugin.settings.cleanupMethod === 'delete' ? 'block' : 'none';

		// Folder exclusions textarea
		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Folder paths to exclude from orphan scan (one per line). Uses exact prefix matching.')
			.addTextArea(textarea => textarea
				.setPlaceholder('attachments/archive\ntemp')
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
