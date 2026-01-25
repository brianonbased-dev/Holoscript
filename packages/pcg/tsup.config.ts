import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    noise: 'src/noise/index.ts',
    terrain: 'src/terrain/index.ts',
    dungeon: 'src/dungeon/index.ts',
    lsystem: 'src/lsystem/index.ts',
    wfc: 'src/wfc/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
});
