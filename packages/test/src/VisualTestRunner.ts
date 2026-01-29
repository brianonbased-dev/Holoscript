import puppeteer, { Browser, Page } from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

export interface VisualTestConfig {
  width: number;
  height: number;
  threshold: number;
}

export class VisualTestRunner {
  private browser: Browser | null = null;
  private config: VisualTestConfig;

  constructor(config: Partial<VisualTestConfig> = {}) {
    this.config = {
      width: 1280,
      height: 720,
      threshold: 0.1,
      ...config
    };
  }

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async renderScene(htmlContent: string): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.browser.newPage();
    await page.setViewport({ width: this.config.width, height: this.config.height });
    
    // Set content and wait for "networkidle0" to ensure assets load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait slightly more for any WebGL initialization if needed (mocked here)
    // In a real WebGL app, we might check for a canvas ready event
    await new Promise(r => setTimeout(r, 100));

    const screenshot = await page.screenshot({ type: 'png' });
    await page.close();
    
    return screenshot as Buffer;
  }

  async compare(actual: Buffer, baselinePath: string, diffPath?: string): Promise<boolean> {
    // If baseline doesn't exist, this is a new test or needs update
    if (!fs.existsSync(baselinePath)) {
      console.warn(`Baseline not found at ${baselinePath}. Saving actual as baseline.`);
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, actual);
      return true;
    }

    const img1 = PNG.sync.read(actual);
    const img2 = PNG.sync.read(fs.readFileSync(baselinePath));
    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: this.config.threshold }
    );

    if (numDiffPixels > 0 && diffPath) {
       fs.mkdirSync(path.dirname(diffPath), { recursive: true });
       fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return numDiffPixels === 0;
  }
}
