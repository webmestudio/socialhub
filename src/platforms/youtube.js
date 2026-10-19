import { loadCookies } from '../utils/cookie-helper.js';
import fs from 'fs';
import path from 'path';

export async function postToYouTube(browser, cookiePath, text, mediaPath = null) {
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    throw new Error('YouTube mewajibkan file video (MP4, MOV, WebM, dll). Tidak mendukung posting teks tanpa video.');
  }

  const ext = path.extname(mediaPath).toLowerCase();
  const validVideoExts = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'];
  if (!validVideoExts.includes(ext)) {
    throw new Error(`Format file "${ext}" tidak didukung oleh YouTube Studio. Gunakan format video (MP4, WebM, MOV).`);
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 }
  });

  const cookies = loadCookies(cookiePath);
  await context.addCookies(cookies);

  const page = await context.newPage();
  try {
    console.log('[YouTube] Navigating to https://studio.youtube.com ...');
    await page.goto('https://studio.youtube.com', { waitUntil: 'commit', timeout: 45000 });
    await page.waitForTimeout(6000);

    // Cek apakah dialihkan ke login Google
    if (page.url().includes('accounts.google.com') || page.url().includes('signin')) {
      throw new Error('Sesi login Google/YouTube telah kedaluwarsa. Silakan perbarui cookie youtube.json');
    }

    // 1. Klik tombol Create di YouTube Studio
    console.log('[YouTube] Clicking Create button...');
    const createBtnSelector = [
      'ytcp-button#create-icon',
      '#create-icon',
      'ytcp-button:has-text("Create")',
      'ytcp-button:has-text("Buat")',
      'button[aria-label*="Create" i]'
    ].join(', ');

    const createBtn = page.locator(createBtnSelector).first();
    await createBtn.waitFor({ state: 'visible', timeout: 20000 });
    await createBtn.click();
    await page.waitForTimeout(1500);

    // 2. Pilih "Upload videos" / "Upload video" dari dropdown
    console.log('[YouTube] Selecting "Upload videos"...');
    const uploadItemSelector = [
      'tp-yt-paper-item:has-text("Upload videos")',
      'tp-yt-paper-item:has-text("Upload video")',
      'ytcp-text-menu tp-yt-paper-item:first-child',
      'text="Upload videos"',
      'text="Upload video"'
    ].join(', ');

    const uploadOption = page.locator(uploadItemSelector).first();
    if (await uploadOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uploadOption.click();
      await page.waitForTimeout(2000);
    }

    // 3. Masukkan file video ke input[type="file"]
    console.log('[YouTube] Attaching video file:', mediaPath);
    await page.waitForSelector('input[type="file"]', { timeout: 15000 });
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(mediaPath);
    console.log('[YouTube] Video attached, waiting for upload dialog...');
    await page.waitForTimeout(8000);

    // Siapkan Title & Description dari input teks
    const defaultTitle = path.basename(mediaPath, ext).replace(/[_-]+/g, ' ');
    let title = defaultTitle;
    let description = text || defaultTitle;

    if (text) {
      const firstLine = text.split('\n')[0].trim();
      title = firstLine.length > 95 ? firstLine.slice(0, 95) : firstLine;
    }

    // 4. Isi Title video
    console.log('[YouTube] Setting title:', title);
    const titleBox = page.locator(
      'ytcp-video-metadata-editor #title-textarea #textbox, #title-textarea #textbox, [aria-label*="title" i] #textbox'
    ).first();
    if (await titleBox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await titleBox.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.insertText(title);
      await page.waitForTimeout(1000);
    }

    // 5. Isi Description video
    if (description) {
      console.log('[YouTube] Setting description...');
      const descBox = page.locator(
        'ytcp-video-metadata-editor #description-textarea #textbox, #description-textarea #textbox, [aria-label*="description" i] #textbox'
      ).first();
      if (await descBox.isVisible({ timeout: 6000 }).catch(() => false)) {
        await descBox.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.insertText(description);
        await page.waitForTimeout(1000);
      }
    }

    // 6. Pilih opsi "Not made for kids" (Wajib oleh YouTube)
    console.log('[YouTube] Setting audience (Not made for kids)...');
    try {
      const notForKidsRadio = page.locator(
        'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], tp-yt-paper-radio-button:has-text("No, it\'s not made for kids"), tp-yt-paper-radio-button:has-text("Tidak, video ini tidak dibuat untuk anak-anak")'
      ).first();
      if (await notForKidsRadio.isVisible({ timeout: 5000 }).catch(() => false)) {
        await notForKidsRadio.click();
        await page.waitForTimeout(1000);
      }
    } catch (err) {
      console.warn('[YouTube] Gagal memilih opsi audiens:', err.message);
    }

    // 7. Navigasi wizard melalui tombol Next
    console.log('[YouTube] Navigating wizard steps...');
    for (let step = 1; step <= 3; step++) {
      const nextBtn = page.locator('ytcp-button#next-button').first();
      if (await nextBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
        await nextBtn.click();
        console.log(`[YouTube] Clicked Next (Step ${step})`);
        await page.waitForTimeout(2000);
      }
    }

    // 8. Di tab Visibility, pilih "Public"
    console.log('[YouTube] Setting visibility to Public...');
    try {
      const publicRadio = page.locator(
        'tp-yt-paper-radio-button[name="PUBLIC"], tp-yt-paper-radio-button:has-text("Public"), tp-yt-paper-radio-button:has-text("Publik")'
      ).first();
      if (await publicRadio.isVisible({ timeout: 8000 }).catch(() => false)) {
        await publicRadio.click();
        await page.waitForTimeout(1500);
      }
    } catch (err) {
      console.warn('[YouTube] Gagal memilih visibilitas publik:', err.message);
    }

    // 9. Klik Publish / Save / Done
    console.log('[YouTube] Clicking Publish/Done button...');
    const doneBtn = page.locator('ytcp-button#done-button, ytcp-button:has-text("Publish"), ytcp-button:has-text("Publikasikan")').first();
    await doneBtn.waitFor({ state: 'visible', timeout: 25000 });

    // Tunggu tombol aktif
    for (let i = 0; i < 15; i++) {
      const disabled = await doneBtn.getAttribute('disabled');
      const ariaDisabled = await doneBtn.getAttribute('aria-disabled');
      if (disabled === null && ariaDisabled !== 'true') break;
      await page.waitForTimeout(2000);
    }

    await doneBtn.click();
    console.log('[YouTube] Publish button clicked. Waiting for upload confirmation...');
    await page.waitForTimeout(8000);

    console.log('[YouTube] Video published successfully to YouTube Studio!');
    return { success: true, platform: 'youtube' };
  } catch (error) {
    console.error('[YouTube] Failed:', error.message);
    return { success: false, platform: 'youtube', error: error.message };
  } finally {
    await context.close();
  }
}
