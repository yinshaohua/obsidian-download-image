---
status: partial
phase: 02-download-storage
source: [02-VERIFICATION.md]
started: 2026-04-09T17:15:00Z
updated: 2026-04-09T17:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 插件实际下载 HTTP 图片并保存到 vault
expected: 命令执行后，远程图片出现在配置的 attachment 文件夹中，文档中的 URL 在 Phase 3 前保持不变，控制台打印 Done: N downloaded, 0 failed
result: [pending]

### 2. 重复文件名自动解决（不覆盖已有文件）
expected: 对同一 URL 运行两次命令后，vault 中存在两个不同名称的文件（例如 photo.png 和 photo 1.png）
result: [pending]

### 3. 单张图片下载失败不阻塞其他图片
expected: 含有一个无效 URL 和多个有效 URL 的文档，执行命令后有效图片正常保存，控制台打印具体失败 URL 的 warning，整体不报错
result: [pending]

### 4. 移动端 15MB 限制生效
expected: 在 Obsidian Mobile 上，尝试下载 >15MB 图片时跳过并在结果中标记 failed，不尝试写入 vault
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
