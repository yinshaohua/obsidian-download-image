# Agent instructions

- This is an Obsidian community plugin built with TypeScript, npm, and esbuild.
- Keep source code in `src/`; keep `src/main.ts` focused on plugin lifecycle and command registration.
- Do not commit generated artifacts such as `node_modules/` or `main.js` unless explicitly requested for a release workflow.
- Use the project npm scripts, especially `npm run deps:install` instead of bare `npm install`.
- If `EXTERNAL_NODE_MODULES` is set, dependencies are managed through the external dependency wrapper described in `README.md` and `EXTERNAL-NODE-MODULES-GUIDE.md`.
- Register Obsidian events, DOM events, and intervals through plugin cleanup helpers so unload remains safe.
- Preserve privacy: avoid unnecessary network requests, telemetry, remote code execution, or access outside the vault.
- Keep `.planning/` project artifacts under version control; keep transient GSD runtime state in `.gsd/` ignored.
- Verify relevant changes with targeted tests or builds before claiming completion.
