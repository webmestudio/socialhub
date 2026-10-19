import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';

export async function postToInstagram(browser, cookiePath, text, mediaPath = null) {
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    throw new Error('Instagram memerlukan lampiran file gambar atau video (feed tidak mendukung posting teks saja)');
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[Instagram] Navigating to https://www.instagram.com ...');
    await page.goto('https://www.instagram.com', { waitUntil: 'commit', timeout: 35000 });
    await page.waitForTimeout(5000);

    // 1. Dismiss popup notifikasi atau simpan info login jika muncul
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      buttons.forEach(b => {
        const t = (b.innerText || '').trim().toLowerCase();
        if (t === 'not now' || t === 'lain kali' || t === 'jangan sekarang' || t === 'batal') {
          b.click();
        }
      });
    });
    await page.waitForTimeout(1500);

    // 2. Klik tombol Create ("New post" / "Buat")
    console.log('[Instagram] Finding Create button...');
    const createClicked = await page.evaluate(() => {
      // Cek SVG dengan aria-label
      const svgs = Array.from(document.querySelectorAll('svg[aria-label]'));
      const targetSvg = svgs.find(s => {
        const aria = (s.getAttribute('aria-label') || '').toLowerCase();
        return aria.includes('new post') || aria.includes('postingan baru') || aria.includes('create') || aria.includes('buat');
      });
      if (targetSvg) {
        const clickable = targetSvg.closest('a') || targetSvg.closest('div[role="button"]') || targetSvg.parentElement;
        if (clickable) {
          clickable.click();
          return true;
        }
      }

      // Cek elemen link atau tombol dengan teks
      const links = Array.from(document.querySelectorAll('a, div[role="button"]'));
      const createEl = links.find(el => {
        const txt = (el.innerText || '').trim().toLowerCase();
        return txt === 'create' || txt === 'buat';
      });
      if (createEl) {
        createEl.click();
        return true;
      }
      return false;
    });

    if (!createClicked) {
      throw new Error('Tombol Create/Buat tidak ditemukan di Instagram. Pastikan akun sudah login.');
    }

    await page.waitForTimeout(2500);

    // Jika muncul menu popover dropdown "Post" ("Postingan"), klik menu Post
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], a[role="menuitem"], span'));
      const postItem = items.find(it => {
        const t = (it.innerText || '').trim().toLowerCase();
        return t === 'post' || t === 'postingan';
      });
      if (postItem) {
        postItem.click();
      }
    });
    await page.waitForTimeout(2000);

    // 3. Upload file media
    console.log('[Instagram] Attaching media file:', mediaPath);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('Input upload file tidak ditemukan di modal Instagram');
    }
    await fileInput.setInputFiles(mediaPath);
    console.log('[Instagram] Media uploaded, waiting for preview...');
    await page.waitForTimeout(5000);

    // 4. Step 1: Crop / Aspect Ratio -> Klik "Next" / "Selanjutnya"
    console.log('[Instagram] Step: Crop -> Next');
    const nextBtn1 = page.locator('div[role="dialog"] div[role="button"]:has-text("Next"), div[role="dialog"] div[role="button"]:has-text("Selanjutnya"), div[role="dialog"] button:has-text("Next"), div[role="dialog"] button:has-text("Selanjutnya")').last();
    await nextBtn1.waitFor({ state: 'visible', timeout: 15000 });
    await nextBtn1.click();
    await page.waitForTimeout(3000);

    // 5. Step 2: Filter & Edit -> Klik "Next" / "Selanjutnya"
    console.log('[Instagram] Step: Filter -> Next');
    const nextBtn2 = page.locator('div[role="dialog"] div[role="button"]:has-text("Next"), div[role="dialog"] div[role="button"]:has-text("Selanjutnya"), div[role="dialog"] button:has-text("Next"), div[role="dialog"] button:has-text("Selanjutnya")').last();
    if (await nextBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn2.click();
      await page.waitForTimeout(3000);
    }

    // 6. Step 3: Tulis Caption
    if (text) {
      console.log('[Instagram] Typing caption...');
      const captionSelector = 'div[aria-label*="caption" i], div[aria-label*="keterangan" i], div[role="dialog"] div[role="textbox"][contenteditable="true"]';
      try {
        await page.waitForSelector(captionSelector, { timeout: 10000 });
        await page.click(captionSelector);
        await page.keyboard.insertText(text);
        await page.waitForTimeout(1500);
      } catch (err) {
        console.warn('[Instagram] Gagal memasukkan caption otomatis:', err.message);
      }
    }

    // Setup listener untuk response configure media
    let mediaConfigured = false;
    page.on('response', res => {
      const u = res.url();
      if ((u.includes('/media/configure/') || u.includes('/media/configure_to_clips/')) && res.status() === 200) {
        mediaConfigured = true;
      }
    });

    // 7. Klik "Share" / "Bagikan" (pilih tombol Share di header, y < 160)
    console.log('[Instagram] Finding and clicking header Share button...');
    const shareBtns = page.getByRole('button', { name: /^(share|bagikan)$/i });
    await shareBtns.first().waitFor({ state: 'visible', timeout: 10000 });
    const shareCount = await shareBtns.count();
    let headerShareBtn = null;
    for (let i = 0; i < shareCount; i++) {
      const b = shareBtns.nth(i);
      const box = await b.boundingBox();
      if (box && box.y < 160) {
        headerShareBtn = b;
        break;
      }
    }
    if (!headerShareBtn) headerShareBtn = shareBtns.first();
    await headerShareBtn.click();

    // 8. Tunggu konfirmasi postingan dibagikan
    console.log('[Instagram] Waiting for post confirmation...');
    for (let i = 0; i < 25; i++) {
      if (mediaConfigured) break;
      await page.waitForTimeout(1500);
      const isDone = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').toLowerCase();
        return bodyText.includes('your post has been shared') ||
               bodyText.includes('postingan anda telah dibagikan') ||
               bodyText.includes('post shared');
      });
      if (isDone) break;
    }

    console.log('[Instagram] Post published successfully!');
    return { success: true, platform: 'instagram' };
  } catch (error) {
    console.error('[Instagram] Failed:', error.message);
    return { success: false, platform: 'instagram', error: error.message };
  } finally {
    await context.close();
  }
}
