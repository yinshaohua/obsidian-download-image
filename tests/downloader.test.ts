import { describe, it, expect } from 'vitest';
import {
	isValidImageContentType,
	deriveFilenameFromUrl,
	deriveFilenameFromBase64,
	deriveFilenameWithStrategy,
	decodeBase64Image,
	MIME_TO_EXT,
} from '../src/downloader';

// A 1x1 red PNG pixel encoded as base64 (68 bytes decoded)
const TINY_PNG_DATA_URI =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// A minimal valid JPEG: 1x1 white pixel
const TINY_JPEG_DATA_URI =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH7QeGDQsLBg0MCxAQDRERExYVFhUREyAbGB8bHRsdHR0gICAiICInKicnJyf/wAARAQABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwAB/9k=';

describe('isValidImageContentType (D-08)', () => {
	it('D-08: accepts image/png', () => {
		expect(isValidImageContentType('image/png')).toBe(true);
	});

	it('D-08: accepts image/jpeg', () => {
		expect(isValidImageContentType('image/jpeg')).toBe(true);
	});

	it('D-08: accepts image/gif', () => {
		expect(isValidImageContentType('image/gif')).toBe(true);
	});

	it('D-08: accepts image/webp', () => {
		expect(isValidImageContentType('image/webp')).toBe(true);
	});

	it('D-08: accepts image/svg+xml', () => {
		expect(isValidImageContentType('image/svg+xml')).toBe(true);
	});

	it('D-08: accepts application/octet-stream as CDN fallback', () => {
		expect(isValidImageContentType('application/octet-stream')).toBe(true);
	});

	it('D-08: accepts content-type with parameters (image/png; charset=utf-8)', () => {
		expect(isValidImageContentType('image/png; charset=utf-8')).toBe(true);
	});

	it('D-08: rejects text/html', () => {
		expect(isValidImageContentType('text/html')).toBe(false);
	});

	it('D-08: rejects application/json', () => {
		expect(isValidImageContentType('application/json')).toBe(false);
	});

	it('D-08: rejects undefined', () => {
		expect(isValidImageContentType(undefined)).toBe(false);
	});

	it('D-08: rejects empty string', () => {
		expect(isValidImageContentType('')).toBe(false);
	});

	it('D-08: case insensitive — accepts Image/PNG', () => {
		expect(isValidImageContentType('Image/PNG')).toBe(true);
	});
});

describe('deriveFilenameFromUrl (D-01, D-02)', () => {
	it('D-01: extracts filename from simple URL', () => {
		expect(deriveFilenameFromUrl('https://example.com/photo.png')).toBe('photo.png');
	});

	it('D-01: strips query string before extracting filename', () => {
		expect(deriveFilenameFromUrl('https://example.com/photo.png?token=abc&w=100')).toBe('photo.png');
	});

	it('D-01: strips fragment before extracting filename', () => {
		expect(deriveFilenameFromUrl('https://example.com/photo.png#section')).toBe('photo.png');
	});

	it('D-01: preserves original extension (jpeg)', () => {
		expect(deriveFilenameFromUrl('https://example.com/photo.jpeg')).toBe('photo.jpeg');
	});

	it('D-02: extensionless CDN path with Content-Type infers .jpg extension', () => {
		const filename = deriveFilenameFromUrl('https://cdn.example.com/a1b2c3d4e5f6', 'image/jpeg');
		expect(filename).toMatch(/\.jpg$/);
	});

	it('D-02: extensionless CDN path without Content-Type falls back to .png', () => {
		const filename = deriveFilenameFromUrl('https://cdn.example.com/a1b2c3d4e5f6');
		expect(filename).toMatch(/\.png$/);
	});

	it('D-02: empty path segment triggers timestamp fallback with correct extension', () => {
		const filename = deriveFilenameFromUrl('https://example.com/', 'image/webp');
		expect(filename).toMatch(/^image-[a-z0-9]+\.webp$/);
	});

	it('D-02: very short path segment (< 3 chars) triggers hash fallback', () => {
		const filename = deriveFilenameFromUrl('https://example.com/ab');
		expect(filename).toMatch(/^image-[a-z0-9]+\./);
	});
});

describe('deriveFilenameFromBase64 (D-03)', () => {
	it('D-03: image/png produces base64-{timestamp}.png pattern', () => {
		expect(deriveFilenameFromBase64('image/png')).toMatch(/^base64-\d+\.png$/);
	});

	it('D-03: image/jpeg produces base64-{timestamp}.jpg pattern', () => {
		expect(deriveFilenameFromBase64('image/jpeg')).toMatch(/^base64-\d+\.jpg$/);
	});

	it('D-03: image/gif produces base64-{timestamp}.gif pattern', () => {
		expect(deriveFilenameFromBase64('image/gif')).toMatch(/^base64-\d+\.gif$/);
	});

	it('D-03: unknown MIME type falls back to .png extension', () => {
		expect(deriveFilenameFromBase64('unknown/type')).toMatch(/^base64-\d+\.png$/);
	});
});

