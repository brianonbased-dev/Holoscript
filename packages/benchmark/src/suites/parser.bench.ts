/**
 * Parser Benchmarks
 * 
 * Measures parsing speed for different file sizes
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Bench } from 'tinybench';
import { HoloScriptPlusParser, ChunkBasedIncrementalParser, globalParseCache } from '@holoscript/core';

const __dirname = new URL('.', import.meta.url).pathname;

// Load fixtures
const smallSource = readFileSync(resolve(__dirname, '../fixtures/small.hsplus'), 'utf-8');
const mediumSource = readFileSync(resolve(__dirname, '../fixtures/medium.hsplus'), 'utf-8');
const largeSource = readFileSync(resolve(__dirname, '../fixtures/large.hsplus'), 'utf-8');

const bench = new Bench({ name: 'Parser Benchmarks', time: 1000 });

// Full parse benchmarks
const parser = new HoloScriptPlusParser();

bench
  .add('parse-small (100 lines)', () => {
    parser.parse(smallSource);
  })
  .add('parse-medium (600 lines)', () => {
    parser.parse(mediumSource);
  })
  .add('parse-large (1200 lines)', () => {
    parser.parse(largeSource);
  });

// Incremental parse benchmarks
const incrementalParser = new ChunkBasedIncrementalParser(globalParseCache);

bench
  .add('incremental-small-single-edit', () => {
    const modified = smallSource.replace('color: "blue"', 'color: "red"');
    incrementalParser.parse(modified);
  })
  .add('incremental-medium-single-edit', () => {
    const modified = mediumSource.replace('color: "red"', 'color: "cyan"');
    incrementalParser.parse(modified);
  })
  .add('incremental-large-single-edit', () => {
    const modified = largeSource.replace('color: "red"', 'color: "magenta"');
    incrementalParser.parse(modified);
  });

export async function runParserBench() {
  await bench.run();
  return bench;
}
