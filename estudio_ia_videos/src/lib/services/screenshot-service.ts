/**
 * 📸 Screenshot Service
 * Uses Puppeteer for generating thumbnails and screenshots
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '@/lib/logger';
import { thumbnailCache } from '@/lib/cache/lru-memory-cache';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    logger.info('[Screenshot] Launching Puppeteer browser');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });
  }
  return browserInstance;
}

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  fullPage?: boolean;
}

/**
 * Capture screenshot from HTML content
 */
export async function screenshotFromHtml(
  html: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const {
    width = 1920,
    height = 1080,
    quality = 80,
    format = 'png',
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const screenshot = await page.screenshot({
      type: format,
      quality: format === 'png' ? undefined : quality,
    });

    logger.debug('[Screenshot] Generated from HTML', { width, height, format });
    return screenshot as Buffer;
  } finally {
    await page.close();
  }
}

/**
 * Capture screenshot from URL
 */
export async function screenshotFromUrl(
  url: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const {
    width = 1920,
    height = 1080,
    quality = 80,
    format = 'png',
    fullPage = false,
  } = options;

  // Check cache first
  const cacheKey = `url:${url}:${width}x${height}:${format}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    logger.debug('[Screenshot] Cache hit for URL', { url });
    return cached;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const screenshot = await page.screenshot({
      type: format,
      quality: format === 'png' ? undefined : quality,
      fullPage,
    });

    const buffer = screenshot as Buffer;
    thumbnailCache.set(cacheKey, buffer);

    logger.debug('[Screenshot] Generated from URL', { url, width, height });
    return buffer;
  } finally {
    await page.close();
  }
}

/**
 * Generate slide thumbnail from slide data
 */
export async function generateSlideThumbnail(
  slideHtml: string,
  slideId: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  const cacheKey = `slide:${slideId}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const thumbnail = await screenshotFromHtml(slideHtml, {
    width: 400,
    height: 225,
    format: 'webp',
    quality: 75,
    ...options,
  });

  thumbnailCache.set(cacheKey, thumbnail);
  return thumbnail;
}

/**
 * Generate PDF from HTML
 */
export async function generatePdfFromHtml(
  html: string,
  options: { format?: 'A4' | 'Letter'; landscape?: boolean } = {}
): Promise<Buffer> {
  const { format = 'A4', landscape = false } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    logger.info('[Screenshot] Generated PDF', { format, landscape });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/**
 * Cleanup browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    logger.info('[Screenshot] Browser closed');
  }
}

// Cleanup on process exit
process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});
