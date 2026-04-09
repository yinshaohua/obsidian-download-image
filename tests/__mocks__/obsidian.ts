/**
 * Minimal stub for the 'obsidian' package used in unit tests.
 * Only exports the symbols referenced by src/downloader.ts that are needed
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
