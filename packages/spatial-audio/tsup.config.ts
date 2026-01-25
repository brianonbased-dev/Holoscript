import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    context: 'src/context/index.ts',
    hrtf: 'src/hrtf/index.ts',
    room: 'src/room/index.ts',
    emitter: 'src/emitter/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
});
