import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VisualTestRunner } from '../VisualTestRunner';
import * as fs from 'fs';
import * as path from 'path';

// Skip visual tests if CI environment without browser or Puppeteer unavailable
const SKIP_VISUAL = process.env.CI === 'true' || process.env.SKIP_VISUAL_TESTS === 'true';

describe.skipIf(SKIP_VISUAL)('VisualTestRunner', () => {
  let runner: VisualTestRunner;
  let browserAvailable = false;

  beforeAll(async () => {
    runner = new VisualTestRunner({
      width: 800,
      height: 600,
      launchTimeout: 60000,
    });
    try {
      await runner.launch();
      browserAvailable = true;
    } catch (e) {
      console.warn('Browser not available, skipping visual tests:', e);
      browserAvailable = false;
    }
  }, 90000);

  afterAll(async () => {
    await runner.close();
  });

  it('should render an HTML scene to a buffer', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    const html = `
      <html>
        <body style="background: linear-gradient(to right, red, blue); margin: 0; padding: 0;">
          <h1 style="color: white; font-family: sans-serif; text-align: center; margin-top: 200px;">
            HoloScript Visual Test
          </h1>
        </body>
      </html>
    `;

    const screenshot = await runner.renderScene(html);
    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);
  }, 30000);

  it('should compare images and detect identity', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    const html = '<body style="background: green;"></body>';
    const screenshot = await runner.renderScene(html);
    
    const baselinePath = path.join(process.cwd(), 'temp', 'baseline.png');
    const diffPath = path.join(process.cwd(), 'temp', 'diff.png');
    
    // Ensure temp directory exists
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    
    // Ensure clean state
    if (fs.existsSync(baselinePath)) fs.unlinkSync(baselinePath);
    if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath);

    // First run saves baseline
    const match1 = await runner.compare(screenshot, baselinePath);
    expect(match1).toBe(true);
    expect(fs.existsSync(baselinePath)).toBe(true);

    // Second run with same image should match
    const match2 = await runner.compare(screenshot, baselinePath);
    expect(match2).toBe(true);
  }, 30000);

  it('should detect differences', async () => {
    if (!browserAvailable) {
      console.log('Skipping: browser not available');
      return;
    }
    const baselineHtml = '<body style="background: white;"></body>';
    const actualHtml = '<body style="background: black;"></body>';
    
    const baselineBuffer = await runner.renderScene(baselineHtml);
    const actualBuffer = await runner.renderScene(actualHtml);
    
    const baselinePath = path.join(process.cwd(), 'temp', 'diff_baseline.png');
    const diffPath = path.join(process.cwd(), 'temp', 'diff_result.png');

    // Setup baseline
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    if (fs.existsSync(baselinePath)) fs.unlinkSync(baselinePath);
    fs.writeFileSync(baselinePath, baselineBuffer);

    const match = await runner.compare(actualBuffer, baselinePath, diffPath);
    expect(match).toBe(false);
    expect(fs.existsSync(diffPath)).toBe(true);
  }, 30000);
});
