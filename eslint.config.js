import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	// Base JS recommended rules
	js.configs.recommended,

	// TypeScript files
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte']
			},
			globals: { ...globals.browser, ...globals.node }
		},
		plugins: { '@typescript-eslint': ts },
		rules: {
			...ts.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},

	// Svelte files — use the flat configs exported by the plugin
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte']
			},
			globals: { ...globals.browser }
		},
		plugins: { '@typescript-eslint': ts },
		rules: {
			...ts.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'error',
			// Svelte 5 runes ($state, $derived, etc.) are compiler-injected globals
			'no-undef': 'off',
			// Only relevant for goto()-based navigation, not plain external <a> tags
			'svelte/no-navigation-without-resolve': 'off'
		}
	},

	// Ignore generated/build files
	{
		ignores: [
			'build/**',
			'.svelte-kit/**',
			'node_modules/**',
			'scripts/**'
		]
	}
];
