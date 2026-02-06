#!/usr/bin/env node
/**
 * CLI for running live integration tests
 * 
 * Usage:
 *   npx tsx packages/test/src/run-live-tests.ts
 *   pnpm --filter @holoscript/test run live
 */

import { runLiveTests } from './e2e/LiveTestRunner';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     HoloScript Live Integration Tests                      ║');
  console.log('║     Testing REAL files with REAL parsers                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const summary = await runLiveTests();

  // Exit with error code if any tests failed
  if (summary.failed > 0) {
    console.log(`\n❌ ${summary.failed} test(s) failed\n`);
    process.exit(1);
  }

  console.log('✅ All live tests passed!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error running live tests:', error);
  process.exit(1);
});
