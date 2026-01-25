import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    haptics: 'src/haptics/index.ts',
    screenreader: 'src/screenreader/index.ts',
    motor: 'src/motor/index.ts',
    vision: 'src/vision/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['three', '@holoscript/core'],
});
