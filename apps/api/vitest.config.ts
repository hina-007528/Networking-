import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // NestJS relies on emitted decorator metadata, which esbuild cannot produce.
    swc.vite({ module: { type: 'es6' } }),
  ],
  resolve: {
    alias: {
      '@stormfiber/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@stormfiber/validation': resolve(__dirname, '../../packages/validation/src/index.ts'),
      '@stormfiber/config': resolve(__dirname, '../../packages/config/src/index.ts'),
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.module.ts', 'src/main.ts', 'src/worker.ts'],
    },
  },
});
