---
phase: 02-download-storage
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/downloader.ts
  - src/main.ts
  - tests/downloader.test.ts
  - tests/__mocks__/obsidian.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 2 introduces the download and storage layer (`src/downloader.ts`) along with integration in `main.ts` and a test suite for the pure helper functions. The code is generally well-structured with clear separation between pure helper functions and side-effectful Obsidian API calls. The design decisions (concurrency batching, retry logic, mobile size limits, Content-Type validation) are sound.

Key concerns: (1) the `downloadImages` function silently drops results when `Promise.allSettled` reports a rejection, producing an output array shorter than the input; (2) the timeout timer in `fetchWithTimeout` is never cleared on success, leaking timers; (3) `isValidImageContentType` has an inconsistency where `application/octet-stream` with parameters would not be recognized; (4) `main.ts` has no error handling around the `downloadImages` call, so an unexpected throw would produce an unhandled promise rejection in the command handler.

## Warnings

### WR-01: Silent result loss in downloadImages when Promise.allSettled rejects

**File:** `src/downloader.ts:242-251`
**Issue:** When `Promise.allSettled` returns an item with `status: 'rejected'`, the code logs a warning but does not push any `DownloadResult` into the `results` array. This means the returned array can have fewer items than the input `refs` array. Callers that correlate results to refs by index (e.g., Phase 3 document replacement) will silently get mismatched entries. Although the comment states "this branch should never be reached," defensive code should not silently discard data.
**Fix:** Capture the `ref` in the closure so a synthetic failed result can be emitted. Replace the `batch.map` and rejection handling:
```typescript
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
```

### WR-02: Timer leak in fetchWithTimeout

**File:** `src/downloader.ts:119-121`
**Issue:** The `setTimeout` call on line 120 creates a 30-second timer. When the fetch resolves before the timeout (the common case), the timer is never cleared. With `CONCURRENCY = 3` and many images, this accumulates dangling timers. While each timer's reject callback is harmless (the Promise.race result is already settled), the timers keep the event loop active and consume resources unnecessarily.
**Fix:** Store the timer ID and clear it upon completion:
```typescript
async function fetchWithTimeout(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
    let timerId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error('Download timeout: ' + url)), TIMEOUT_MS);
    });

    try {
        const result = await Promise.race([
            (async () => {
                const response = await requestUrl({ url, method: 'GET' });
                if (response.status !== 200) {
                    throw new Error('HTTP ' + response.status);
                }
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
```

### WR-03: Missing error handling around downloadImages in command handler

**File:** `src/main.ts:25`
**Issue:** The `editorCallback` calls `await downloadImages(refs, this.app, notePath)` without a try/catch. While `downloadImages` is designed to never reject (via `Promise.allSettled` + internal catches), any unexpected runtime error (e.g., a bug in the batching loop, or `refs.slice` called on a corrupted value) would produce an unhandled promise rejection that surfaces as no user feedback. Obsidian command handlers should be robust against unexpected failures.
**Fix:** Wrap the download call in try/catch and show a Notice on failure:
```typescript
editorCallback: async (editor: Editor, view: MarkdownView) => {
    const refs = extractImages(editor.getValue());
    if (refs.length === 0) {
        new Notice('No remote images found in current note');
        return;
    }

    const notePath = view.file?.path ?? '';

    try {
        const results = await downloadImages(refs, this.app, notePath);
        const ok = results.filter(r => r.status === 'ok').length;
        const failed = results.filter(r => r.status === 'failed').length;
        new Notice(`Downloaded ${ok} image(s)${failed > 0 ? `, ${failed} failed` : ''}`);
    } catch (err) {
        console.error('[download-image] Unexpected error:', err);
        new Notice('Image download failed unexpectedly. Check console for details.');
    }
}
```

### WR-04: isValidImageContentType does not parse parameters for octet-stream

**File:** `src/downloader.ts:43-47`
**Issue:** The function correctly handles `image/*` content types with parameters (e.g., `image/png; charset=utf-8`) because `startsWith('image/')` matches regardless of trailing parameters. However, the `application/octet-stream` check uses strict equality (`ct === 'application/octet-stream'`), so a Content-Type like `application/octet-stream; charset=binary` would be rejected. While uncommon, some CDN servers do append parameters to this MIME type.
**Fix:** Use `startsWith` or strip parameters before the equality check:
```typescript
export function isValidImageContentType(contentType: string | undefined): boolean {
    if (!contentType) return false;
    const ct = contentType.toLowerCase().split(';')[0].trim();
    return ct.startsWith('image/') || ct === 'application/octet-stream';
}
```

## Info

### IN-01: console.log left in production command handler

**File:** `src/main.ts:31`
**Issue:** `console.log` is used for the success message in the command handler. This will be visible in the developer console in production. The comment says "Phase 3 will replace URLs," suggesting this is temporary, but it should either be removed or replaced with `console.debug` or a user-facing `Notice`.
**Fix:** Replace with a `Notice` for user feedback (as shown in WR-03 fix) or use `console.debug` if the message is purely for developer diagnostics.

### IN-02: Data URI MIME extraction fragile with extra parameters

**File:** `src/downloader.ts:99`
**Issue:** The MIME type extraction from data URIs uses `header.replace('data:', '').replace(';base64', '')`. If a data URI contains additional parameters (e.g., `data:image/png;charset=utf-8;base64,...`), the extracted MIME would be `image/png;charset=utf-8` which would fail to match in `MIME_TO_EXT`. The fallback to `.png` is safe, but the MIME type passed to `deriveFilenameFromBase64` would be incorrect. In practice, extra parameters in image data URIs are rare.
**Fix:** Use a more robust parser:
```typescript
const mimeType = header.replace(/^data:/, '').replace(/;.*$/, '');
```
This strips everything after the first semicolon, extracting only the MIME type.

### IN-03: Placeholder settings in settings.ts

**File:** `src/settings.ts:6-9`
**Issue:** The `DownloadImageSettings` interface contains only `mySetting: string` with a default value of `'default'`, and the settings tab labels it "It's a secret." This appears to be scaffold code from the Obsidian plugin template. While Phase 3 is expected to introduce real settings, the placeholder text ("It's a secret") could confuse users who open the settings tab.
**Fix:** No action needed if Phase 3 will replace this. Consider adding a TODO comment to make the intent explicit.

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
