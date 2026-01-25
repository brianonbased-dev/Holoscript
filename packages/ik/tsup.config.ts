import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    solvers: 'src/solvers/index.ts',
    constraints: 'src/constraints/index.ts',
    fullbody: 'src/fullbody/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
});
