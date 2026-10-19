import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToFacebook(browser, cookiePath, text, mediaPath = null) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[Facebook] Opening Facebook...');
    await page.goto('https://www.facebook.com', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Selector composer status facebook (English / Bahasa Indonesia)
    const feedInputSelector = 'div[role="button"][tabindex="0"]:has-text("What\'s on your mind"), div[role="button"][tabindex="0"]:has-text("Apa yang Anda pikirkan")';
    await page.waitForSelector(feedInputSelector, { timeout: 15000 });
    await page.click(feedInputSelector);
    await page.waitForTimeout(2500);

    // Dialog composer modal
    const dialogSelector = 'div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]';
    await page.waitForSelector(dialogSelector, { timeout: 10000 });
    await page.click(dialogSelector);

    if (text) {
      console.log('[Facebook] Inserting text...');
      await page.keyboard.insertText(text);
      await page.waitForTimeout(2000);
    }

    // Lampirkan Gambar / Video jika ada
    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log('[Facebook] Attaching media file:', mediaPath);
      const mediaBtn = page.locator('div[role="button"]:has-text("Tambahkan foto atau video"), div[role="button"]:has-text("Add photo or video"), div[role="button"]:has-text("Foto/video")').first();
      if (await mediaBtn.count() > 0) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
          mediaBtn.click()
        ]);
        if (fileChooser) {
          await fileChooser.setFiles(mediaPath);
          console.log('[Facebook] Media attached, waiting for upload...');
          await page.waitForTimeout(6000);
        }
      } else {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(mediaPath);
          await page.waitForTimeout(6000);
        }
      }
    }

    // Tombol Kirim / Post / Posting
    console.log('[Facebook] Finding and clicking Post button...');
    const postClicked = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]') || document.body;
      const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
      const postBtn = buttons.find(b => {
        const txt = (b.innerText || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
        const isMatch = (txt === 'posting' || txt === 'post' || txt === 'kirim' || aria === 'posting' || aria === 'post' || aria === 'kirim');
        const notDisabled = b.getAttribute('aria-disabled') !== 'true';
        return isMatch && notDisabled;
      });

      if (postBtn) {
        postBtn.click();
        return true;
      }
      return false;
    });

    if (!postClicked) {
      throw new Error('Tombol Posting/Post tidak ditemukan atau dalam kondisi disabled');
    }

    await page.waitForTimeout(6000);
    console.log('[Facebook] Post published successfully!');
    return { success: true, platform: 'facebook' };
  } catch (error) {
    console.error('[Facebook] Failed:', error.message);
    return { success: false, platform: 'facebook', error: error.message };
  } finally {
    await context.close();
  }
}
