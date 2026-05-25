import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    env: {
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/drevlo_test?schema=public',
    },
  },
});
