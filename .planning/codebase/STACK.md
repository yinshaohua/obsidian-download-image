# Technology Stack

**Analysis Date:** 2026-04-09

## Primary

- **TypeScript** ^5.8.3 - Core plugin implementation language
- **JavaScript** (CommonJS/ESM) - Build output and configuration scripts

## Runtime

**Environment:**
- Node.js 16+ (required per README)
- Obsidian v0.15.0+ (minimum app version)

**Package Manager:**
- npm (bundled with Node.js)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- **Obsidian API** (latest) - Obsidian plugin framework providing App, Plugin, Modal, Editor, MarkdownView, Notice, PluginSettingTab, Setting classes

**Build:**
- **esbuild** 0.25.5 - Bundler/transpiler for TypeScript → JavaScript
- **TypeScript Compiler (tsc)** ^5.8.3 - Type checking and transpilation

**Development:**
- **Node.js built-in modules** - fs, path, module utilities used in build scripts

## Linting & Code Quality

**Linting:**
- **ESLint** 9.30.1 (@eslint/js) - JavaScript/TypeScript linting
- **TypeScript ESLint** 8.35.1 (typescript-eslint) - Type-aware linting rules
- **ESLint Plugin Obsidian** (eslint-plugin-obsidianmd) 0.1.9 - Obsidian-specific linting rules
- **Globals** 14.0.0 - Global variable definitions for ESLint

## Key Dependencies

**Critical:**
- `obsidian` (latest) - Primary dependency providing complete Obsidian plugin API

**Build/Development:**
- `esbuild` 0.25.5 - Efficient bundler with tree-shaking support, output target: es2018
- `typescript` ^5.8.3 - Full TypeScript compiler with strict mode enabled
- `tslib` 2.4.0 - TypeScript helper library for compiled output
- `@types/node` ^16.11.6 - Node.js type definitions for build scripts

**ESLint & Code Quality:**
- `typescript-eslint` 8.35.1 - Parser and rules for TypeScript
- `eslint-plugin-obsidianmd` 0.1.9 - Obsidian plugin development rules
- `@eslint/js` 9.30.1 - ESLint core JavaScript rules
- `globals` 14.0.0 - Browser and global variable definitions

**Build/Scripting:**
- `jiti` 2.6.1 - Runtime loader for .mts/.mjs files

## Configuration

**TypeScript:**
- `tsconfig.json` - Strict compiler options:
  - `module`: ESNext
  - `target`: ES6
  - `baseUrl`: src
  - `strictNullChecks`: true
  - `noImplicitAny`: true
  - `noImplicitReturns`: true
  - `strictBindCallApply`: true
  - `noUncheckedIndexedAccess`: true
  - `isolatedModules`: true
  - `useUnknownCatchVariables`: true
  - lib: DOM, ES5, ES6, ES7

**Build:**
- `esbuild.config.mjs` - Bundling configuration:
  - Entry point: `src/main.ts`
  - Output: `main.js` (CommonJS format)
  - Target: ES2018
  - Source maps: inline (dev), disabled (production)
  - External modules: obsidian, electron, @codemirror/*, @lezer/*, Node.js built-ins
  - Tree-shaking: enabled
  - Minification: enabled in production

**Linting:**
- `eslint.config.mts` - Flat config using @typescript-eslint/eslint-plugin
  - Parser: typescript-eslint with projectService
  - Plugins: obsidianmd (recommended config)
  - Global ignores: node_modules, dist, build artifacts

**Plugin Metadata:**
- `manifest.json` - Plugin manifest:
  - id: "sample-plugin"
  - version: 1.0.0
  - minAppVersion: 0.15.0
  - isDesktopOnly: false
  - Funding: obsidian.md/pricing

**Version Management:**
- `versions.json` - Maps plugin versions to minimum Obsidian versions
- `version-bump.mjs` - Automated version bump script for package.json, manifest.json, versions.json

## Scripts

**Available npm scripts:**
- `npm run dev` - Start watch mode compilation (node esbuild.config.mjs)
- `npm run build` - Build for production (tsc type check + esbuild production)
- `npm run lint` - Run ESLint validation
- `npm version [patch|minor|major]` - Bump version and update manifest

## Platform Requirements

**Development:**
- Node.js 16+
- npm (or yarn)
- Git for version control
- VS Code or compatible TypeScript-aware editor recommended

**Production:**
- Obsidian application (v0.15.0 or later)
- Plugin installed in `.obsidian/plugins/plugin-id/` directory
- Deployed as: `main.js`, `manifest.json`, `styles.css` (optional)

## Output Artifacts

**Distribution:**
- `main.js` - Bundled, minified CommonJS plugin code (entry point loaded by Obsidian)
- `manifest.json` - Plugin metadata and versioning
- `styles.css` - Optional plugin-specific styles (not present in sample)

---

*Stack analysis: 2026-04-09*
