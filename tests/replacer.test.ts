import { describe, it, expect } from 'vitest';
import {
	isInsideCodeBlock,
	buildReplacementMap,
	applyReplacements,
} from '../src/replacer';
import { DownloadResult } from '../src/downloader';
import { ImageRef } from '../src/parser';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Factory for a successful DownloadResult */
function okResult(ref: ImageRef, localPath: string): DownloadResult {
	return { ref, localPath, status: 'ok' };
}

/** Factory for a failed DownloadResult */
function failedResult(ref: ImageRef, error = 'timeout'): DownloadResult {
	return { ref, localPath: '', status: 'failed', error };
}

/** Shorthand to build an ImageRef for markdown images */
function mdRef(url: string, alt = ''): ImageRef {
	return { original: `![${alt}](${url})`, url, type: 'http', alt };
}

/** Shorthand to build an ImageRef for wiki images */
function wikiRef(url: string): ImageRef {
	return { original: `![[${url}]]`, url, type: 'wiki' };
}

/** Shorthand to build an ImageRef for HTML img tags */
function htmlRef(url: string): ImageRef {
	return { original: `<img src="${url}">`, url, type: 'http' };
}

// ──────────────────────────────────────────────
// isInsideCodeBlock
// ──────────────────────────────────────────────

describe('isInsideCodeBlock', () => {
	it('returns true for position inside backtick fenced code block', () => {
		const content = 'before\n```\ncode here\n```\nafter';
		const pos = content.indexOf('code here');
		expect(isInsideCodeBlock(content, pos)).toBe(true);
	});

	it('returns true for position inside tilde fenced code block', () => {
		const content = 'before\n~~~\ncode here\n~~~\nafter';
		const pos = content.indexOf('code here');
		expect(isInsideCodeBlock(content, pos)).toBe(true);
	});

	it('returns false for position outside code blocks', () => {
		const content = 'before\n```\ncode\n```\nafter this';
		const pos = content.indexOf('after this');
		expect(isInsideCodeBlock(content, pos)).toBe(false);
	});

	it('returns true for position inside inline code (backtick pair)', () => {
		const content = 'text `inline code` more text';
		const pos = content.indexOf('inline code');
		expect(isInsideCodeBlock(content, pos)).toBe(true);
	});

	it('returns false for position in normal text adjacent to code block', () => {
		const content = 'normal text\n```\ncode\n```\n';
		const pos = content.indexOf('normal text');
		expect(isInsideCodeBlock(content, pos)).toBe(false);
	});

	it('returns false for position before any code blocks', () => {
		const content = 'hello world\n```\ncode\n```';
		expect(isInsideCodeBlock(content, 0)).toBe(false);
	});

	it('returns false for position after closing fence', () => {
		const content = '```\ncode\n```\noutside';
		const pos = content.indexOf('outside');
		expect(isInsideCodeBlock(content, pos)).toBe(false);
	});
});

// ──────────────────────────────────────────────
// buildReplacementMap
// ──────────────────────────────────────────────

describe('buildReplacementMap', () => {
	it('Markdown image with ok result produces replacement with local path', () => {
		const url = 'https://example.com/img.png';
		const ref = mdRef(url, 'alt');
		const content = `Some text ![alt](${url}) more text`;
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(1);
		expect(replacements[0]!.to).toBe('![alt](attachments/img.png)');
	});

	it('Wiki image with ok result produces wiki-style replacement', () => {
		const url = 'https://example.com/img.png';
		const ref = wikiRef(url);
		const content = `Some text ![[${url}]] more text`;
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(1);
		expect(replacements[0]!.to).toBe('![[attachments/img.png]]');
	});

	it('HTML img tag with ok result produces replacement with updated src', () => {
		const url = 'https://example.com/img.png';
		const ref = htmlRef(url);
		const content = `Some text <img src="${url}"> more text`;
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(1);
		expect(replacements[0]!.to).toContain('src="attachments/img.png"');
	});

	it('failed result produces no replacement entry', () => {
		const url = 'https://example.com/img.png';
		const ref = mdRef(url);
		const content = `![](${url})`;
		const results = [failedResult(ref)];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(0);
	});

	it('image reference inside fenced code block produces no replacement', () => {
		const url = 'https://example.com/img.png';
		const ref = mdRef(url);
		const content = '```\n![](https://example.com/img.png)\n```';
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(0);
	});

	it('image reference inside inline code produces no replacement', () => {
		const url = 'https://example.com/img.png';
		const ref = mdRef(url);
		const content = 'text `![](https://example.com/img.png)` text';
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(0);
	});

	it('multiple occurrences of same URL produce multiple replacement entries', () => {
		const url = 'https://example.com/img.png';
		const ref = mdRef(url);
		const content = `![](${url})\nSome text\n![](${url})`;
		const results = [okResult(ref, 'attachments/img.png')];

		const replacements = buildReplacementMap(content, results);

		expect(replacements).toHaveLength(2);
	});

	it('replacements are sorted by index descending', () => {
		const url1 = 'https://example.com/a.png';
		const url2 = 'https://example.com/b.png';
		const ref1 = mdRef(url1);
		const ref2 = mdRef(url2);
		const content = `![](${url1})\n![](${url2})`;
		const results = [
			okResult(ref1, 'attachments/a.png'),
			okResult(ref2, 'attachments/b.png'),
		];

		const replacements = buildReplacementMap(content, results);

		expect(replacements.length).toBeGreaterThanOrEqual(2);
		for (let i = 1; i < replacements.length; i++) {
			expect(replacements[i - 1]!.index).toBeGreaterThan(replacements[i]!.index);
		}
	});
});

// ──────────────────────────────────────────────
// applyReplacements
// ──────────────────────────────────────────────

describe('applyReplacements', () => {
	it('single replacement at known index produces correct output', () => {
		const content = 'Hello WORLD end';
		const replacements = [{ from: 'WORLD', to: 'Earth', index: 6 }];

		const result = applyReplacements(content, replacements);

		expect(result).toBe('Hello Earth end');
	});

	it('multiple replacements applied correctly (end-to-start order)', () => {
		const content = 'AAA BBB CCC';
		// Descending index order (as buildReplacementMap would produce)
		const replacements = [
			{ from: 'CCC', to: 'zzz', index: 8 },
			{ from: 'AAA', to: 'xxx', index: 0 },
		];

		const result = applyReplacements(content, replacements);

		expect(result).toBe('xxx BBB zzz');
	});

	it('empty replacements array returns content unchanged', () => {
		const content = 'No changes here';
		const result = applyReplacements(content, []);
		expect(result).toBe(content);
	});
});
