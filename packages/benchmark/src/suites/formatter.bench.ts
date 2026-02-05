/**
 * Formatter Benchmarks
 * 
 * Measures code formatting performance
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Bench } from 'tinybench';
import { HoloScriptFormatter, DEFAULT_CONFIG } from '@holoscript/formatter';

const __dirname = new URL('.', import.meta.url).pathname;

// Load fixtures
const smallSource = readFileSync(resolve(__dirname, '../fixtures/small.hsplus'), 'utf-8');
const mediumSource = readFileSync(resolve(__dirname, '../fixtures/medium.hsplus'), 'utf-8');
const largeSource = readFileSync(resolve(__dirname, '../fixtures/large.hsplus'), 'utf-8');

const bench = new Bench({ name: 'Formatter Benchmarks', time: 1000 });

const formatter = new HoloScriptFormatter(DEFAULT_CONFIG);

bench
  .add('format-small', () => {
    formatter.format(smallSource, 'hsplus');
  })
  .add('format-medium', () => {
    formatter.format(mediumSource, 'hsplus');
  })
  .add('format-large', () => {
    formatter.format(largeSource, 'hsplus');
  })
  .add('format-range-small', () => {
    formatter.formatRange(smallSource, { startLine: 0, endLine: 10 }, 'hsplus');
  })
  .add('format-range-medium', () => {
    formatter.formatRange(mediumSource, { startLine: 10, endLine: 50 }, 'hsplus');
  });

export async function runFormatterBench() {
  await bench.run();
  return bench;
}
