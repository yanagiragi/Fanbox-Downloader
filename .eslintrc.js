module.exports = {
	'env': {
		'browser': true,
		'commonjs': true,
		'es2021': true
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'ecmaVersion': 12
	},
	'rules': {
		'no-trailing-spaces': 'error',
		'indent': ['error', 'tab', {'SwitchCase': 1}],
		'no-tabs': 0,
		'quotes': ['error', 'single'],
		'semi': ['error', 'never'],
		'no-unused-vars': 'off'
	}
}
