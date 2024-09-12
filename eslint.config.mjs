import functional from 'eslint-plugin-functional'
import prettier from 'eslint-config-prettier'
import tsParser from '@typescript-eslint/parser'
import js from '@eslint/js'

import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['**/node_modules', '**/dist', 'src/env.d.ts'],
	},
	js.configs.recommended,
	functional.configs.all,
	tseslint.configs.eslintRecommended,
	...tseslint.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {},
			parser: tsParser,
			ecmaVersion: 5,
			sourceType: 'script',

			parserOptions: {
				project: 'tsconfig.json',
			},
		},

		rules: {
			'functional/prefer-immutable-types': 'off',
			'functional/no-expression-statements': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],

		rules: {
			'functional/no-expression-statements': 'off',
			'functional/prefer-immutable-types': 'off',
			'functional/functional-parameters': 'off',
			'functional/no-return-void': 'off',
			'@typescript-eslint/prefer-readonly-parameter-types': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
]
