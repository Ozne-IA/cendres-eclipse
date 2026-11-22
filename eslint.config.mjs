import babelParser from '@babel/eslint-parser';
import strictConfig from './tsconfig.strict.json' with { type: 'json' };

export default [
  {
    files: strictConfig.files,
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: ['@babel/plugin-syntax-typescript'],
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-debugger': 'error',
      'no-fallthrough': 'error',
      'no-unreachable': 'error',
    },
  },
];
