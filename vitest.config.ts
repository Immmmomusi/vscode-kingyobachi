import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/webview/**/*.test.ts', 'jsdom'],
      ['tests/extension/**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/shared/index.ts'],
    },
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'tests/test-utils/mock-vscode.ts'),
    },
  },
});
