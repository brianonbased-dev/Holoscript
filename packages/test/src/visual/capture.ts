import { Page } from 'puppeteer';

export interface CaptureOptions {
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

export async function captureScreenshot(page: Page, options: CaptureOptions = {}): Promise<Buffer> {
  return await page.screenshot({
    type: options.type || 'png',
    quality: options.type === 'jpeg' ? options.quality || 80 : undefined,
    fullPage: options.fullPage,
    clip: options.clip,
    encoding: 'binary',
  });
}
