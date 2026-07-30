// Flat config (ESLint 9+). Substitui o antigo .eslintrc.json, que o ESLint 10
// não lê mais — com ele no lugar, `npm run lint` falhava sem checar nada.
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'frontend/**', 'prisma/migrations/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    // Formatação (semi, aspas, indentação) é responsabilidade do Prettier —
    // ver .prettierrc.json. Repetir essas regras aqui só faz as duas ferramentas
    // brigarem pelo mesmo arquivo. Aqui ficam apenas regras de qualidade.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Desligada de propósito. A camada de serviço devolve tipos que o Prisma
      // gera a partir de cada include/select; anotá-los à mão significa copiar
      // estruturas aninhadas que mudam junto com o schema. A inferência do TS
      // é exata aqui e não sai de sincronia — a anotação sairia.
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        // `catch (error)` sem usar a variável é intencional em vários pontos.
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // Seeds e scripts operacionais falam com o operador pelo terminal.
    files: ['prisma/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  }
);
