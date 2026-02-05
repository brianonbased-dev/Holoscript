import puppeteer, { Browser, Page } from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

export interface VisualTestConfig {
  width: number;
  height: number;
  threshold: number;
  /** Timeout for waiting for HOLO_RENDERED signal (ms) */
  renderTimeout: number;
  /** Additional wait time after render signal (ms) */
  stabilizationDelay: number;
  /** Timeout for Puppeteer launch (ms) */
  launchTimeout: number;
  /** Number of retries for flaky tests */
  retries: number;
}

const DEFAULT_CONFIG: VisualTestConfig = {
  width: 1280,
  height: 720,
  threshold: 0.1,
  renderTimeout: 5000,
  stabilizationDelay: 300,
  launchTimeout: 30000,
  retries: 2,
};

export class VisualTestRunner {
  private browser: Browser | null = null;
  private config: VisualTestConfig;

  constructor(config: Partial<VisualTestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async launch(): Promise<void> {
    if (this.browser) return;

    const launchPromise = puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    // Add launch timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Browser launch timed out after ${this.config.launchTimeout}ms`)),
        this.config.launchTimeout
      );
    });

    this.browser = await Promise.race([launchPromise, timeoutPromise]);
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        console.warn('Failed to close browser gracefully:', e);
      }
      this.browser = null;
    }
  }

  async renderScene(htmlContent: string): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    let lastError: Error | null = null;

    // Retry logic for flaky tests
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      let page: Page | null = null;
      try {
        page = await this.browser.newPage();
        await page.setViewport({ width: this.config.width, height: this.config.height });

        // Log console errors from the page
        page.on('console', (msg) => {
          if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text());
        });

        page.on('pageerror', (error) => {
          console.error('PAGE EXCEPTION:', error.message);
        });

        // Set content and wait for "networkidle0" to ensure assets load
        await page.setContent(htmlContent, {
          waitUntil: 'networkidle0',
          timeout: this.config.renderTimeout,
        });

        // Wait for the custom rendered signal or timeout
        try {
          await page.waitForFunction('window.HOLO_RENDERED === true', {
            timeout: this.config.renderTimeout,
          });
        } catch (e) {
          if (attempt === this.config.retries) {
            console.warn('Timeout waiting for HOLO_RENDERED signal. Taking screenshot anyway.');
          }
        }

        // Final wait for WebGL frames to finish
        await new Promise((r) => setTimeout(r, this.config.stabilizationDelay));

        const screenshot = await page.screenshot({ type: 'png' });
        await page.close();

        return screenshot as Buffer;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`Render attempt ${attempt + 1} failed:`, lastError.message);

        if (page) {
          try {
            await page.close();
          } catch {
            // Ignore close errors
          }
        }

        if (attempt < this.config.retries) {
          // Wait before retry
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Render failed after all retries');
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

    // Handle dimension mismatch gracefully
    if (img1.width !== img2.width || img1.height !== img2.height) {
      console.warn(
        `Dimension mismatch: actual ${img1.width}x${img1.height} vs baseline ${img2.width}x${img2.height}`
      );
      // Save actual as new baseline if dimensions changed
      fs.writeFileSync(baselinePath, actual);
      return false;
    }

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
      threshold: this.config.threshold,
    });

    if (numDiffPixels > 0 && diffPath) {
      fs.mkdirSync(path.dirname(diffPath), { recursive: true });
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return numDiffPixels === 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): VisualTestConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<VisualTestConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
