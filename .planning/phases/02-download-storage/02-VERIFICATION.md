---
phase: 02-download-storage
verified: 2026-04-09T17:14:08Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "插件实际下载 HTTP 图片并保存到 vault"
    expected: "命令执行后，远程图片出现在配置的 attachment 文件夹中，文档中的 URL 在 Phase 3 前保持不变，控制台打印 Done: N downloaded, 0 failed"
    why_human: "requestUrl 需要真实 Obsidian 运行时和网络访问，无法在 node 测试环境中模拟完整 vault 写入路径"
  - test: "重复文件名自动解决（不覆盖已有文件）"
    expected: "对同一 URL 运行两次命令后，vault 中存在两个不同名称的文件（例如 photo.png 和 photo 1.png）"
    why_human: "getAvailablePathForAttachment 行为需要真实 Obsidian vault 上下文，无法用 unit test 模拟"
  - test: "单张图片下载失败不阻塞其他图片"
    expected: "含有一个无效 URL 和多个有效 URL 的文档，执行命令后有效图片正常保存，控制台打印具体失败 URL 的 warning，整体不报错"
    why_human: "涉及真实网络请求的错误隔离，需要 Obsidian 运行时"
  - test: "移动端 15MB 限制生效"
    expected: "在 Obsidian Mobile 上，尝试下载 >15MB 图片时跳过并在结果中标记 failed，不尝试写入 vault"
    why_human: "Platform.isMobile 仅在真实移动端运行时为 true"
---

# Phase 02: Download & Storage 验证报告

**Phase Goal:** 实现通过 requestUrl 进行网络下载、vault 文件创建、路径解析、重复文件处理以及单图错误隔离
**验证时间:** 2026-04-09T17:14:08Z
**状态:** human_needed
**重新验证:** 否（初始验证）

---

## 目标达成情况

### 可观测真实性（Observable Truths）

**计划 02-01 — 下载引擎**

| # | 真实性 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 远程 HTTP/HTTPS 图片通过 requestUrl 下载并保存为二进制文件到 vault | ✓ VERIFIED | `fetchWithTimeout` 使用 `requestUrl`，`saveToVault` 调用 `vault.createBinary`，见 downloader.ts L118-153 |
| 2 | Base64 嵌入图片本地解码并保存为二进制文件，不发送网络请求 | ✓ VERIFIED | `decodeBase64Image` 使用 `atob + Uint8Array`（纯浏览器 API），`processOneRef` 在 base64 分支中不调用 `fetchWithTimeout` |
| 3 | 重复文件名通过 getAvailablePathForAttachment 自动解决 | ✓ VERIFIED | `saveToVault` L149 独占使用 `app.fileManager.getAvailablePathForAttachment`，无手动路径拼接 |
| 4 | 单张图片失败不阻塞其他图片下载 | ✓ VERIFIED | `downloadOneWithRetry` 始终 resolve（never rejects），`downloadImages` 使用 `Promise.allSettled`（L239）|
| 5 | 网络异常（超时、404、非图片 Content-Type）被单独捕获并记录 | ✓ VERIFIED | `fetchWithTimeout` 校验 status===200（L127），校验 Content-Type（L133），30s timeout via Promise.race（L140）|
| 6 | 移动端跳过超过 15MB 的图片 | ✓ VERIFIED | `processOneRef` L165 和 L180 均有 `Platform.isMobile && buffer.byteLength > MOBILE_SIZE_LIMIT` 检查 |

**计划 02-02 — 测试套件**

