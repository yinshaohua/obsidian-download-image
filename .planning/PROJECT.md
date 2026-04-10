# obsidian-download-image

## What This Is

An Obsidian plugin that downloads remote images referenced in documents to local storage. Users trigger a command from the command palette, and the plugin scans the current document for all image references (Markdown `![](url)`, Wiki `![[url]]`, and embedded base64), downloads external images to the Obsidian default attachment folder, and automatically replaces the URLs with local paths.

## Core Value

One command to localize all images in a document — making notes fully portable and independent of external image hosts.

## Requirements

### Validated

- ✓ TypeScript + esbuild build pipeline — existing (template)
- ✓ Obsidian Plugin API integration — existing (template)
- ✓ Settings tab framework — existing (template)
- ✓ Command palette registration — existing (template)
- ✓ ESLint + TypeScript strict mode — existing (template)
- ✓ Parse Markdown image syntax `![alt](url)` — Validated in Phase 1: Foundation & Parsing
- ✓ Parse Wiki image syntax `![[url]]` — Validated in Phase 1: Foundation & Parsing
- ✓ Parse embedded base64 image data — Validated in Phase 1: Foundation & Parsing
- ✓ Download external images (http/https) to local storage — Validated in Phase 2: Download & Storage
- ✓ Save images to Obsidian default attachment folder — Validated in Phase 2: Download & Storage
- ✓ Handle duplicate filenames (avoid overwriting) — Validated in Phase 2: Download & Storage
- ✓ Error handling for failed downloads (timeout, 404, etc.) — Validated in Phase 2: Download & Storage

### Active

- [ ] Scan vault for orphaned attachments not referenced by any document
- [ ] Scan current document for orphaned attachments it previously referenced
- [ ] Display orphan list for user confirmation before cleanup
- [ ] Configurable cleanup method: move to .trash or permanent delete
- [ ] Result summary via Notice after cleanup

### Out of Scope

- Batch processing across multiple documents — v1 focuses on single active document
- Image compression or format conversion — download as-is
- Automatic trigger on paste/open — v1 is manual command only
- CDN or proxy support — direct download only
- Image gallery or management UI — not a media manager
- Automatic cleanup on file delete/rename — v1.1 is manual command only
- Cleanup scheduling or background scanning — manual trigger only

## Current Milestone: v1.1 Clean Unused Attachments

**Goal:** 扫描 Vault 中未被任何文档引用的孤立附件，提供列表确认后清理

**Target features:**
- 全 Vault 扫描命令：找出所有未被引用的附件（图片、PDF 等）
- 当前文档清理命令：找出当前文档曾引用但已删除的孤立附件
- 扫描后先展示列表，用户确认后再执行清理
- 清理方式可配置：移到 .trash 或直接删除
- 结果通知：显示清理了多少文件

## Context

- Based on the official Obsidian sample plugin template
- Build system: esbuild (dev watch + production build), TypeScript strict mode
- Target: Obsidian v0.15.0+, both desktop and mobile
- Plugin ID will be changed from "sample-plugin" to "obsidian-download-image"
- Existing template code (MyPlugin, SampleModal, SampleSettingTab) will be replaced with actual plugin logic

## Constraints

- **Platform**: Must work on both desktop and mobile Obsidian (isDesktopOnly: false)
- **API**: Use only official Obsidian API for file operations (no direct fs access)
- **Build**: Maintain existing esbuild + TypeScript toolchain
- **Bundle**: Single main.js output, no external runtime dependencies
- **Network**: Handle CORS restrictions and various image hosting services gracefully

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Command palette trigger only | Simplest UX for v1, no side effects | — Pending |
| Obsidian default attachment folder | Follows user's existing vault organization | — Pending |
| Auto-replace URLs after download | Core value: one-click localization | — Pending |
| All image formats (md/wiki/base64) | Comprehensive coverage, no missed images | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after milestone v1.1 started*
