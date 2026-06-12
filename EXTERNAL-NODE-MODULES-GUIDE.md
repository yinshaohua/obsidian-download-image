# External node_modules guide

This guide documents the reusable external `node_modules` setup used by this project. It is intended for maintainers who want to keep dependency folders out of synced project directories such as OneDrive, while still allowing the project to work as a normal local `node_modules` project by default.

## Behavior

The setup has two modes:

| Mode | How it is selected | Where dependencies live |
|---|---|---|
| Local mode | `EXTERNAL_NODE_MODULES` is not set | `./node_modules` in the project directory |
| External mode | `EXTERNAL_NODE_MODULES` points to a dependency directory | The directory named by `EXTERNAL_NODE_MODULES` |

Use the same install command in both modes:

```powershell
npm run deps:install
```

- In local mode, this behaves like `npm install`.
- In external mode, this installs with `npm --prefix <external-root>` and resolves tools from the external dependency directory.

Do not create a symlink or junction from the project directory back to the external dependency directory. The scripts resolve tools explicitly.

## PowerShell setup

Add a reusable `setenv` function to your PowerShell Profile, then run it from the project root before npm commands:

```powershell
setenv
```

A minimal Profile function is:

```powershell
function setenv {
  $ProjectRoot = Get-Location
  $ProjectName = Split-Path -Leaf $ProjectRoot
  $ExternalRoot = "C:/local_data/$ProjectName"
  $ExternalNodeModules = "$ExternalRoot/node_modules"
  $ExternalNodeBin = "$ExternalNodeModules/.bin"

  New-Item -ItemType Directory -Force -Path $ExternalRoot | Out-Null

  $ManifestFiles = @('package.json', 'package-lock.json', '.npmrc')
  foreach ($FileName in $ManifestFiles) {
    $Source = Join-Path $ProjectRoot $FileName
    if (Test-Path $Source) {
      Copy-Item -Path $Source -Destination (Join-Path $ExternalRoot $FileName) -Force
    }
  }

  $env:EXTERNAL_NODE_MODULES = $ExternalNodeModules
  $env:NODE_PATH = $ExternalNodeModules

  $ExistingPathEntries = $env:PATH -split ';' | Where-Object {
    $_ -and ($_.TrimEnd('\/') -ine $ExternalNodeBin.TrimEnd('\/'))
  }
  $env:PATH = (@($ExternalNodeBin) + $ExistingPathEntries) -join ';'
}
```

The function sets:

```powershell
$env:EXTERNAL_NODE_MODULES = "C:/local_data/<project-folder>/node_modules"
$env:NODE_PATH = $env:EXTERNAL_NODE_MODULES
$env:PATH = "<external-node_modules>/.bin;..."
```

For this repository, the default external dependency path is:

```text
C:/local_data/obsidian-download-image/node_modules
```

## Reusing in another project

Copy these files into another project:

```text
scripts/with-external-node-modules.mjs
scripts/external-npm.mjs
scripts/run-tool.mjs
scripts/eslint-loader.mjs
```

Then add the `setenv` function to your PowerShell Profile once and reuse it across projects.

## package.json scripts

Use a wrapper for dependency installation and tool execution:

```json
{
  "scripts": {
    "deps:install": "node scripts/external-npm.mjs install",
    "deps:clean": "node scripts/external-npm.mjs exec -- rimraf node_modules",
    "build": "node scripts/run-tool.mjs tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "lint": "node --import ./scripts/eslint-loader.mjs scripts/run-tool.mjs eslint .",
    "test": "node scripts/run-tool.mjs vitest run"
  }
}
```

## esbuild

Load esbuild through the wrapper so the build works in both modes:

```js
import {
  EXTERNAL_MODE,
  EXTERNAL_NODE_MODULES,
  createToolEnv,
  ensureToolNodeModules,
  requireTool,
} from './scripts/with-external-node-modules.mjs';

ensureToolNodeModules();
process.env = createToolEnv();

const esbuild = requireTool('esbuild');
```

When bundling, pass external node paths only in external mode:

```js
...(EXTERNAL_MODE ? { nodePaths: [EXTERNAL_NODE_MODULES] } : {}),
```

## TypeScript, ESLint, and Vitest

- `scripts/run-tool.mjs` resolves `tsc`, `eslint`, and `vitest` from the configured dependency directory.
- In external mode, it writes `.tsconfig.external-node-modules.json` so TypeScript and ESLint can resolve external packages and types.
- `vitest.config.ts` adds `deps.moduleDirectories` in external mode so test dependencies resolve from the external directory.

`.tsconfig.external-node-modules.json` is generated and should stay ignored by Git.
