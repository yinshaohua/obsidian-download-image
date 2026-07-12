# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — 项目必须具备提交到 Obsidian 社区插件库所需的元数据、文档、发布资产与提交流程材料。

- Class: functional
- Status: validated
- Description: 项目必须具备提交到 Obsidian 社区插件库所需的元数据、文档、发布资产与提交流程材料。
- Why it matters: 当前插件虽已在 GitHub，但仓库元数据和发布材料仍有 sample 痕迹，无法稳妥通过社区插件审核。
- Source: user-request
- Primary owning slice: release
- Validation: Slice S01 aligned package.json and README.md to the real Download Image plugin, verified manifest.json and versions.json consistency, and passed `npm test && npm run build` plus a cross-file submission-contract audit covering plugin identity, version mapping, install path, and release-tag guidance.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | functional | validated | release | none | Slice S01 aligned package.json and README.md to the real Download Image plugin, verified manifest.json and versions.json consistency, and passed `npm test && npm run build` plus a cross-file submission-contract audit covering plugin identity, version mapping, install path, and release-tag guidance. |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 1 (R001)
- Unmapped active requirements: 0
