import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default ts.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/api/generated/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } }, plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules } },
);
