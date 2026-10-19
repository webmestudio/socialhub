import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToTwitter(browser, cookiePath, text, mediaPath = null) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[X/Twitter] Opening https://x.com/compose/post ...');
    await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const editorSelector = '[data-testid="tweetTextarea_0"], div[role="textbox"][data-testid*="tweet"]';
    await page.waitForSelector(editorSelector, { timeout: 15000 });
    await page.click(editorSelector);

    if (text) {
      console.log('[X/Twitter] Inserting text...');
      await page.keyboard.insertText(text);
      await page.waitForTimeout(1000);
    }

    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log('[X/Twitter] Attaching media file:', mediaPath);
      const fileInput = await page.$('input[data-testid="fileInput"], input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(mediaPath);
        console.log('[X/Twitter] Media attached, waiting for upload...');
        await page.waitForTimeout(5000);
      }
    }

    const postButtonSelector = '[data-testid="tweetButton"], button[data-testid*="tweetButton"]';
    await page.waitForSelector(postButtonSelector, { timeout: 5000 });

    console.log('[X/Twitter] Publishing post...');
    await page.click(postButtonSelector);

    await page.waitForTimeout(4000);
    console.log('[X/Twitter] Post published successfully!');
    return { success: true, platform: 'twitter' };
  } catch (error) {
    console.error('[X/Twitter] Failed:', error.message);
    return { success: false, platform: 'twitter', error: error.message };
  } finally {
    await context.close();
  }
}
