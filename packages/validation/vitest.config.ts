import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@stormfiber/types': resolve(__dirname, '../types/src/index.ts'),
      '@stormfiber/config': resolve(__dirname, '../config/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
