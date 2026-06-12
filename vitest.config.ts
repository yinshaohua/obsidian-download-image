import path from 'path';
import { EXTERNAL_MODE, EXTERNAL_NODE_MODULES, EXTERNAL_ROOT } from './scripts/with-external-node-modules.mjs';

export default {
  ...(EXTERNAL_MODE ? { cacheDir: `${EXTERNAL_ROOT}/.vite-cache` } : {}),
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, 'tests/__mocks__/obsidian.ts'),
    },
    conditions: ['node'],
    dedupe: ['obsidian'],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    deps: {
      ...(EXTERNAL_MODE ? { moduleDirectories: [EXTERNAL_NODE_MODULES] } : {}),
    },
  },
};
