import { App, requestUrl, normalizePath, Platform } from 'obsidian';
import { ImageRef } from './parser';
import { NamingStrategy } from './settings';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DownloadResult {
	ref: ImageRef;
	localPath: string;   // Vault-relative path on success, empty string on failure
	status: 'ok' | 'failed';
	error?: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const TIMEOUT_MS = 30_000;                    // D-05: 30 second per-image timeout
const MOBILE_SIZE_LIMIT = 15 * 1024 * 1024;  // D-06: 15MB mobile limit

export const MIME_TO_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/avif': 'avif',
	'image/bmp': 'bmp',
	'image/tiff': 'tif',
	'image/x-icon': 'ico',
};

// ──────────────────────────────────────────────
// Pure helper functions (no Obsidian API, no side effects)
// ──────────────────────────────────────────────

/**
 * Strips characters that are illegal in filenames on Windows/macOS/Linux.
 * Windows forbids: * " \ / < > : | ?
 * Also strips control characters and leading/trailing dots/spaces.
 */
function sanitizeFilename(name: string): string {
	return name
		.replace(/[*"\\/<>:|?]/g, '')
		.replace(/[\x00-\x1e]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^[.-]+|[.-]+$/g, '') || `image-${Date.now()}`;
}

/**
 * Validates that a Content-Type header indicates an image response.
 * D-08: Accept image/* and application/octet-stream; reject text/html etc.
 */
export function isValidImageContentType(contentType: string | undefined): boolean {
	if (!contentType) return false;
	const ct = (contentType.toLowerCase().split(';')[0] ?? '').trim();
	return ct.startsWith('image/') || ct === 'application/octet-stream';
}

/**
 * Simple string hash → 6-char base36 identifier.
 * Deterministic: same URL always produces the same hash.
 */
function shortHash(str: string): string {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	}
	return Math.abs(h).toString(36).padStart(6, '0');
}

/**
 * Derives a filename from a remote URL plus an optional Content-Type hint.
 * D-01: Priority — URL path segment → Content-Type inference → fallback png
 * D-02: CDN hash/UUID segments fall back to image-{hash}
 */
export function deriveFilenameFromUrl(url: string, contentType?: string): string {
	// Strip query string and fragment before extracting path
	const urlWithoutQuery = url.split('?')[0]?.split('#')[0] ?? '';
	const pathSegment = urlWithoutQuery.split('/').pop() ?? '';

	// If the segment already has a recognisable file extension, use it directly
	if (pathSegment && /\.\w{2,5}$/.test(pathSegment)) {
		return sanitizeFilename(pathSegment);
	}

	// No valid extension — infer from Content-Type
	const mimeKey = contentType?.split(';')[0]?.toLowerCase().trim() ?? '';
	const ext = MIME_TO_EXT[mimeKey] ?? 'png';

	// Use URL hash when segment is short, empty, or purely numeric (e.g. WeChat's "/640")
	// This ensures each unique URL gets a unique filename, avoiding concurrent write races
	const isGeneric = !pathSegment || pathSegment.length <= 2 || /^\d+$/.test(pathSegment);
	const base = isGeneric ? `image-${shortHash(url)}` : pathSegment;
	return sanitizeFilename(`${base}.${ext}`);
}

/**
 * Derives a filename for a base64-encoded image.
 * D-03: Pattern is base64-{timestamp}.{ext}
 */
export function deriveFilenameFromBase64(mimeType: string): string {
	const ext = MIME_TO_EXT[mimeType.toLowerCase()] ?? 'png';
	return `base64-${Date.now()}.${ext}`;
}

/**
 * Derives a filename using the specified naming strategy.
 * Wraps deriveFilenameFromUrl/deriveFilenameFromBase64 with timestamp and hash alternatives.
 */
export function deriveFilenameWithStrategy(
	url: string,
	contentType: string | undefined,
	buffer: ArrayBuffer,
	strategy: NamingStrategy,
	isBase64: boolean,
	mimeType?: string
): string {
	switch (strategy) {
		case 'timestamp': {
			const now = new Date();
			const ts = now.getFullYear().toString()
				+ String(now.getMonth() + 1).padStart(2, '0')
				+ String(now.getDate()).padStart(2, '0')
				+ '-'
				+ String(now.getHours()).padStart(2, '0')
				+ String(now.getMinutes()).padStart(2, '0')
				+ String(now.getSeconds()).padStart(2, '0');
			const base = isBase64
				? deriveFilenameFromBase64(mimeType ?? 'image/png')
				: deriveFilenameFromUrl(url, contentType);
			return ts + '-' + base;
		}
		case 'hash': {
			let h = 0;
			const view = new Uint8Array(buffer);
			for (let i = 0; i < view.length; i++) {
				h = ((h << 5) - h + view[i]!) | 0;
			}
			const hashStr = Math.abs(h).toString(36).padStart(8, '0');
			const ext = isBase64
				? (MIME_TO_EXT[(mimeType ?? '').toLowerCase()] ?? 'png')
				: (MIME_TO_EXT[(contentType?.split(';')[0]?.toLowerCase().trim()) ?? ''] ?? 'png');
			return hashStr + '.' + ext;
		}
		case 'original':
		default:
			return isBase64
				? deriveFilenameFromBase64(mimeType ?? 'image/png')
				: deriveFilenameFromUrl(url, contentType);
	}
}

/**
 * Decodes a base64 data URI into an ArrayBuffer.
 * D-13: Local decoding, no network request.
 * D-14: Uses browser-only APIs (atob + Uint8Array), never Node.js Buffer.
 */
export function decodeBase64Image(dataUri: string): { buffer: ArrayBuffer; mimeType: string } {
	const commaIndex = dataUri.indexOf(',');
	if (commaIndex === -1) {
		throw new Error('Invalid data URI format');
	}
	const header = dataUri.slice(0, commaIndex);
	const base64Data = dataUri.slice(commaIndex + 1);

	if (!header || !base64Data) {
		throw new Error('Invalid data URI format');
	}

	const mimeType = header.replace('data:', '').replace(';base64', '');
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return { buffer: bytes.buffer, mimeType };
}

// ──────────────────────────────────────────────
// Network and vault integration functions
// ──────────────────────────────────────────────

/**
 * Downloads a remote image with a 30-second timeout.
 * D-05: Timeout via Promise.race.
 * D-08: Validates Content-Type before returning.
 * D-10: Validates response.status === 200 before accessing arrayBuffer.
 */
async function fetchWithTimeout(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
	let timerId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timerId = setTimeout(() => reject(new Error('Download timeout: ' + url)), TIMEOUT_MS);
	});

	try {
		const result = await Promise.race([
			(async () => {
				const response = await requestUrl({ url, method: 'GET' });

				// D-10: Check status before accessing body
				if (response.status !== 200) {
					throw new Error('HTTP ' + response.status);
				}

				// D-08: Validate Content-Type
				const contentType = response.headers['content-type'] ?? '';
				if (!isValidImageContentType(contentType)) {
					throw new Error('Non-image Content-Type: ' + contentType);
				}

				return { buffer: response.arrayBuffer, contentType };
			})(),
			timeoutPromise,
		]);
		return result;
	} finally {
		clearTimeout(timerId!);
	}
}

