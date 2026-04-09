# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- PascalCase with `.ts` extension for TypeScript source files
- Lowercase descriptive names: `main.ts`, `settings.ts`

**Classes:**
- PascalCase: `MyPlugin`, `SampleModal`, `SampleSettingTab`
- Classes extend from Obsidian framework classes (Plugin, Modal, PluginSettingTab)

**Functions:**
- camelCase for regular functions and methods
- Constructor parameters use camelCase
- Callback parameters use camelCase: `editorCallback`, `checkCallback`

**Variables:**
- camelCase for all variable declarations
- Destructuring used for DOM element access: `let {contentEl} = this`
- Object property access destructured: `const {containerEl} = this`

**Types/Interfaces:**
- PascalCase: `MyPluginSettings`
- Interfaces defined with `interface` keyword
- Export interface pattern: `export interface MyPluginSettings`

**Constants:**
- UPPER_SNAKE_CASE for exported constants: `DEFAULT_SETTINGS`

## Code Style

**Formatting:**
- Tab indentation (indent_size: 4, tab_width: 4)
- UTF-8 charset
- LF line endings
- Insert final newline in all files
- Configured in `.editorconfig`

**Linting:**
- ESLint with TypeScript support via `typescript-eslint` 8.35.1
- Config: `eslint.config.mts` (ESM module format)
- Obsidian-specific rules via `eslint-plugin-obsidianmd` 0.1.9
- Uses recommended config: `obsidianmd.configs.recommended`
- Run: `npm run lint`

**TypeScript Configuration:**
- Target: ES6
- Module: ESNext
- Very strict settings enforced:
  - `noImplicitAny: true`
  - `noImplicitThis: true`
  - `noImplicitReturns: true`
  - `strictNullChecks: true`
  - `strictBindCallApply: true`
  - `noUncheckedIndexedAccess: true`
  - `useUnknownInCatchVariables: true`

## Import Organization

**Order:**
1. Framework imports from `obsidian` package
2. Local imports with relative paths
3. Named imports vs default imports follow framework conventions

**Examples from codebase:**
```typescript
import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
```

**Path Aliases:**
- `baseUrl: "src"` configured in `tsconfig.json` allows importing from src as base
- Relative imports used: `from "./settings"`

## Error Handling

**Patterns:**
- No explicit try-catch blocks in current codebase
- Uses framework-provided error notification: `new Notice(message)`
- Plugin lifecycle methods (`onload`, `onunload`) handle initialization and cleanup
- Settings persistence uses `await this.loadData()` and `await this.saveData()` with implicit error handling via framework

## Logging

**Framework:** `console` object (browser console)

**Patterns:**
- Minimal logging in current code
- Single usage: `console.log('setInterval')` in interval registration
- No structured logging framework used
- Plugin uses Obsidian's `Notice` class for user-facing messages instead of console logs

## Comments

**When to Comment:**
- Comments present for complex command registration logic explaining behavior
- Comments explain _why_ operations exist, not what they do
- Example: `// This adds an editor command that can perform some operation on the current editor instance`
- Comments for non-obvious framework patterns

**JSDoc/TSDoc:**
- Not actively used in current codebase
- Framework types provide sufficient documentation

## Function Design

**Size:** 
- Methods are concise, typically 5-15 lines
- Callbacks inline when simple (1-2 lines)
- Complex logic moved to named callbacks with descriptive names

**Parameters:** 
- Functions accept typed parameters from framework (e.g., `editor: Editor, view: MarkdownView`)
- No parameter destructuring in function signatures
- Callbacks use arrow functions with typed parameters

**Return Values:** 
- Methods return typed values: `void` for side-effect operations, `boolean` for check functions
- Async methods properly typed with `Promise<T>`
- Examples: `onload()` returns `Promise<void>`, `checkCallback` returns `boolean`

## Module Design

**Exports:**
- Default export pattern: `export default class MyPlugin`
- Named exports for utilities: `export interface MyPluginSettings`, `export const DEFAULT_SETTINGS`
- Settings module exports both interface and implementation

**Barrel Files:**
- Not used in current codebase (single-file modules)
- Imports are direct: `from "./settings"`

## Plugin Architecture Conventions

**Lifecycle Pattern:**
- Extends `Plugin` base class
- Implements `onload()` for initialization
- Implements `onunload()` for cleanup (can be empty)
- Settings management through dedicated settings module

**Settings Pattern:**
- Interface definition in separate module: `src/settings.ts`
- Constants for defaults: `DEFAULT_SETTINGS`
- Settings tab class extends `PluginSettingTab`
- Async persistence: `await this.saveSettings()`

---

*Convention analysis: 2026-04-09*
