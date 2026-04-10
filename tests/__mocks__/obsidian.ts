/**
 * Minimal stub for the 'obsidian' package used in unit tests.
 * Only exports the symbols referenced by src/ modules that are needed
 * for the module to load. The pure helper functions under test do NOT call
 * any of these at runtime, so empty stubs are sufficient.
 */

export class App {}

export const Platform = {
	isMobile: false,
};

export async function requestUrl(_opts: unknown): Promise<unknown> {
	throw new Error('requestUrl is not available in unit tests');
}

export function normalizePath(path: string): string {
	return path;
}

export class Plugin {
	app: unknown;
	async loadData(): Promise<unknown> { return {}; }
	async saveData(_data: unknown): Promise<void> {}
	addCommand(_cmd: unknown): void {}
	addSettingTab(_tab: unknown): void {}
}

export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl: { empty: () => void };
	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = { empty: () => {} };
	}
}

export class Setting {
	constructor(_el: unknown) {}
	setName(_n: string) { return this; }
	setDesc(_d: string) { return this; }
	addDropdown(_cb: unknown) { return this; }
	addSlider(_cb: unknown) { return this; }
	addText(_cb: unknown) { return this; }
}

export class Notice {
	constructor(_message: string, _duration?: number) {}
	setMessage(_msg: string): void {}
	hide(): void {}
}

export class Editor {}

export class MarkdownView {}

export class TAbstractFile {
	path: string;
	name: string;
	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
	}
}

export class TFile {
	path: string;
	name: string;
	extension: string;
	stat: { size: number; mtime: number; ctime: number };
	constructor(path: string, size = 0) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
		this.extension = path.includes('.') ? path.split('.').pop()! : '';
		this.stat = { size, mtime: 0, ctime: 0 };
	}
}

export class TFolder {
	path: string;
	name: string;
	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() ?? path;
	}
}
