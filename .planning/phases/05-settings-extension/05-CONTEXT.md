# Phase 5: Settings Extension - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Add cleanup method setting (move to .trash vs. permanent delete) and folder exclusion list to the existing settings interface and tab UI. Users can configure their preferred cleanup method and protect specific folders from the orphan scan before ever running a cleanup.

</domain>

<decisions>
## Implementation Decisions

### Cleanup method setting
- **D-01:** Dropdown with two options: "Move to .trash" (default) and "Permanent delete"
- **D-02:** When "Permanent delete" is selected, an inline warning text appears dynamically below the dropdown (e.g., "Files will be permanently deleted and cannot be recovered")
- **D-03:** "Move to .trash" is the default — permanent delete requires explicit selection
- **D-04:** Warning is inline text only, not a modal or toggle — simplest approach, consistent with Obsidian native settings style

### Folder exclusion input
- **D-05:** Multi-line textarea control (one folder path per line), parsed by splitting on newline + trim + filter empty
- **D-06:** Stored as `string[]` in settings, passed directly to `scanOrphanedAttachments(app, exclusions)` which already accepts this parameter
- **D-07:** Exact prefix matching — matches scanner.ts existing `startsWith` logic (no glob/regex support)

### Settings page layout
- **D-08:** Settings page divided into two sections with h2 headings: "Download" (existing settings) and "Cleanup" (new settings)
- **D-09:** Created via `containerEl.createEl('h2', { text: '...' })` — standard Obsidian settings pattern

### Claude's Discretion
- Textarea placeholder text and description wording
- Warning text exact wording and styling (CSS class)
- Section heading exact text (e.g., "Download" vs "Download Settings")
- Description text for each setting control

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Obsidian plugin settings approaches.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Success Criteria
- `.planning/REQUIREMENTS.md` — SET-01 (cleanup method), SET-02 (folder exclusions) requirement definitions
- `.planning/ROADMAP.md` §Phase 5 — Success criteria: dropdown with warning, text field with exclusion effect

### Architecture Constraints
- `.planning/STATE.md` §Architecture Flags — "Permanent delete must never be the default", "NEVER offer system trash (vault.trash(file, true))"

### Existing Settings Implementation
- `src/settings.ts` — Current `DownloadImageSettings` interface, `DEFAULT_SETTINGS`, `DownloadImageSettingTab` class with dropdown/slider patterns
- `src/main.ts` — Settings load/save pattern (`loadSettings`/`saveSettings`), settings usage in commands

### Scanner Integration
- `src/scanner.ts` — `scanOrphanedAttachments(app, exclusions)` already accepts `string[]` exclusions with `startsWith` prefix matching (lines 144-147)

### Prior Phase Context
- `.planning/phases/03-document-update-settings/03-CONTEXT.md` — Phase 3 settings decisions (D-13 through D-16): naming strategy and concurrency patterns
- `.planning/phases/04-reference-scanner/04-CONTEXT.md` — Phase 4 D-04: scanner accepts exclusion list parameter for Phase 5

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DownloadImageSettings` interface in `src/settings.ts`: Extend with `cleanupMethod` and `excludedFolders` fields
- `DEFAULT_SETTINGS` constant: Add safe defaults (`cleanupMethod: 'trash'`, `excludedFolders: []`)
- `DownloadImageSettingTab.display()` pattern: `new Setting(containerEl).setName().setDesc().addDropdown/addSlider()` — same pattern for new controls

### Established Patterns
- Settings pattern: interface + DEFAULT_SETTINGS + PluginSettingTab with `onChange → update settings → saveSettings()`
- `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` in `loadSettings()` — handles migration for new fields automatically
- Obsidian `Setting` API: `addDropdown()`, `addTextArea()`, `addSlider()` — all available

### Integration Points
- `src/settings.ts` — Only file modified in this phase (interface + defaults + UI)
- `src/scanner.ts:scanOrphanedAttachments()` — Already has `exclusions` param; Phase 7 passes `settings.excludedFolders` here
- `src/main.ts` — Phase 7 will read `this.settings.cleanupMethod` to decide trash vs delete

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-settings-extension*
*Context gathered: 2026-04-11*
