import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToLinkedIn(browser, cookiePath, text, mediaPath = null) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[LinkedIn] Opening https://www.linkedin.com/feed/?shareActive=true ...');
    await page.goto('https://www.linkedin.com/feed/?shareActive=true', { waitUntil: 'commit', timeout: 35000 });

    // 1. Tangani proses auto sign-in redirect jika muncul transisi "We're signing you in"
    for (let i = 0; i < 15; i++) {
      if (page.url().includes('/feed')) break;
      await page.waitForTimeout(1000);
    }

    // 2. Tunggu modal pembuatan postingan terbuka (didukung oleh query parameter shareActive=true)
    console.log('[LinkedIn] Waiting for post composer modal...');
    await page.waitForFunction(() => {
      const t = (document.body?.innerText || '').toLowerCase();
      return t.includes('posting ke semua orang') ||
             t.includes('post to anyone') ||
             t.includes('anyone') ||
             t.includes('semua orang');
    }, { timeout: 35000 });

    await page.waitForTimeout(1500);

    // 3. Lampirkan Media Gambar / Video jika ada
    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log('[LinkedIn] Attaching media file:', mediaPath);
      const mediaBtn = page.locator('button[aria-label="Media"], button[aria-label*="media" i], button[aria-label*="foto" i]').first();
      
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => [null]),
        mediaBtn.click()
      ]);

      if (fileChooser && typeof fileChooser.setFiles === 'function') {
        await fileChooser.setFiles(mediaPath);
        console.log('[LinkedIn] Media attached, waiting for preview...');
        await page.waitForTimeout(4000);

        // Jika muncul tombol "Berikutnya" / "Next" / "Selesai" di modal pratinjau media
        const nextMediaBtn = page.locator('button:has-text("Berikutnya"), button:has-text("Next"), button:has-text("Selesai"), button:has-text("Done")').first();
        if (await nextMediaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextMediaBtn.click();
          await page.waitForTimeout(2000);
        }
      } else {
        const fi = await page.$('input[type="file"]');
        if (fi) {
          await fi.setInputFiles(mediaPath);
          await page.waitForTimeout(4000);
        }
      }
    }

    // 4. Masukkan teks / status ke editor ProseMirror Tiptap
    if (text) {
      console.log('[LinkedIn] Typing status content...');
      const editor = page.locator('.ProseMirror[contenteditable="true"], div[role="textbox"][contenteditable="true"]').first();
      await editor.waitFor({ state: 'visible', timeout: 10000 });
      await editor.click();
      await page.waitForTimeout(500);
      await page.keyboard.type(text, { delay: 20 });
      await page.waitForTimeout(1500);
    }

    // 5. Cari tombol Postingan / Post / Posting yang aktif
    console.log('[LinkedIn] Finding submit button...');
    const postBtns = page.getByRole('button', { name: /^(postingan|post|posting)$/i });
    const btnCount = await postBtns.count();

    let submitBtn = null;
    for (let i = 0; i < btnCount; i++) {
      const b = postBtns.nth(i);
      if (await b.isVisible()) {
        submitBtn = b;
        break;
      }
    }

    if (!submitBtn) {
      throw new Error('Tombol submit "Postingan" tidak ditemukan');
    }

    console.log('[LinkedIn] Clicking submit button...');
    await submitBtn.click();
    console.log('[LinkedIn] Post submitted. Waiting for confirmation...');

    // 6. Tunggu modal tertutup atau konfirmasi muncul
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1500);
      const isDone = await page.evaluate(() => {
        const t = (document.body?.innerText || '').toLowerCase();
        const modalOpen = t.includes('posting ke semua orang') || t.includes('post to anyone');
        const hasToast = t.includes('post successful') || t.includes('postingan berhasil') || t.includes('posting berhasil');
        return hasToast || !modalOpen;
      });
      if (isDone) {
        break;
      }
    }

    console.log('[LinkedIn] Post published successfully!');
    return { success: true, platform: 'linkedin' };
  } catch (error) {
    console.error('[LinkedIn] Failed:', error.message);
    return { success: false, platform: 'linkedin', error: error.message };
  } finally {
    await context.close();
  }
}
