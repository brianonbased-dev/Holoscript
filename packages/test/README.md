# @holoscript/test

Testing framework for HoloScript applications.

## Installation

```bash
npm install @holoscript/test
```

## Overview

A comprehensive testing framework with HoloScript-specific assertions, visual regression testing, coverage tracking, E2E MCP server testing, and runtime observability.

## Assertion Framework

```typescript
import { expect, describe, it, beforeEach, afterEach, runTests } from '@holoscript/test';

describe('my scene', () => {
  it('should position objects correctly', () => {
    expect(obj).toHavePosition(0, 1, -2);
    expect(obj).toHaveTrait('grabbable');
    expect(obj).toHaveScale(1, 1, 1, 0.01);
  });

  it('should handle collisions', () => {
    expect(result).toBeDefined();
    expect(result.damage).toBeGreaterThan(0);
    expect(result.effects).toContain('spark');
    expect(result.effects).toHaveLength(3);
  });

  it('should reject invalid input', () => {
    expect(() => parse(bad)).toThrow('syntax error');
    await expect(fetchScene('missing')).toReject();
  });
});

await runTests({ verbose: true, bail: false });
```

### Standard Matchers

`toBe`, `toEqual`, `toBeDefined`, `toBeUndefined`, `toBeNull`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeLessThan`, `toBeCloseTo`, `toContain`, `toHaveLength`, `toHaveProperty`, `toMatch`, `toThrow`, `toReject`, `toBeInstanceOf`

### HoloScript Matchers

- `toHavePosition(x, y, z, tolerance?)` - 3D position
- `toHaveRotation(x, y, z, tolerance?)` - 3D rotation
- `toHaveScale(x, y, z, tolerance?)` - 3D scale
- `toHaveTrait(traitName)` - Trait presence

All matchers support `.not` for negation.

## Mocking

```typescript
import { fn, spyOn } from '@holoscript/test';

const callback = fn((x) => x * 2);
callback(5);
expect(callback.mock.calls).toHaveLength(1);
expect(callback.mock.lastCall).toEqual([5]);

callback.mockReturnValue(42);
callback.mockResolvedValueOnce(Promise.resolve('async'));

const spy = spyOn(parser, 'parse');
parser.parse(code);
expect(spy.mock.calls[0][0]).toBe(code);
```

## Scene Testing

```typescript
import { createSceneTest, addObject, emit, tick, getEvents } from '@holoscript/test';

const ctx = createSceneTest();
addObject(ctx, { name: 'ball', position: [0, 1, 0], traits: ['physics'] });
emit(ctx, 'collision', 'ball', 'wall', { force: 10 });
tick(ctx, 0.016); // advance 16ms
const events = getEvents(ctx, 'collision');
```

## Visual Regression Testing

Pixel-perfect screenshot comparison using Puppeteer:

```typescript
import { SceneTester } from '@holoscript/test';

const tester = new SceneTester({
  baselineDir: './baselines',
  diffDir: './diffs',
  threshold: 0.01,
});

await tester.setup();
await tester.testScene('examples/lobby.holo', 'lobby');
await tester.teardown();
```

Lower-level API:

```typescript
import { HeadlessRenderer, captureScreenshot, compareImages, saveDiff } from '@holoscript/test';
```

## Coverage Tracking

Track coverage across parser nodes, traits, and error paths:

```typescript
import { CoverageTracker, globalCoverageTracker, createCoverageTest } from '@holoscript/test';

globalCoverageTracker.markCovered('traits', '@grabbable');
globalCoverageTracker.recordPerformance('parse-large', 12.5, 1024);

const report = globalCoverageTracker.generateReport('3.0.0');
console.log(globalCoverageTracker.formatMarkdown(report));
```

Vitest integration:

```typescript
const test = createCoverageTest(globalCoverageTracker);
test('parses objects', () => { /* auto-tracks coverage */ });
```

## E2E Testing

### Live Parser Tests

```typescript
import { LiveTestRunner, runLiveTests } from '@holoscript/test';

const runner = new LiveTestRunner();
await runner.init();
await runner.runAll(); // tests all .holo/.hs/.hsplus files in examples/
```

### MCP Server E2E

```typescript
import { MCPServerE2E, runE2ETests } from '@holoscript/test';

const e2e = new MCPServerE2E();
await e2e.start(10000);
await e2e.callTool('parse_holo', { code: 'composition "Test" {}' });
await e2e.runTestSuite();
e2e.kill();
```

## Observability

Runtime monitoring with health checks and tracing:

```typescript
import { observability, traced, withTracing } from '@holoscript/test';

observability.increment('parse.count');
observability.recordLatency('parse.duration', 12.5);

const health = observability.getHealth();
// { status: 'healthy', checks: [...], metrics: {...} }

// Decorator
class Parser {
  @traced('parse')
  parse(code: string) { /* auto-traced */ }
}

// Wrapper
const result = await withTracing('compile', async () => {
  return compiler.compile(ast);
});
```

## Scripts

```bash
npm test              # Run unit tests (vitest)
npm run test:live     # Run live parser integration tests
npm run test:e2e      # Run MCP server E2E tests
```

## License

MIT
