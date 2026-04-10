# Phase 5: Settings Extension - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 05-settings-extension
**Areas discussed:** Permanent delete warning UX, Folder exclusion input method, Settings section layout, Exclusion path format

---

## Permanent Delete Warning UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline warning text | Dynamic warning text below dropdown when "Permanent delete" selected | ✓ |
| Confirmation toggle | Extra toggle switch that must be enabled for permanent delete to take effect | |
| Modal dialog | Confirmation dialog pops up when switching to permanent delete | |

**User's choice:** Inline warning text (recommended)
**Notes:** Simplest approach, consistent with Obsidian native settings style. Success criteria requires "visible warning".

---

## Dropdown Option Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Move to .trash / Permanent delete | Direct and clear, matches ROADMAP success criteria wording | ✓ |
| Move to Obsidian trash / Delete permanently | More explicit about Obsidian's .trash folder vs system trash | |
| Claude decides | Leave wording details to implementation | |

**User's choice:** "Move to .trash" / "Permanent delete"
**Notes:** Matches ROADMAP success criteria language exactly.

---

## Folder Exclusion Input Method

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-line textarea | One path per line, parsed by newline split + trim | ✓ |
| Comma-separated text | Single-line text field, comma-separated paths | |
| Add/remove list | Interactive list with add/remove buttons per entry | |

**User's choice:** Multi-line textarea (recommended)
**Notes:** Clean and readable. Obsidian Setting API supports `addTextArea`. Scanner already accepts `string[]`.

---

## Settings Section Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by function | Two sections with h2 headings: "Download" and "Cleanup" | ✓ |
| Flat list | All 4 settings in one unsectioned list | |

**User's choice:** Grouped by function (recommended)
**Notes:** Standard Obsidian pattern using `containerEl.createEl('h2')`. Keeps settings organized as they grow.

---

## Exclusion Path Format

| Option | Description | Selected |
|--------|-------------|----------|
| Exact prefix match | Relative vault paths, prefix match via startsWith | ✓ |
| Glob patterns | Support * and ** wildcards | |
| Regular expressions | Full regex matching | |

**User's choice:** Exact prefix match (recommended)
**Notes:** Zero extra work — matches scanner.ts existing `startsWith` logic exactly.

---

## Placeholder/Description Text

| Option | Description | Selected |
|--------|-------------|----------|
| Claude decides | Implementation determines exact wording | ✓ |
| User specifies | User provides exact text | |

**User's choice:** Claude decides
**Notes:** Only requirement is clarity.

---

*Phase: 05-settings-extension*
*Discussion completed: 2026-04-11*
