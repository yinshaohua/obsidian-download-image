# Codebase Concerns

**Analysis Date:** 2026-04-09

## Unimplemented Core Functionality

**Image Download Feature Missing:**
- Issue: Project is named "obsidian-download-image" but contains zero image downloading functionality. All code is template boilerplate from Obsidian sample plugin.
- Files: `src/main.ts`, `src/settings.ts`
- Impact: Plugin does not deliver promised functionality. Users installing this plugin will find it does nothing related to image downloading.
- Fix approach: Implement actual image download logic, add URL input in modal, handle file storage, add error handling for failed downloads.

## Test Coverage Gaps

**No Tests:**
- What's not tested: Entire codebase - 135 lines of TypeScript with zero test files
- Files: `src/main.ts`, `src/settings.ts`
- Risk: Changes to core plugin functionality (loading settings, registering commands, handling events) have no safety net. Refactoring could break plugin behavior without detection.
- Priority: High

## Stale Template Code

**Placeholder Implementations:**
- Issue: Multiple example features exist solely for Obsidian template demonstration, not actual plugin use:
  - Ribbon icon that shows "This is a notice!" (line 13-16 in `src/main.ts`)
  - Global click event listener that logs "Click" to every page interaction (line 64-66)
  - 5-minute polling interval that logs to console (line 69)
  - Sample modal with placeholder "Woah!" text (line 85-99)
- Files: `src/main.ts`
- Impact: These features waste memory (interval runs every 5 minutes), generate noise in console, create unnecessary global event handlers that could interfere with Obsidian's performance.
- Fix approach: Remove all template code. Keep only actual image download functionality. Remove sample commands, ribbon icon, and interval.

## Naming Misalignment

**Project Identity Mismatch:**
- Issue: `manifest.json` identifies plugin as "Sample Plugin" with ID "sample-plugin", contradicting folder name "obsidian-download-image"
- Files: `manifest.json` (lines 2-3)
- Impact: Confusing for users, makes plugin impossible to distinguish in Obsidian's plugin marketplace
- Fix approach: Update manifest.json with actual plugin name and ID.

## Incomplete Settings System

**Unused Settings Structure:**
- Issue: Settings infrastructure in place but not connected to actual plugin functionality
- Files: `src/settings.ts` (lines 4-10), `src/main.ts` (lines 23-36)
- Details: `MyPluginSettings` only contains `mySetting: string` (line 4), which is placeholder. No download directory path, no file format preferences, no metadata options.
- Impact: Users cannot configure plugin behavior. Settings UI shows placeholder "Settings #1" that does nothing useful.
- Fix approach: Replace settings with real download options: destination folder, filename pattern, image metadata handling, network timeout values.

## Type Safety Issues

**Unused and Generic Naming:**
- Issue: Classes and interfaces use placeholder names like `MyPlugin`, `SampleModal`, `SampleSettingTab`, `MyPluginSettings`
- Files: `src/main.ts` (lines 6, 85), `src/settings.ts` (lines 4, 12)
- Impact: Makes code harder to understand, violates Obsidian plugin development practices
- Fix approach: Rename to descriptive names (e.g., `ImageDownloaderPlugin`, `URLInputModal`, `DownloadSettingsTab`, `DownloadPluginSettings`)

## DOM Event Performance Concern

**Global Click Listener:**
- Problem: Global click event registered on entire document (line 64-66 in `src/main.ts`) fires on every user click in Obsidian
- Cause: Template code that wasn't removed. Showing "Click" notice on every interaction
- Impact: Creates performance overhead, spams user notifications, interferes with normal Obsidian usage
- Improvement path: Remove unless needed for image URL detection. If detecting clicks on links for download, use targeted event delegation instead.

## Resource Leak Risk

**Unmanaged Interval:**
- Problem: `setInterval` registered at line 69 runs every 5 minutes (300000ms) with no purpose
- Cause: Sample code left in production
- Impact: Continuous memory usage and CPU wake-ups. Over a month, interval fires 8640+ times with console logs
- Improvement path: Remove unless implementing background download queue. If needed, add ability to pause/stop polling.

## Missing Error Handling

**No Network Error Management:**
- What's missing: Zero error handling for network operations. Project lacks any fetch/download code, but this is critical gap for implementation.
- Files: `src/main.ts`
- Risk: When image downloading is implemented, missing error handling will cause silent failures, network timeouts without feedback, invalid URLs without validation
- Recommendation: Implement try-catch blocks, HTTP status code checking, timeout handling, user feedback via notices

## Mobile Compatibility Issue

**Desktop-Only Declaration Mismatch:**
- Issue: `manifest.json` sets `isDesktopOnly: false` (line 10), suggesting mobile support, but plugin uses global DOM events and intervals that may not work reliably on mobile Obsidian
- Files: `manifest.json`
- Recommendation: Either set to `isDesktopOnly: true` or ensure actual mobile compatibility with feature detection

## Version and Dependencies

**Dependency Staleness Risk:**
- `TypeScript` ^5.8.3 - recent, but verify against Obsidian API compatibility
- `esbuild` 0.25.5 - pinned to specific version, requires manual updates
- `obsidian` latest - follows latest Obsidian API without version pinning, risks breaking changes
- Files: `package.json`, `esbuild.config.mjs`
- Recommendation: Pin `obsidian` to specific version matching `minAppVersion` in manifest (0.15.0 is outdated - current Obsidian is 1.x+)

## Fragile Area: Settings Persistence

**Simple Object Assignment:**
- Files: `src/main.ts` (line 77)
- Why fragile: `Object.assign` pattern works but doesn't validate settings structure. Missing fields silently become undefined. No migration path if settings schema changes.
- Safe modification: Add settings validation function, implement version field in settings object for future migrations
- Test coverage: Gap - no tests for settings loading/saving

---

*Concerns audit: 2026-04-09*
