# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
obsidian-download-image/
├── .github/              # GitHub workflows and CI configuration
├── .planning/            # GSD planning documents (generated)
├── src/                  # TypeScript source code
│   ├── main.ts           # Main plugin class and modal implementation
│   └── settings.ts       # Settings schema and settings UI tab
├── .editorconfig         # Editor configuration (indentation, charset)
├── .eslintrc*            # ESLint configuration (uses eslint.config.mts)
├── .gitignore            # Git ignore patterns
├── .npmrc                # NPM configuration
├── esbuild.config.mjs    # Build configuration (bundler)
├── eslint.config.mts     # ESLint rules (TypeScript)
├── manifest.json         # Obsidian plugin metadata
├── package.json          # Node dependencies and scripts
├── package-lock.json     # Lockfile (npm)
├── styles.css            # Plugin CSS (empty placeholder)
├── tsconfig.json         # TypeScript compiler configuration
├── version-bump.mjs      # Version update script
├── versions.json         # Historical plugin versions
└── README.md             # Plugin documentation
```

## Directory Purposes

**src/:**
- Purpose: All TypeScript source code for the plugin
- Contains: Plugin entry point, settings management
- Key files: `main.ts`, `settings.ts`

**.github/workflows/:**
- Purpose: CI/CD pipeline definitions
- Contains: Automated GitHub actions for linting

**.planning/codebase/:**
- Purpose: Generated architecture and analysis documents for GSD
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.
- Generated: Yes
- Committed: Not part of original repo

## Key File Locations

**Entry Points:**
- `src/main.ts`: Main plugin class extended from Obsidian Plugin base. Obsidian runtime loads this via manifest.json "main" field (compiled to main.js)
- `manifest.json`: Plugin metadata declaring plugin ID, name, version, and minimum Obsidian version

**Configuration:**
- `tsconfig.json`: TypeScript compiler settings with strict mode enabled, baseUrl set to "src"
- `eslint.config.mts`: ESLint rules using TypeScript ESLint and obsidianmd plugin
- `esbuild.config.mjs`: Build bundler configuration, bundles src/main.ts to main.js
- `package.json`: Dependencies (obsidian framework), dev dependencies (typescript, esbuild, eslint)

**Core Logic:**
- `src/main.ts`: Plugin initialization, command registration, UI element creation, event listeners
- `src/settings.ts`: Settings interface definition, default settings, settings UI component

**Testing:**
- No test files present in codebase

**Build Output:**
- `main.js`: Compiled and bundled plugin (generated, not committed)
- Generated from `src/main.ts` via esbuild with banner comment

## Naming Conventions

**Files:**
- PascalCase for class-based files: Not consistently applied (main.ts, settings.ts use lowercase)
- .ts extension for TypeScript files
- .mjs extension for Node build scripts (esbuild.config.mjs, version-bump.mjs)
- .mts extension for ESM TypeScript config (eslint.config.mts)

**Directories:**
- lowercase for source directories (src/)
- .hidden for configuration directories (.github/, .planning/)

**Functions & Methods:**
- camelCase for function names: `loadSettings()`, `saveSettings()`, `onload()`, `onunload()`
- camelCase for callback functions: `editorCallback`, `checkCallback`, `onChange`

**Types & Interfaces:**
- PascalCase for interfaces: `MyPluginSettings`
- PascalCase for classes: `MyPlugin`, `SampleModal`, `SampleSettingTab`

**Variables:**
- camelCase for instance variables: `settings`, `mySetting`, `contentEl`
- camelCase for local variables: `markdownView`, `statusBarItemEl`, `prod`

## Where to Add New Code

**New Feature:**
- Primary code: Add method to `MyPlugin` class in `src/main.ts`
- Register command in `onload()` method using `this.addCommand()`
- Add UI integration (ribbon icon, command, etc.) via Obsidian plugin API methods

**New Component/Modal:**
- Implementation: Create new class extending `Modal` in `src/main.ts` (or separate file if complex)
- Register opening in command callback in `MyPlugin.onload()`

**New Settings:**
- Schema: Add property to `MyPluginSettings` interface in `src/settings.ts`
- Default: Add to `DEFAULT_SETTINGS` object in `src/settings.ts`
- UI: Add new `Setting` in `SampleSettingTab.display()` method

**Utilities:**
- Shared helpers: Not currently separated. Keep in `src/main.ts` or create `src/utils.ts`

## Special Directories

**.obsidian/:**
- Purpose: Obsidian vault directory containing plugin settings (NOT in repo root)
- Plugin load location: `.obsidian/plugins/sample-plugin/`
- Generated: Yes (created by Obsidian)
- Committed: No

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by npm install)
- Committed: No (.gitignore excludes)

**dist/ (if created):**
- Purpose: Build output directory (referenced in eslint.config.mts globalIgnores)
- Generated: Yes (if using dist output)
- Committed: No

## Build & Compilation

**TypeScript Compilation:**
- Source: `src/**/*.ts`
- Target: ES6 / ESNext module
- Strict mode: Enabled
- Output: Compiled alongside bundling

**Bundling:**
- Tool: esbuild
- Input: `src/main.ts`
- Output: `main.js` (CJS format for Obsidian)
- External modules (not bundled): obsidian, electron, codemirror, lezer packages
- Minify: Yes for production, No for dev

**Commands:**
```bash
npm run dev      # Watch mode compilation with inline sourcemap
npm run build    # Production build with minification
npm run lint     # ESLint check
```

---

*Structure analysis: 2026-04-09*
