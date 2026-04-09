# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Plugin Architecture (Obsidian Plugin Framework)

**Key Characteristics:**
- Single main plugin class (`MyPlugin`) extending the Obsidian `Plugin` base class
- Lifecycle-based initialization with `onload()` and `onunload()` hooks
- Separation of plugin logic (main.ts) from settings management (settings.ts)
- Settings persistence through Obsidian's data layer
- Command palette integration for user-triggered actions
- UI integration through ribbon icons, status bar, and modals

## Layers

**Plugin Core (`main.ts`):**
- Purpose: Main plugin implementation and Obsidian API integration
- Location: `src/main.ts`
- Contains: Plugin class, command registrations, event listeners, modal components
- Depends on: Obsidian framework (obsidian module), settings module
- Used by: Obsidian runtime

**Settings Layer (`settings.ts`):**
- Purpose: Configuration schema definition and settings UI
- Location: `src/settings.ts`
- Contains: Settings interface, default settings object, settings tab component
- Depends on: Obsidian framework (obsidian module), plugin core
- Used by: Main plugin for persistent configuration

## Data Flow

**Plugin Initialization:**

1. Obsidian runtime loads plugin and calls `MyPlugin.onload()`
2. `onload()` calls `this.loadSettings()` to hydrate settings from persisted storage
3. UI elements are registered: ribbon icon, status bar item, commands
4. Settings tab is registered for user configuration
5. Global event listeners and intervals are registered

**Settings Update Flow:**

1. User modifies setting in settings tab (via `SampleSettingTab.display()`)
2. `onChange` callback fires, updating `this.plugin.settings`
3. `this.plugin.saveSettings()` persists changes via `this.saveData()`
4. Settings are retained across plugin reload

**Command Execution:**

1. User invokes command from command palette
2. Command callback (`checkCallback` or `editorCallback`) is executed
3. Modal, notice, or editor operation is performed
4. Results are returned to user

**State Management:**
- Settings are stored in instance variable `MyPlugin.settings` (type `MyPluginSettings`)
- Defaults are merged with loaded data in `loadSettings()` using Object.assign
- Settings are persisted to Obsidian's plugin data store asynchronously
- No in-memory caching beyond the settings object itself

## Key Abstractions

**MyPlugin (Main Class):**
- Purpose: Encapsulates plugin behavior and Obsidian API integration
- Files: `src/main.ts`
- Pattern: Singleton extending `Plugin` base class
- Responsibilities: Command registration, event binding, settings management, lifecycle

**MyPluginSettings (Interface):**
- Purpose: Type-safe settings schema
- Files: `src/settings.ts`
- Pattern: Interface with defaults constant
- Usage: Settings inheritance through Object.assign pattern

**SampleSettingTab (Settings UI):**
- Purpose: UI for plugin configuration in Obsidian settings
- Files: `src/settings.ts`
- Pattern: Extends `PluginSettingTab` base class
- Contains: One text input setting bound to `MyPluginSettings.mySetting`

**SampleModal (User Interaction):**
- Purpose: Modal dialog triggered by user commands
- Files: `src/main.ts`
- Pattern: Extends `Modal` base class
- Lifecycle: `onOpen()` and `onClose()` hooks for content management

## Entry Points

**Plugin Entry Point:**
- Location: `src/main.ts` (class `MyPlugin`)
- Triggers: Obsidian runtime on plugin load
- Responsibilities: Initialize all UI elements, register commands, set up event listeners

**Settings Tab Entry Point:**
- Location: `src/settings.ts` (class `SampleSettingTab`)
- Triggers: User opens plugin settings in Obsidian preferences
- Responsibilities: Render setting controls and persist user changes

**Command Entry Points:**
- `open-modal-simple`: Opens modal without preconditions
- `replace-selected`: Operates on current editor selection
- `open-modal-complex`: Only available when markdown editor is active

## Error Handling

**Strategy:** Minimal explicit error handling in current implementation

**Patterns:**
- Obsidian API calls assume success (no try-catch wrapping)
- Settings load merges defaults with persisted data, ensuring no undefined values
- No null checks on app context (assumes valid app instance)
- Notice objects used for user feedback (blocking errors with UI notification)

## Cross-Cutting Concerns

**Logging:** Console.log used in interval (setInterval callback at 5-minute interval). No structured logging framework.

**Validation:** No input validation on settings values. Text input accepts any string.

**Authentication:** Not applicable - plugin operates within Obsidian user session context.

**Cleanup:** Event listeners and intervals automatically unregistered via Obsidian's `registerDomEvent()` and `registerInterval()` when plugin disabled.

---

*Architecture analysis: 2026-04-09*
