import { HoloScriptPlusParser } from './packages/core/src/parser/HoloScriptPlusParser.js';

async function runTests() {
  const parser = new HoloScriptPlusParser();
  let success = true;

  console.log('--- HoloScriptPlusParser Verification (ESM) ---');

  const testCases = [
    {
      name: '@networked trait',
      source: `object box @networked(mode: "reliable") {}`,
      validate: (result) => {
        const node = result.ast.root.children[0];
        return node && node.traits.has('networked');
      }
    },
    {
      name: '@external_api directive',
      source: `object sensor @external_api(url: "https://api.test.com") {}`,
      validate: (result) => {
        const node = result.ast.root.children[0];
        return node && node.directives.some(d => d.type === 'external_api');
      }
    }
  ];

  for (const { name, source, validate } of testCases) {
    try {
      const result = parser.parse(source);
      if (!result.success) {
        console.error(`[FAIL] ${name}: Parser reported failure`);
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => console.error(`  - Error: ${err.message} at line ${err.line}, col ${err.column}`));
        }
        success = false;
        continue;
      }
      
      const pass = validate(result);
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${pass ? 'Detected correctly' : 'Not found in AST'}`);
      if (!pass) success = false;
    } catch (e) {
      console.error(`[ERROR] ${name}: ${e.message}\n${e.stack}`);
      success = false;
    }
  }

  if (success) {
    console.log('\n✅ ALL CORE PARSER TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests();