describe('decodeBase64Image (D-13, D-14)', () => {
	it('D-13: valid PNG data URI returns mimeType image/png', () => {
		const result = decodeBase64Image(TINY_PNG_DATA_URI);
		expect(result.mimeType).toBe('image/png');
	});

	it('D-13: valid PNG data URI returns an ArrayBuffer', () => {
		const result = decodeBase64Image(TINY_PNG_DATA_URI);
		expect(result.buffer).toBeInstanceOf(ArrayBuffer);
	});

	it('D-13: decoded PNG buffer has correct byte length (70 bytes for the 1x1 pixel PNG)', () => {
		const result = decodeBase64Image(TINY_PNG_DATA_URI);
		// The known 1x1 PNG above decodes to 70 bytes (verified at runtime)
		expect(result.buffer.byteLength).toBe(70);
	});

	it('D-13: valid JPEG data URI returns mimeType image/jpeg', () => {
		const result = decodeBase64Image(TINY_JPEG_DATA_URI);
		expect(result.mimeType).toBe('image/jpeg');
	});

	it('D-13, D-14: throws on data URI missing comma separator', () => {
		expect(() => decodeBase64Image('data:image/png;base64')).toThrow();
	});

	it('D-13, D-14: throws on empty string input', () => {
		expect(() => decodeBase64Image('')).toThrow();
	});
});

describe('MIME_TO_EXT coverage', () => {
	it('map has at least 9 entries covering common image formats', () => {
		expect(Object.keys(MIME_TO_EXT).length).toBeGreaterThanOrEqual(9);
	});

	it('maps image/jpeg to jpg (not jpeg)', () => {
		expect(MIME_TO_EXT['image/jpeg']).toBe('jpg');
	});

	it('maps image/svg+xml to svg', () => {
		expect(MIME_TO_EXT['image/svg+xml']).toBe('svg');
	});

	it('maps modern formats: image/webp, image/avif', () => {
		expect(MIME_TO_EXT['image/webp']).toBe('webp');
		expect(MIME_TO_EXT['image/avif']).toBe('avif');
	});
});

describe('deriveFilenameWithStrategy', () => {
	const smallBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
	const differentBuffer = new Uint8Array([5, 6, 7, 8]).buffer;

	it('strategy original for HTTP URL returns same as deriveFilenameFromUrl', () => {
		const url = 'https://example.com/photo.png';
		const ct = 'image/png';
		const result = deriveFilenameWithStrategy(url, ct, smallBuffer, 'original', false);
		const expected = deriveFilenameFromUrl(url, ct);
		expect(result).toBe(expected);
	});

	it('strategy original for base64 returns same as deriveFilenameFromBase64', () => {
		const url = 'data:image/png;base64,abc';
		const mime = 'image/png';
		const result = deriveFilenameWithStrategy(url, undefined, smallBuffer, 'original', true, mime);
		const expected = deriveFilenameFromBase64(mime);
		expect(result).toBe(expected);
	});

	it('strategy timestamp produces filename matching YYYYMMDD-HHMMSS prefix pattern', () => {
		const url = 'https://example.com/photo.png';
		const result = deriveFilenameWithStrategy(url, 'image/png', smallBuffer, 'timestamp', false);
		expect(result).toMatch(/^\d{8}-\d{6}-.+/);
	});

	it('strategy hash produces filename matching 8-char base36 hash with extension', () => {
		const url = 'https://example.com/photo.png';
		const result = deriveFilenameWithStrategy(url, 'image/png', smallBuffer, 'hash', false);
		expect(result).toMatch(/^[a-z0-9]{8}\.\w+$/);
	});

	it('strategy hash with same content produces same filename (content-addressable)', () => {
		const buf1 = new Uint8Array([10, 20, 30]).buffer;
		const buf2 = new Uint8Array([10, 20, 30]).buffer;
		const url = 'https://example.com/a.png';
		const r1 = deriveFilenameWithStrategy(url, 'image/png', buf1, 'hash', false);
		const r2 = deriveFilenameWithStrategy(url, 'image/png', buf2, 'hash', false);
		expect(r1).toBe(r2);
	});

	it('strategy hash with different content produces different filename', () => {
		const url = 'https://example.com/a.png';
		const r1 = deriveFilenameWithStrategy(url, 'image/png', smallBuffer, 'hash', false);
		const r2 = deriveFilenameWithStrategy(url, 'image/png', differentBuffer, 'hash', false);
		expect(r1).not.toBe(r2);
	});
});
