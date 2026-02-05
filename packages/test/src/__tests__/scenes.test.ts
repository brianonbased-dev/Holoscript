import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SceneTester } from '../SceneTester';
import * as path from 'path';
import * as fs from 'fs';

// Skip visual tests if CI environment without browser or Puppeteer unavailable
const SKIP_VISUAL = process.env.CI === 'true' || process.env.SKIP_VISUAL_TESTS === 'true';

describe.skipIf(SKIP_VISUAL)('Scene Visual Regression', () => {
  let tester: SceneTester;
  let browserAvailable = false;
  const rootDir = path.resolve(process.cwd(), '../..');
  const baselineDir = path.join(process.cwd(), 'baselines');
  const diffDir = path.join(process.cwd(), 'diffs');

  beforeAll(async () => {
    tester = new SceneTester({
      width: 1280,
      height: 720,
      baselineDir,
      diffDir,
      launchTimeout: 60000,
    });
    try {
      await tester.setup();
      browserAvailable = true;
    } catch (e) {
      console.warn('Browser not available, skipping scene tests:', e);
      browserAvailable = false;
    }
  }, 90000);

  afterAll(async () => {
    await tester.teardown();
  });

  it('renders "Floating Cyan Orb" correctly', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    const holoPath = path.join(rootDir, 'examples/quickstart/1-floating-cyan-orb.holo');
    if (!fs.existsSync(holoPath)) {
      console.log('Skipping: example file not found');
      return;
    }
    const success = await tester.testScene(holoPath, 'cyan-orb');
    expect(success).toBe(true);
  }, 30000);

  it('renders "Red Cube Teal Button" correctly', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    const holoPath = path.join(rootDir, 'examples/quickstart/2-red-cube-teal-button.holo');
    if (!fs.existsSync(holoPath)) {
      console.log('Skipping: example file not found');
      return;
    }
    const success = await tester.testScene(holoPath, 'cube-button');
    expect(success).toBe(true);
  }, 30000);

  it('renders complex world with zones', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    // This uses the test file we created earlier
    const holoPath = path.join(rootDir, 'world-with-zones.holo');
    if (!fs.existsSync(holoPath)) {
      console.log('Skipping: world-with-zones.holo not found');
      return;
    }
    const success = await tester.testScene(holoPath, 'world-with-zones');
    expect(success).toBe(true);
  }, 30000);
});
