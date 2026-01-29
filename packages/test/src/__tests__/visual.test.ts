import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VisualTestRunner } from '../VisualTestRunner';
import * as fs from 'fs';
import * as path from 'path';

describe('VisualTestRunner', () => {
  let runner: VisualTestRunner;

  beforeAll(async () => {
    runner = new VisualTestRunner({
      width: 800,
      height: 600
    });
    await runner.launch();
  });

  afterAll(async () => {
    await runner.close();
  });

  it('should render an HTML scene to a buffer', async () => {
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
  });

  it('should compare images and detect identity', async () => {
    const html = '<body style="background: green;"></body>';
    const screenshot = await runner.renderScene(html);
    
    const baselinePath = path.join(process.cwd(), 'temp', 'baseline.png');
    const diffPath = path.join(process.cwd(), 'temp', 'diff.png');
    
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
  });

  it('should detect differences', async () => {
    const baselineHtml = '<body style="background: white;"></body>';
    const actualHtml = '<body style="background: black;"></body>';
    
    const baselineBuffer = await runner.renderScene(baselineHtml);
    const actualBuffer = await runner.renderScene(actualHtml);
    
    const baselinePath = path.join(process.cwd(), 'temp', 'diff_baseline.png');
    const diffPath = path.join(process.cwd(), 'temp', 'diff_result.png');

    // Setup baseline
    if (fs.existsSync(baselinePath)) fs.unlinkSync(baselinePath);
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, baselineBuffer);

    const match = await runner.compare(actualBuffer, baselinePath, diffPath);
    expect(match).toBe(false);
    expect(fs.existsSync(diffPath)).toBe(true);
  });
});
