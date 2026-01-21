const { HoloScriptPlusParser } = require('./packages/core/src/parser/HoloScriptPlusParser');

async function runTests() {
  const parser = new HoloScriptPlusParser();
  let success = true;

  console.log('--- HoloScriptPlusParser Verification ---');

  // Test 1: @networked
  try {
    const source1 = `@networked(mode: "reliable") object box {}`;
    const result1 = parser.parse(source1);
    if (!result1.success) throw new Error('Result 1 failed');
    const hasNetworked = result1.ast.root.traits.has('networked');
    console.log(`[PASS] @networked trait detected: ${hasNetworked}`);
    if (!hasNetworked) success = false;
  } catch (e) {
    console.error(`[FAIL] @networked trait: ${e.message}`);
    success = false;
  }

  // Test 2: @external_api
  try {
    const source2 = `@external_api(url: "https://api.test.com") object sensor {}`;
    const result2 = parser.parse(source2);
    if (!result2.success) throw new Error('Result 2 failed');
    const apiDirective = result2.ast.root.directives.find(d => d.type === 'external_api');
    console.log(`[PASS] @external_api directive detected: ${!!apiDirective}`);
    if (!apiDirective) success = false;
  } catch (e) {
    console.error(`[FAIL] @external_api directive: ${e.message}`);
    success = false;
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
