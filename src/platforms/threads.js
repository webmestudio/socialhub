import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToThreads(browser, cookiePath, text, mediaPath = null) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[Threads] Opening Threads...');
    await page.goto('https://www.threads.com', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(4000);

    // 1. Klik kotak composer "What's new?"
    console.log('[Threads] Opening composer...');
    const opened = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div[role="button"]'));
      const composer = els.find(e => {
        const t = (e.innerText || '').trim();
        return t === "What’s new?" || t === "What's new?";
      });
      if (composer) {
        composer.click();
        return true;
      }
      const plusBtn = els.find(e => (e.getAttribute('aria-label') || '').toLowerCase().includes('new thread'));
      if (plusBtn) {
        plusBtn.click();
        return true;
      }
      return false;
    });

    if (!opened) {
      throw new Error('Tidak dapat menemukan kotak/tombol composer Threads');
    }

    await page.waitForTimeout(2000);

    // 2. Ketik konten ke editor input
    if (text) {
      console.log('[Threads] Typing content...');
      const inputSelector = '[contenteditable="true"], [role="textbox"]';
      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.keyboard.insertText(text);
      await page.waitForTimeout(1500);
    }

    // 2b. Lampirkan Gambar / Video jika ada
    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log('[Threads] Attaching media file:', mediaPath);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(mediaPath);
        console.log('[Threads] Media file attached, waiting for upload...');
        await page.waitForTimeout(5000);
      } else {
        console.warn('[Threads] input[type="file"] tidak ditemukan');
      }
    }

    // 3. Cari dan klik tombol Post terakhir (submit dialog)
    console.log('[Threads] Clicking Post button...');
    const postClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
      const postBtns = buttons.filter(b => (b.innerText || '').trim() === 'Post');
      if (postBtns.length > 0) {
        postBtns[postBtns.length - 1].click();
        return true;
      }
      return false;
    });

    if (!postClicked) {
      throw new Error('Tombol Post tidak ditemukan di halaman Threads');
    }

    // 4. Tunggu konfirmasi notifikasi
    await page.waitForTimeout(5000);
    console.log('[Threads] Post submitted successfully!');
    return { success: true, platform: 'threads' };
  } catch (error) {
    console.error('[Threads] Failed:', error.message);
    return { success: false, platform: 'threads', error: error.message };
  } finally {
    await context.close();
  }
}
