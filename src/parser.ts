export interface ImageRef {
	original: string;   // Full matched text, e.g. "![alt](url)" — used by Phase 3 for document replacement
	url: string;        // Extracted URL or data URI content
	type: 'http' | 'base64' | 'wiki';
	alt?: string;       // Only populated for Markdown image syntax
}

export function extractImages(content: string): ImageRef[] {
	const refs: ImageRef[] = [];

	// Branch 1: base64 Markdown images (must run BEFORE general Markdown to prevent double-match)
	const BASE64_RE = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
	let match: RegExpExecArray | null;
	while ((match = BASE64_RE.exec(content)) !== null) {
		refs.push({
			original: match[0],
			url: match[2] ?? '',
			type: 'base64',
			alt: match[1],
		});
	}

	// Branch 2: HTTP Markdown images — ![alt](https://...)
	const MD_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
	while ((match = MD_IMAGE_RE.exec(content)) !== null) {
		// Skip if this position was already matched as base64
		if (refs.some(r => r.original === match![0])) continue;
		refs.push({
			original: match[0],
			url: match[2] ?? '',
			type: 'http',
			alt: match[1],
		});
	}

	// Branch 3: Wiki syntax with HTTP URLs — ![[https://...]]
	const WIKI_HTTP_RE = /!\[\[(https?:\/\/[^\]|]+)(?:\|[^\]]*)?\]\]/g;
	while ((match = WIKI_HTTP_RE.exec(content)) !== null) {
		refs.push({
			original: match[0],
			url: match[1] ?? '',
			type: 'wiki',
		});
	}

	// Branch 4: HTML img tags (D-06: arbitrary attribute order, quote styles)
	const HTML_IMG_RE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*\/?>/gi;
	while ((match = HTML_IMG_RE.exec(content)) !== null) {
		const src = match[1] ?? match[2] ?? match[3];
		if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
			refs.push({
				original: match[0],
				url: src,
				type: 'http',
			});
		}
	}

	return refs;
}
