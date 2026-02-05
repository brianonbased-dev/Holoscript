/**
 * Type Checker Benchmarks
 * 
 * Measures type checking performance
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Bench } from 'tinybench';
import { HoloScriptPlusParser, HoloScriptTypeChecker } from '@holoscript/core';

const __dirname = new URL('.', import.meta.url).pathname;

// Load fixtures
const smallSource = readFileSync(resolve(__dirname, '../fixtures/small.hsplus'), 'utf-8');
const mediumSource = readFileSync(resolve(__dirname, '../fixtures/medium.hsplus'), 'utf-8');

const bench = new Bench({ name: 'Type Checker Benchmarks', time: 1000 });

const parser = new HoloScriptPlusParser();
const typeChecker = new HoloScriptTypeChecker();

// Parse for type checking
const smallAst = parser.parse(smallSource).ast;
const mediumAst = parser.parse(mediumSource).ast;

bench
  .add('typecheck-small', () => {
    if (smallAst) {
      typeChecker.check(smallAst);
    }
  })
  .add('typecheck-medium', () => {
    if (mediumAst) {
      typeChecker.check(mediumAst);
    }
  })
  .add('typecheck-with-trait-validation-small', () => {
    if (smallAst) {
      // Type check includes trait validation
      typeChecker.check(smallAst);
    }
  });

export async function runTypeCheckerBench() {
  await bench.run();
  return bench;
}
