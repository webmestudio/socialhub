import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToFacebookPage(browser, cookiePath, text, pageName = 'Webme Studio', mediaPath = null) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log(`[Facebook Page] Opening Facebook to publish as ${pageName}...`);
    await page.goto('https://www.facebook.com', { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(5000);

    // 1. Cek apakah halaman (misal: Webme Studio) sudah aktif
    let isPageActive = await page.evaluate((name) => {
      const bodyText = document.body.innerText || '';
      return bodyText.includes(`Apa yang Anda pikirkan, ${name}?`) || bodyText.includes(`What's on your mind, ${name}?`);
    }, pageName);

    // 2. Jika belum aktif, lakukan switch profile ke Page
    if (!isPageActive) {
      console.log(`[Facebook Page] Switching profile to ${pageName}...`);
      await page.evaluate(() => {
        const userBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria.includes('profil') || aria.includes('profile') || aria.includes('akun') || aria.includes('account');
        });
        if (userBtn) userBtn.click();
      });
      await page.waitForTimeout(3000);

      // Cari dan klik tombol switch profil page
      const switched = await page.evaluate((name) => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], div[role="menuitem"], a'));
        const target = btns.find(b => {
          const aria = b.getAttribute('aria-label') || '';
          const text = b.innerText || '';
          return (aria.includes(name) || text.includes(name)) && (aria.includes('Beralih') || aria.includes('Switch') || b.getBoundingClientRect().x > 700);
        });
        if (target) {
          target.click();
          return true;
        }
        return false;
      });

      if (!switched) {
        throw new Error(`Gagal menemukan tombol beralih ke halaman ${pageName}`);
      }
      await page.waitForTimeout(7000);
    }

    // 3. Buka kotak composer status di feed Page
    console.log(`[Facebook Page] Opening status composer for ${pageName}...`);
    const feedInputSelector = 'div[role="button"][tabindex="0"]:has-text("Apa yang Anda pikirkan"), div[role="button"][tabindex="0"]:has-text("What\'s on your mind")';
    await page.waitForSelector(feedInputSelector, { timeout: 15000 });
    await page.click(feedInputSelector);
    await page.waitForTimeout(2500);

    // 4. Masukkan teks postingan
    const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
    await page.waitForSelector(textboxSelector, { timeout: 10000 });
    await page.click(textboxSelector);
    if (text) {
      console.log('[Facebook Page] Typing content...');
      await page.keyboard.insertText(text);
      await page.waitForTimeout(2000);
    }

    // 4b. Lampirkan Gambar / Video jika ada
    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log(`[Facebook Page] Attaching media file to ${pageName}:`, mediaPath);
      const mediaBtn = page.locator('div[role="button"]:has-text("Tambahkan foto atau video"), div[role="button"]:has-text("Add photo or video"), div[role="button"]:has-text("Foto/video")').first();
      if (await mediaBtn.count() > 0) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
          mediaBtn.click()
        ]);
        if (fileChooser) {
          await fileChooser.setFiles(mediaPath);
          console.log('[Facebook Page] Media attached, waiting for upload...');
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

    // 5. Klik tombol Posting
    console.log('[Facebook Page] Clicking Post button...');
    const postClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const btn = btns.find(b => {
        const txt = (b.innerText || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
        return (txt === 'posting' || txt === 'post' || aria === 'posting' || aria === 'post') && b.getAttribute('aria-disabled') !== 'true';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!postClicked) {
      throw new Error('Tombol Posting tidak dapat diklik atau nonaktif');
    }

    // 6. Cek jika muncul pop-up penawaran WhatsApp / Promo dan klik "Lain Kali"
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const target = btns.find(b => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        const txt = (b.innerText || '').toLowerCase();
        const rect = b.getBoundingClientRect();
        return (aria.includes('lain kali') || txt.includes('lain kali') || aria.includes('not now') || txt.includes('not now')) && rect.width > 0 && rect.height > 0;
      });
      if (target) target.click();
    });

    await page.waitForTimeout(6000);
    console.log(`[Facebook Page] Post successfully published to ${pageName}!`);
    return { success: true, platform: 'facebook_page', page: pageName };
  } catch (error) {
    console.error(`[Facebook Page] Failed to post to ${pageName}:`, error.message);
    return { success: false, platform: 'facebook_page', page: pageName, error: error.message };
  } finally {
    await context.close();
  }
}
