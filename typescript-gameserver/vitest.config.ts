import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Using 'node' environment as node_modules is managed by npm
  },
});