| # | 真实性 | 状态 | 证据 |
|---|--------|------|------|
| 7 | 纯辅助函数有自动化测试覆盖 | ✓ VERIFIED | `tests/downloader.test.ts` 173 行，34 个测试用例，62/62 全部通过（npx vitest run） |
| 8 | 文件名推导覆盖所有边界情况（CDN hash、UUID、query params、无扩展名） | ✓ VERIFIED | describe 块 `deriveFilenameFromUrl (D-01, D-02)` 包含 8 个测试（L68-104），覆盖 query strip、fragment strip、短路径回退 |
| 9 | Base64 解码从 data URI 产生有效 ArrayBuffer | ✓ VERIFIED | `decodeBase64Image` 测试组 6 个用例（L124-153），包含真实 1x1 PNG（70 字节验证）和 JPEG |
| 10 | Content-Type 验证正确接受 image/* 并拒绝非图片类型 | ✓ VERIFIED | `isValidImageContentType` 测试组 12 个用例（L18-66），含大小写不敏感测试 |
| 11 | MIME-to-extension 映射覆盖所有支持的图片格式 | ✓ VERIFIED | `MIME_TO_EXT coverage` 组 4 个用例（L155-172），验证 >= 9 个条目，含 svg、webp、avif |

**总分：11/11 已验证**

---

### 需求覆盖（Requirements Coverage）

| 需求 ID | 来源计划 | 描述 | 状态 | 证据 |
|---------|----------|------|------|------|
| DL-01 | 02-01, 02-02 | 通过 requestUrl 下载 HTTP/HTTPS 远程图片 | ✓ SATISFIED | `fetchWithTimeout` 调用 `requestUrl`；`processOneRef` 处理 http/wiki 类型 |
| DL-02 | 02-01, 02-02 | 图片保存到用户配置的 Obsidian attachment 文件夹 | ✓ SATISFIED | `saveToVault` 使用 `getAvailablePathForAttachment` 遵从 vault 附件设置 |
| DL-03 | 02-01, 02-02 | 自动处理重复文件名防止覆盖 | ✓ SATISFIED | `getAvailablePathForAttachment` API 原生处理重名冲突（Obsidian 内置） |
| ERR-01 | 02-01, 02-02 | 单图失败不阻塞其他图片；原始引用保留 | ✓ SATISFIED | `downloadOneWithRetry` always resolves；`Promise.allSettled` 隔离每批次 |
| ERR-02 | 02-01, 02-02 | 处理网络异常（超时、404、重定向后非图片响应） | ✓ SATISFIED | timeout via Promise.race(30s)；status 检查；Content-Type 白名单（image/* 或 application/octet-stream） |

**所有 5 个需求 ID 均已满足，无孤立需求（orphaned requirements）。**

---

### 必要制品验证（Required Artifacts）

| 制品 | 预期 | 状态 | 详情 |
|------|------|------|------|
| `src/downloader.ts` | 完整下载模块：类型、辅助函数、网络层、vault 存储、编排函数 | ✓ VERIFIED | 257 行（要求 >= 150），导出 DownloadResult、downloadImages、MIME_TO_EXT 及 4 个纯辅助函数 |
| `src/main.ts` | 插件接线 — editorCallback 调用 downloadImages 并记录结果 | ✓ VERIFIED | 导入 downloadImages，传递 refs/this.app/notePath，统计 ok/failed，保留 Phase 3 注释标记 |
| `tests/downloader.test.ts` | 下载器纯辅助函数单元测试 | ✓ VERIFIED | 173 行（要求 >= 120），5 个 describe 块，34 个测试用例（要求 >= 25）|

---

### 关键链路验证（Key Link Verification）

| 来源 | 目标 | 通过 | 状态 | 详情 |
|------|------|------|------|------|
| `src/downloader.ts` | `src/parser.ts` | `import { ImageRef }` | ✓ WIRED | downloader.ts L2: `import { ImageRef } from './parser'` |
| `src/main.ts` | `src/downloader.ts` | `import { downloadImages }` | ✓ WIRED | main.ts L4: `import {downloadImages} from "./downloader"` |
| `src/downloader.ts` | `obsidian` | `requestUrl, normalizePath, Platform` | ✓ WIRED | downloader.ts L1: `import { App, requestUrl, normalizePath, Platform } from 'obsidian'` |
| `tests/downloader.test.ts` | `src/downloader.ts` | import pure helpers | ✓ WIRED | test L2-8: imports all 5 exported testable symbols from `'../src/downloader'` |

---

### 数据流追踪（Data-Flow Trace Level 4）

`src/main.ts` 是渲染动态数据的消费方，向下追踪：

| 制品 | 数据变量 | 数据来源 | 产生真实数据 | 状态 |
|------|----------|----------|--------------|------|
| `src/main.ts` | `results` (DownloadResult[]) | `downloadImages(refs, this.app, notePath)` | 是 — `downloadImages` 从 `requestUrl` 获取真实 arrayBuffer 并写入 vault | ✓ FLOWING |
| `src/downloader.ts` | `buffer` (ArrayBuffer) | `requestUrl({url, method:'GET'}).arrayBuffer` | 是 — 真实网络响应（非静态） | ✓ FLOWING |
| `src/downloader.ts` | `localPath` (string) | `saveToVault` → `vault.createBinary` | 是 — 真实 vault 写入路径 | ✓ FLOWING |

---

### 行为抽查（Behavioral Spot-Checks）

| 行为 | 命令 | 结果 | 状态 |
|------|------|------|------|
| 所有 62 个测试（parser + downloader）通过 | `npx vitest run` | 62/62 passed，Duration 303ms | ✓ PASS |
| TypeScript 编译无错误 | `npx tsc --noEmit --skipLibCheck` | 退出码 0，无输出 | ✓ PASS |
| esbuild bundle 构建成功 | `npm run build` | 正常完成，产出 main.js | ✓ PASS |
| 实际 Obsidian 运行时中下载真实图片 | 需要 Obsidian 运行时 | — | ? SKIP（需人工验证）|

---

### 反模式扫描（Anti-Patterns）

| 文件 | 行 | 模式 | 严重性 | 影响 |
|------|----|------|--------|------|
| `src/downloader.ts` | L146 注释 | `adapter.writeBinary` 出现在注释中（非代码调用） | ℹ️ Info | 仅为 JSDoc 警告注释，实际使用 `vault.createBinary`（正确） |

无阻塞性反模式。无 `fetch(` 裸调用、无 `Buffer.from`、无 `require(`、无 `adapter.writeBinary` 实际调用、无 TODO/FIXME 占位符。

---

### 需要人工验证的事项（Human Verification Required）

以下行为无法通过程序化方式验证，需要在真实 Obsidian 环境中测试：

#### 1. HTTP 图片下载端到端测试

**测试步骤：** 在 Obsidian 中打开含有远程图片（如 `![alt](https://example.com/image.png)`）的 Markdown 文件，执行 "Download images in current note" 命令
**预期结果：** 图片文件出现在 vault 的 attachment 文件夹中；控制台输出 `[download-image] Done: 1 downloaded, 0 failed`
**需要人工原因：** `requestUrl` 和 `vault.createBinary` 需要真实 Obsidian 运行时，节点环境无法模拟

#### 2. 重复文件名不覆盖已有文件

**测试步骤：** 对同一含有远程图片的文档执行命令两次
**预期结果：** vault 中存在两个不同名称的文件（例如 `photo.png` 和 `photo 1.png`），均内容完整
**需要人工原因：** `getAvailablePathForAttachment` 的去重行为需要真实 Obsidian FileManager 上下文

#### 3. 单图失败不影响其余图片

**测试步骤：** 文档中包含一个无效 URL（如 404）和多个有效 URL，执行命令
**预期结果：** 有效图片正常保存；控制台打印失败 URL 的 `[download-image] Skipped ...` warning；整体无异常
**需要人工原因：** 真实网络错误场景需要 Obsidian 运行时

#### 4. 移动端 15MB 体积限制

**测试步骤：** 在 Obsidian Mobile 上，文档中含有 >15MB 的图片 URL，执行命令
**预期结果：** 该图片被跳过（控制台打印 size exceeded 警告），其余正常图片仍正常下载
**需要人工原因：** `Platform.isMobile` 仅在真实移动端为 `true`

---

## 总体状态

**状态：human_needed**（自动化检查全部通过，等待 Obsidian 运行时人工验证）

所有 11 个 must-haves 均已验证，5 个需求 ID（DL-01、DL-02、DL-03、ERR-01、ERR-02）均已满足。代码实现完整、连线正确、数据流动真实，无占位符或存根。

人工验证项目均为端到端场景（真实网络 + 真实 vault），无法在节点测试环境中替代。

---

_验证时间：2026-04-09T17:14:08Z_
_验证人：Claude（gsd-verifier）_
