
import puppeteer, { Browser, Page } from 'puppeteer';

export interface RendererOptions {
  width: number;
  height: number;
  headless?: boolean | 'new';
  /** Timeout for waiting for HOLO_RENDERED signal (ms) */
  renderTimeout: number;
  /** Additional wait time after render signal (ms) */
  stabilizationDelay: number;
  /** Timeout for Puppeteer launch (ms) */
  launchTimeout: number;
}

const DEFAULT_OPTIONS: RendererOptions = {
  width: 1280,
  height: 720,
  headless: 'new',
  renderTimeout: 5000,
  stabilizationDelay: 300,
  launchTimeout: 30000,
};

export class HeadlessRenderer {
  private browser: Browser | null = null;
  private options: RendererOptions;

  constructor(options: Partial<RendererOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async launch(): Promise<void> {
    if (this.browser) return;

    const launchPromise = puppeteer.launch({
      headless: this.options.headless as 'new',
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
        () => reject(new Error(`Browser launch timed out after ${this.options.launchTimeout}ms`)),
        this.options.launchTimeout
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

  async setupPage(): Promise<Page> {
    if (!this.browser) await this.launch();
    const page = await this.browser!.newPage();
    await page.setViewport({ width: this.options.width, height: this.options.height });

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error') console.error('PAGE ERROR:', msg.text());
      else if (type === 'warning') console.warn('PAGE WARN:', msg.text());
    });

    page.on('pageerror', (error) => {
      console.error('PAGE EXCEPTION:', error.message);
    });

    return page;
  }

  async renderHTML(htmlContent: string, waitForSignal = true): Promise<Page> {
    const page = await this.setupPage();

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: this.options.renderTimeout,
    });

    if (waitForSignal) {
      try {
        await page.waitForFunction('window.HOLO_RENDERED === true', {
          timeout: this.options.renderTimeout,
        });
      } catch (e) {
        console.warn('Timeout waiting for HOLO_RENDERED signal. Proceeding anyway.');
      }
    }

    // Wait for frame stabilization
    await new Promise((r) => setTimeout(r, this.options.stabilizationDelay));
    return page;
  }

  /**
   * Get current options
   */
  getOptions(): RendererOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
