import { App, requestUrl, normalizePath, Platform } from 'obsidian';
import { ImageRef } from './parser';

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

const CONCURRENCY = 3;                        // D-11: hardcoded, Phase 3 makes configurable
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
 * Validates that a Content-Type header indicates an image response.
 * D-08: Accept image/* and application/octet-stream; reject text/html etc.
 */
export function isValidImageContentType(contentType: string | undefined): boolean {
	if (!contentType) return false;
	const ct = contentType.toLowerCase();
	return ct.startsWith('image/') || ct === 'application/octet-stream';
}

/**
 * Derives a filename from a remote URL plus an optional Content-Type hint.
 * D-01: Priority — URL path segment → Content-Type inference → fallback png
 * D-02: CDN hash/UUID segments fall back to image-{timestamp}
 */
export function deriveFilenameFromUrl(url: string, contentType?: string): string {
	// Strip query string and fragment before extracting path
	const urlWithoutQuery = url.split('?')[0]?.split('#')[0] ?? '';
	const pathSegment = urlWithoutQuery.split('/').pop() ?? '';

	// If the segment already has a recognisable file extension, use it directly
	if (pathSegment && /\.\w{2,5}$/.test(pathSegment)) {
		return pathSegment;
	}

	// No valid extension — infer from Content-Type
	const mimeKey = contentType?.split(';')[0]?.toLowerCase().trim() ?? '';
	const ext = MIME_TO_EXT[mimeKey] ?? 'png';

	// Short/empty segment (CDN hash, UUID) → timestamp-based name (D-02)
	const base = pathSegment && pathSegment.length > 2 ? pathSegment : `image-${Date.now()}`;
	return `${base}.${ext}`;
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
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('Download timeout: ' + url)), TIMEOUT_MS)
	);

	const fetchPromise = (async () => {
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
	})();

	return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * Saves an ArrayBuffer to the vault using Obsidian's attachment path resolver.
 * D-04: Uses getAvailablePathForAttachment to honour vault settings and avoid duplicates.
 * PITFALLS C3: Uses vault.createBinary, never adapter.writeBinary.
 */
async function saveToVault(app: App, filename: string, notePath: string, buffer: ArrayBuffer): Promise<string> {
	const attachPath = await app.fileManager.getAvailablePathForAttachment(filename, notePath);
	const normalized = normalizePath(attachPath);
	await app.vault.createBinary(normalized, buffer);
	return normalized;
}

/**
 * Processes a single ImageRef: handles both base64 and HTTP/wiki image types.
 * D-06: Enforces 15MB mobile size limit on the decoded/downloaded buffer.
 */
async function processOneRef(ref: ImageRef, app: App, notePath: string): Promise<DownloadResult> {
	if (ref.type === 'base64') {
		// D-13/D-14: Local decoding, browser-only APIs
		const { buffer, mimeType } = decodeBase64Image(ref.url);

		// D-06: Mobile size limit
		if (Platform.isMobile && buffer.byteLength > MOBILE_SIZE_LIMIT) {
			throw new Error(
				`Image size ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds mobile limit (15MB)`
			);
		}

		const filename = deriveFilenameFromBase64(mimeType);
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

	const filename = deriveFilenameFromUrl(ref.url, contentType);
	const localPath = await saveToVault(app, filename, notePath, buffer);
	return { ref, localPath, status: 'ok' };
}

/**
 * Downloads a single image with one retry on failure.
 * D-09: Retry once for HTTP/wiki; base64 never retries (no network involved).
 * ERR-01: Always resolves — never rejects — so one failure cannot block others.
 */
async function downloadOneWithRetry(ref: ImageRef, app: App, notePath: string): Promise<DownloadResult> {
	try {
		return await processOneRef(ref, app, notePath);
	} catch (e1) {
		// D-09: base64 decode failures are not network errors — do not retry
		if (ref.type === 'base64') {
			const error = e1 instanceof Error ? e1.message : String(e1);
			console.warn('[download-image] Skipped base64 image: ' + error);
			return { ref, localPath: '', status: 'failed', error };
		}

		// Retry once for HTTP/wiki
		try {
			return await processOneRef(ref, app, notePath);
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

/**
 * Downloads all image references and returns results for each.
 * D-11: Processes in batches of CONCURRENCY (3) to avoid overwhelming the network.
 * D-12: Returns DownloadResult[] — ok entries have localPath, failed entries have error.
 * ERR-01: Uses Promise.allSettled so one rejection never blocks the batch.
 */
export async function downloadImages(
	refs: ImageRef[],
	app: App,
	notePath: string
): Promise<DownloadResult[]> {
	if (refs.length === 0) return [];

	const results: DownloadResult[] = [];

	for (let i = 0; i < refs.length; i += CONCURRENCY) {
		const batch = refs.slice(i, i + CONCURRENCY);
		const settled = await Promise.allSettled(
			batch.map(async (ref) => {
				try {
					return await downloadOneWithRetry(ref, app, notePath);
				} catch (e) {
					// Safety net: should never reach here, but preserve the ref
					const error = e instanceof Error ? e.message : String(e);
					return { ref, localPath: '', status: 'failed' as const, error };
				}
			})
		);

		for (const item of settled) {
			if (item.status === 'fulfilled') {
				results.push(item.value);
			}
			// 'rejected' branch is now unreachable because inner try/catch always resolves
		}
	}

	return results;
}
