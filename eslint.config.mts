import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	globalIgnores([
		"node_modules",
		"dist",
		"main.js",
		"package-lock.json",
		"versions.json",
		"tmp-*.cjs",
		"tests/**",
		"vitest.config.ts",
		"esbuild.config.mjs",
		"version-bump.mjs",
	]),
	{
		files: ["src/**/*.ts"],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			obsidianmd,
		},
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
		rules: {
			"no-console": ["error", { allow: ["warn", "error", "debug", "log"] }],
			"obsidianmd/validate-manifest": "error",
			"obsidianmd/no-sample-code": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/commands/no-command-in-command-id": "error",
			"obsidianmd/commands/no-command-in-command-name": "error",
			"obsidianmd/commands/no-default-hotkeys": "error",
			"obsidianmd/no-plugin-as-component": "error",
			"obsidianmd/no-view-references-in-plugin": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/platform": "error",
			"obsidianmd/regex-lookbehind": "error",
			"obsidianmd/hardcoded-config-path": "error",
			"obsidianmd/no-forbidden-elements": "error",
			"obsidianmd/no-tfile-tfolder-cast": "error",
			"obsidianmd/vault/iterate": "error",
			"obsidianmd/object-assign": "off",
			"obsidianmd/prefer-file-manager-trash-file": "off",
			"obsidianmd/no-static-styles-assignment": "off",
			"obsidianmd/settings-tab/no-manual-html-headings": "off",
			"obsidianmd/ui/sentence-case": "off",
			"obsidianmd/commands/no-plugin-id-in-command-id": "off",
			"obsidianmd/commands/no-plugin-name-in-command-name": "off",
		},
	},
	{
		files: ["scripts/**/*.mjs", "eslint.config.mts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'scripts/verify-release.mjs',
					],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"no-useless-escape": "error",
		},
	},
);
