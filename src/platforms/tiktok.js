import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToTikTok(browser, cookiePath, text, mediaPath = null) {
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    throw new Error('TikTok memerlukan file media video atau gambar (web uploader tidak mendukung posting teks saja)');
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[TikTok] Opening TikTok Studio upload page...');
    await page.goto('https://www.tiktok.com/tiktokstudio/upload?lang=en', {
      waitUntil: 'commit',
      timeout: 35000
    });
    await page.waitForTimeout(6000);

    // Cek apakah diarahkan ke halaman login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Sesi login TikTok telah kedaluwarsa. Silakan perbarui cookie tiktok.json');
    }

    // Dismiss cookie banner atau pop-up jika ada
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      buttons.forEach(b => {
        const t = (b.innerText || '').trim().toLowerCase();
        if (t === 'decline all' || t === 'accept all' || t === 'not now' || t === 'got it') {
          b.click();
        }
      });
    });
    await page.waitForTimeout(1500);

    // 1. Cari input file (bisa di main document atau dalam iframe)
    console.log('[TikTok] Attaching media file:', mediaPath);
    let targetScope = page;
    let fileInput = await page.$('input[type="file"]');

    if (!fileInput) {
      for (const frame of page.frames()) {
        fileInput = await frame.$('input[type="file"]');
        if (fileInput) {
          targetScope = frame;
          break;
        }
      }
    }

    if (!fileInput) {
      throw new Error('Input upload file tidak ditemukan di halaman TikTok Studio');
    }

    await fileInput.setInputFiles(mediaPath);
    console.log('[TikTok] File attached. Waiting for video upload & processing...');

    // Tunggu proses upload video awal
    await page.waitForTimeout(8000);

    // 2. Tulis Caption / Deskripsi
    if (text) {
      console.log('[TikTok] Setting caption/description...');
      const descEl = await targetScope.$(
        'div[contenteditable="true"], div[data-e2e="caption_editor"], .DraftEditor-root [contenteditable="true"]'
      );

      if (descEl) {
        await descEl.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);
        await page.keyboard.insertText(text);
        await page.waitForTimeout(1500);
      } else {
        console.warn('[TikTok] Input caption tidak ditemukan secara langsung');
      }
    }

    // 3. Menunggu tombol Post siap dan aktif (tidak disabled)
    console.log('[TikTok] Waiting for Post button to become active...');
    let postClicked = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      postClicked = await targetScope.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const postBtn = btns.find(b => {
          const t = (b.innerText || '').trim().toLowerCase();
          const e2e = b.getAttribute('data-e2e') || '';
          return (t === 'post' || t === 'posting' || e2e === 'post_video_button') &&
                 b.getAttribute('aria-disabled') !== 'true' &&
                 b.getAttribute('data-disabled') !== 'true' &&
                 !b.disabled;
        });

        if (postBtn) {
          postBtn.scrollIntoView();
          postBtn.click();
          return true;
        }
        return false;
      });

      if (postClicked) {
        console.log('[TikTok] Post button clicked!');
        break;
      }
      await page.waitForTimeout(3000);
    }

    if (!postClicked) {
      throw new Error('Tombol Post tidak dapat diklik atau video masih dalam proses rendering');
    }

    // Jika ada modal konfirmasi tambahan seperti "Post now" / "Posting sekarang"
    await page.waitForTimeout(3000);
    await targetScope.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const postNow = btns.find(b => {
        const t = (b.innerText || '').trim().toLowerCase();
        return t === 'post now' || t === 'posting sekarang';
      });
      if (postNow) postNow.click();
    });

    // 4. Tunggu konfirmasi selesai
    await page.waitForTimeout(6000);
    console.log('[TikTok] Post published successfully!');
    return { success: true, platform: 'tiktok' };
  } catch (error) {
    console.error('[TikTok] Failed:', error.message);
    return { success: false, platform: 'tiktok', error: error.message };
  } finally {
    await context.close();
  }
}