/**
 * Resolves {{DATE:...}} templates in attachment folder paths.
 * Supports YYYY, MM, DD tokens (used by community plugins like Custom Attachment Location).
 */
function resolvePathTemplates(path: string): string {
	return path.replace(/\{\{DATE:([^}]+)\}\}/gi, (_, format: string) => {
		const now = new Date();
		return format
			.replace('YYYY', String(now.getFullYear()))
			.replace('YY', String(now.getFullYear()).slice(2))
			.replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
			.replace('DD', String(now.getDate()).padStart(2, '0'));
	});
}

/**
 * Ensures all ancestor folders exist for a given vault-relative folder path.
 */
async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
	if (!folderPath) return;
	const normalized = normalizePath(folderPath);
	if (app.vault.getAbstractFileByPath(normalized)) return;

	// Create ancestors first
	const parts = normalized.split('/');
	let current = '';
	for (const part of parts) {
		current = current ? current + '/' + part : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

/**
 * Returns an available (non-conflicting) vault-relative file path.
 * Appends " 1", " 2", etc. if the path already exists (mirrors Obsidian behaviour).
 */
function deduplicatePath(app: App, basePath: string): string {
	let candidate = basePath;
	let counter = 0;
	while (app.vault.getAbstractFileByPath(candidate)) {
		counter++;
		const dotIdx = basePath.lastIndexOf('.');
		const name = dotIdx > -1 ? basePath.slice(0, dotIdx) : basePath;
		const ext = dotIdx > -1 ? basePath.slice(dotIdx) : '';
		candidate = `${name}-${counter}${ext}`;
	}
	return candidate;
}

/**
 * Saves an ArrayBuffer to the vault.
 * D-04: Tries getAvailablePathForAttachment first; falls back to manual path
 *       construction when the vault's attachment folder uses templates like
 *       {{DATE:YYYY/MM}} that the built-in API cannot resolve.
 * PITFALLS C3: Uses vault.createBinary, never adapter.writeBinary.
 */
async function saveToVault(app: App, filename: string, notePath: string, buffer: ArrayBuffer): Promise<string> {
	let targetPath: string;

	try {
		// Happy path — let Obsidian resolve the attachment location
		targetPath = await app.fileManager.getAvailablePathForAttachment(filename, notePath);
	} catch {
		// Fallback — resolve templates and construct the path ourselves
		const rawFolder: string = (app.vault as { getConfig?: (key: string) => unknown }).getConfig?.('attachmentFolderPath') as string | undefined ?? '';
		const resolved = resolvePathTemplates(rawFolder);

		let folder: string;
		if (resolved.startsWith('./')) {
			// Relative to current note's folder
			const noteFolder = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
			folder = noteFolder ? noteFolder + '/' + resolved.slice(2) : resolved.slice(2);
		} else if (resolved === '.' || resolved === '') {
			// Same folder as current note
			folder = notePath.includes('/') ? notePath.slice(0, notePath.lastIndexOf('/')) : '';
		} else {
			// Absolute vault path
			folder = resolved;
		}

		folder = normalizePath(folder);
		await ensureFolderExists(app, folder);

		const basePath = normalizePath(folder ? folder + '/' + filename : filename);
		targetPath = deduplicatePath(app, basePath);
	}

	const normalized = normalizePath(targetPath);
	try {
		await app.vault.createBinary(normalized, buffer);
	} catch (e) {
		// Concurrent writes may race on the same filename — retry with next available name
		const msg = e instanceof Error ? e.message : '';
		if (msg.includes('already exists')) {
			const retryPath = deduplicatePath(app, normalized);
			await app.vault.createBinary(retryPath, buffer);
			return retryPath;
		}
		throw e;
	}
	return normalized;
}

/**
 * Processes a single ImageRef: handles both base64 and HTTP/wiki image types.
 * D-06: Enforces 15MB mobile size limit on the decoded/downloaded buffer.
 */
async function processOneRef(ref: ImageRef, app: App, notePath: string, namingStrategy: NamingStrategy): Promise<DownloadResult> {
	if (ref.type === 'base64') {
		// D-13/D-14: Local decoding, browser-only APIs
		const { buffer, mimeType } = decodeBase64Image(ref.url);

		// D-06: Mobile size limit
		if (Platform.isMobile && buffer.byteLength > MOBILE_SIZE_LIMIT) {
			throw new Error(
				`Image size ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds mobile limit (15MB)`
			);
		}

		const filename = deriveFilenameWithStrategy(ref.url, undefined, buffer, namingStrategy, true, mimeType);
		const localPath = await saveToVault(app, filename, notePath, buffer);
		return { ref, localPath, status: 'ok' };
	}

	// ref.type === 'http' or 'wiki'
	const { buffer, contentType } = await fetchWithTimeout(ref.url);

	// D-06: Mobile size limit on downloaded buffer
	if (Platform.isMobile && buffer.byteLength > MOBILE_SIZE_LIMIT) {
		throw new Error(
			`Image size ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds mobile limit (15MB)`
		);
	}

	const filename = deriveFilenameWithStrategy(ref.url, contentType, buffer, namingStrategy, false);
	const localPath = await saveToVault(app, filename, notePath, buffer);
	return { ref, localPath, status: 'ok' };
}

/**
 * Downloads a single image with one retry on failure.
 * D-09: Retry once for HTTP/wiki; base64 never retries (no network involved).
 * ERR-01: Always resolves — never rejects — so one failure cannot block others.
 */
async function downloadOneWithRetry(ref: ImageRef, app: App, notePath: string, namingStrategy: NamingStrategy): Promise<DownloadResult> {
	try {
		return await processOneRef(ref, app, notePath, namingStrategy);
	} catch (e1) {
		// D-09: base64 decode failures are not network errors — do not retry
		if (ref.type === 'base64') {
			const error = e1 instanceof Error ? e1.message : String(e1);
			console.warn('[download-image] Skipped base64 image: ' + error);
			return { ref, localPath: '', status: 'failed', error };
		}

		// Retry once for HTTP/wiki
		try {
			return await processOneRef(ref, app, notePath, namingStrategy);
		} catch (e2) {
			const error = e2 instanceof Error ? e2.message : String(e2);
			console.warn('[download-image] Skipped ' + ref.url + ': ' + error);
			return { ref, localPath: '', status: 'failed', error };
		}
	}
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export interface DownloadOptions {
	concurrency: number;
	namingStrategy: NamingStrategy;
	onProgress?: (completed: number, total: number) => void;
}

/**
 * Downloads all image references and returns results for each.
 * Processes in batches of options.concurrency to avoid overwhelming the network.
 * D-12: Returns DownloadResult[] — ok entries have localPath, failed entries have error.
 * ERR-01: Uses Promise.allSettled so one rejection never blocks the batch.
 */
export async function downloadImages(
	refs: ImageRef[],
	app: App,
	notePath: string,
	options?: DownloadOptions
): Promise<DownloadResult[]> {
	if (refs.length === 0) return [];

	const concurrency = options?.concurrency ?? 3;
	const namingStrategy = options?.namingStrategy ?? 'original';

	// Deduplicate by URL — download each unique URL once, reuse result for all refs sharing it
	const uniqueUrls = [...new Set(refs.map(r => r.url))];
	const urlToResult = new Map<string, DownloadResult>();
	let completedSoFar = 0;

	for (let i = 0; i < uniqueUrls.length; i += concurrency) {
		const batch = uniqueUrls.slice(i, i + concurrency);
		const batchRefs = batch.map(url => refs.find(r => r.url === url)!);
		const settled = await Promise.allSettled(
			batchRefs.map(async (ref) => {
				try {
					return await downloadOneWithRetry(ref, app, notePath, namingStrategy);
				} catch (e) {
					// Safety net: should never reach here, but preserve the ref
					const error = e instanceof Error ? e.message : String(e);
					return { ref, localPath: '', status: 'failed' as const, error };
				}
			})
		);

		for (let j = 0; j < settled.length; j++) {
			const item = settled[j]!;
			if (item.status === 'fulfilled') {
				urlToResult.set(batch[j]!, item.value);
			}
		}

		completedSoFar += batch.length;
		options?.onProgress?.(completedSoFar, uniqueUrls.length);
	}

	// Map results back to all original refs (duplicates share the same localPath)
	return refs.map(ref => {
		const result = urlToResult.get(ref.url);
		if (result) {
			return { ref, localPath: result.localPath, status: result.status, error: result.error };
		}
		return { ref, localPath: '', status: 'failed' as const, error: 'Download not attempted' };
	});
}
