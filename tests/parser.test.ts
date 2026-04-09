import { describe, it, expect } from 'vitest';
import { extractImages } from '../src/parser';

describe('extractImages', () => {

  describe('Markdown image syntax (PARSE-01)', () => {
    it('extracts basic http URL with alt text', () => {
      const refs = extractImages('![alt text](https://example.com/img.png)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.type).toBe('http');
      expect(refs[0]?.url).toBe('https://example.com/img.png');
      expect(refs[0]?.alt).toBe('alt text');
      expect(refs[0]?.original).toBe('![alt text](https://example.com/img.png)');
    });

    it('preserves URL query parameters without truncation', () => {
      const refs = extractImages('![](https://cdn.example.com/img.png?token=abc&w=800)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://cdn.example.com/img.png?token=abc&w=800');
    });

    it('preserves URL fragment', () => {
      const refs = extractImages('![](https://example.com/img.png#section)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toContain('#section');
    });

    it('preserves CDN signed URL with complex query string', () => {
      const url = 'https://s3.amazonaws.com/bucket/img.jpg?X-Amz-Signature=abc123&X-Amz-Date=20240101';
      const refs = extractImages(`![](${url})`);
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe(url);
    });

    it('handles empty alt text', () => {
      const refs = extractImages('![](https://example.com/img.png)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.alt).toBe('');
    });

    it('extracts http (not just https) URLs', () => {
      const refs = extractImages('![](http://example.com/img.png)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('http://example.com/img.png');
    });

    it('extracts multiple images from one document', () => {
      const content = '![a](https://example.com/1.png)\nSome text\n![b](https://example.com/2.png)';
      const refs = extractImages(content);
      expect(refs).toHaveLength(2);
      expect(refs[0]?.url).toBe('https://example.com/1.png');
      expect(refs[1]?.url).toBe('https://example.com/2.png');
    });
  });

  describe('Wiki image syntax (PARSE-02)', () => {
    it('extracts external http URL in wiki syntax', () => {
      const refs = extractImages('![[https://example.com/img.png]]');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.type).toBe('wiki');
      expect(refs[0]?.url).toBe('https://example.com/img.png');
      expect(refs[0]?.original).toBe('![[https://example.com/img.png]]');
    });

    it('extracts URL and ignores sizing parameter after pipe', () => {
      const refs = extractImages('![[https://example.com/img.png|300]]');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
    });

    it('does not extract vault-internal wiki links', () => {
      const refs = extractImages('![[Pasted Image 2024.png]]');
      expect(refs).toHaveLength(0);
    });

    it('does not extract vault-internal wiki links with subfolder', () => {
      const refs = extractImages('![[subfolder/image.png]]');
      expect(refs).toHaveLength(0);
    });

    it('extracts http (not just https) wiki links', () => {
      const refs = extractImages('![[http://example.com/img.png]]');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.type).toBe('wiki');
    });

    it('wiki refs have no alt property', () => {
      const refs = extractImages('![[https://example.com/img.png]]');
      expect(refs[0]?.alt).toBeUndefined();
    });
  });

  describe('Base64 embedded images (PARSE-03)', () => {
    it('identifies base64 PNG as type base64', () => {
      const refs = extractImages('![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.type).toBe('base64');
      expect(refs[0]?.url).toContain('data:image/png;base64,');
    });

    it('identifies base64 JPEG with alt text', () => {
      const refs = extractImages('![photo](data:image/jpeg;base64,/9j/4AAQSkZJRg)');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.type).toBe('base64');
      expect(refs[0]?.alt).toBe('photo');
    });

    it('base64 is NOT classified as http', () => {
      const refs = extractImages('![](data:image/png;base64,iVBOR)');
      expect(refs.every(r => r.type !== 'http' || !r.url.startsWith('data:'))).toBe(true);
    });
  });

  describe('HTML img tags (PARSE-04, D-06)', () => {
    it('extracts src from standard img tag', () => {
      const refs = extractImages('<img src="https://example.com/img.png">');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
      expect(refs[0]?.type).toBe('http');
    });

    it('extracts src when not first attribute (D-06)', () => {
      const refs = extractImages('<img width="100" src="https://example.com/img.png" alt="x" />');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
    });

    it('handles single-quoted src (D-06)', () => {
      const refs = extractImages("<img src='https://example.com/img.png'>");
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
    });

    it('handles unquoted src (D-06)', () => {
      const refs = extractImages('<img src=https://example.com/img.png>');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
    });

    it('handles self-closing img tag', () => {
      const refs = extractImages('<img src="https://example.com/img.png" />');
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe('https://example.com/img.png');
    });

    it('skips img with local/relative src', () => {
      const refs = extractImages('<img src="./local.png">');
      expect(refs).toHaveLength(0);
    });

    it('skips img with app:// protocol src', () => {
      const refs = extractImages('<img src="app://obsidian.md/local.png">');
      expect(refs).toHaveLength(0);
    });

    it('HTML img refs have no alt property on ImageRef', () => {
      const refs = extractImages('<img src="https://example.com/img.png" alt="description">');
      expect(refs[0]?.alt).toBeUndefined();
    });
  });

  describe('Mixed content', () => {
    it('extracts all types from a single document', () => {
      const content = [
        '# My Note',
        '![markdown](https://example.com/md.png)',
        'Some text here',
        '![[https://example.com/wiki.png]]',
        '![](data:image/png;base64,iVBORw0KGgo)',
        '<img src="https://example.com/html.png">',
      ].join('\n');
      const refs = extractImages(content);
      expect(refs).toHaveLength(4);

      const types = refs.map(r => r.type);
      expect(types).toContain('http');
      expect(types).toContain('wiki');
      expect(types).toContain('base64');
    });
  });

  describe('Negative cases', () => {
    it('does not match regular Markdown links (no !)', () => {
      const refs = extractImages('[text](https://example.com)');
      expect(refs).toHaveLength(0);
    });

    it('returns empty array for empty string', () => {
      const refs = extractImages('');
      expect(refs).toHaveLength(0);
    });

    it('returns empty array for document with no images', () => {
      const refs = extractImages('# Title\n\nJust some text with no images.\n');
      expect(refs).toHaveLength(0);
    });
  });

});
