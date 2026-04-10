import { DownloadResult } from './downloader';

/**
 * Checks if a character position in the document content is inside a fenced
 * code block (``` or ~~~) or inline code (backtick pairs).
 */
export function isInsideCodeBlock(content: string, position: number): boolean {
	// Check fenced code blocks: scan lines up to position
	const textBefore = content.slice(0, position);
	const lines = textBefore.split('\n');
	let inFencedBlock = false;

	for (const line of lines) {
		const trimmed = line.trimStart();
		if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
			inFencedBlock = !inFencedBlock;
		}
	}

	if (inFencedBlock) return true;

	// Check inline code: find the line containing the position
	// and check if position falls between backtick pairs
	const lineStart = content.lastIndexOf('\n', position - 1) + 1;
	const lineEnd = content.indexOf('\n', position);
	const currentLine = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
	const posInLine = position - lineStart;

	let inInlineCode = false;
	for (let i = 0; i < posInLine; i++) {
		if (currentLine[i] === '`') {
			inInlineCode = !inInlineCode;
		}
	}

	return inInlineCode;
}

/**
 * Builds a list of replacements mapping original image references to local paths.
 * Only includes successful downloads (status === 'ok').
 * Skips occurrences inside code blocks or inline code.
 * Returns replacements sorted by index descending so applying them from the end
 * preserves earlier indices.
 */
export function buildReplacementMap(
	content: string,
	results: DownloadResult[]
): Array<{ from: string; to: string; index: number }> {
	const replacements: Array<{ from: string; to: string; index: number }> = [];

	for (const result of results) {
		if (result.status !== 'ok') continue;

		const original = result.ref.original;
		let searchStart = 0;

		while (true) {
			const idx = content.indexOf(original, searchStart);
			if (idx === -1) break;

			searchStart = idx + original.length;

			// Skip occurrences inside code blocks
			if (isInsideCodeBlock(content, idx)) continue;

			let replacement: string;
			if (result.ref.type === 'wiki') {
				replacement = `![[${result.localPath}]]`;
			} else if (result.ref.type === 'http' && original.startsWith('<img')) {
				// Preserve other attributes from the <img> tag, just replace src
				replacement = original.replace(
					/\bsrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
					`src="${result.localPath}"`
				);
			} else {
				// Standard markdown image (http or base64)
				replacement = `![${result.ref.alt ?? ''}](${result.localPath})`;
			}

			replacements.push({ from: original, to: replacement, index: idx });
		}
	}

	// Sort descending by index so replacements at the end are applied first
	replacements.sort((a, b) => b.index - a.index);
	return replacements;
}

/**
 * Applies replacements to content string. Replacements must be sorted by index
 * descending (end-of-document first) to preserve earlier indices.
 */
export function applyReplacements(
	content: string,
	replacements: Array<{ from: string; to: string; index: number }>
): string {
	for (const r of replacements) {
		content = content.slice(0, r.index) + r.to + content.slice(r.index + r.from.length);
	}
	return content;
}
