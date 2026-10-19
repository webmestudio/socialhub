import fs from 'fs';
import path from 'path';
import { loadCookies } from './cookie-helper.js';

// Definisi cookie autentikasi utama per platform
export const ESSENTIAL_COOKIES = {
  threads: ['sessionid'],
  twitter: ['auth_token', 'ct0'],
  facebook: ['c_user', 'xs'],
  facebook_page: ['c_user', 'xs'],
  instagram: ['sessionid', 'ds_user_id'],
  linkedin: ['li_at'],
  tiktok: ['sessionid'],
  youtube: ['LOGIN_INFO', 'SAPISID', 'SID', 'SSID']
};

// Cookie sementara / Cloudflare / bot / analytics yang tidak boleh dijadikan patokan expiry
const IGNORED_EXPIRY_COOKIES = new Set([
  '__cf_bm', 'cf_clearance', '_ga', '_gid', '_gat', 'amp_token',
  'guest_id', 'personalization_id', 'lidc', 'dfpfpt'
]);

/**
 * Analisis Statis File Cookie:
 * Memeriksa format JSON, keberadaan cookie penting, serta menghitung sisa masa berlaku (expiry)
 * berdasarkan token autentikasi utama (bukan cookie bot Cloudflare sementara).
 */
export function analyzeCookie(platform, filePath) {
  const normPlatform = (platform || '').toLowerCase().replace('x', 'twitter');
  const targetPlatform = normPlatform === 'facebook_page' ? 'facebook' : normPlatform;

  if (!fs.existsSync(filePath)) {
    return {
      platform,
      exists: false,
      status: 'not_found',
      badge: '○ Belum Ada Cookie',
      message: 'File cookie belum terpasang',
      cookieCount: 0,
      daysRemaining: null,
      earliestExpiry: null,
      essentialMissing: []
    };
  }

  let cookies = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    cookies = JSON.parse(raw);
    if (!Array.isArray(cookies)) {
      return {
        platform,
        exists: true,
        status: 'invalid_format',
        badge: '⚠ Format Tidak Valid',
        message: 'Isi file cookie bukan berupa Array JSON',
        cookieCount: 0,
        daysRemaining: null,
        earliestExpiry: null,
        essentialMissing: []
      };
    }
  } catch (err) {
    return {
      platform,
      exists: true,
      status: 'parse_error',
      badge: '⚠ Error JSON',
      message: 'Gagal mem-parsing JSON: ' + err.message,
      cookieCount: 0,
      daysRemaining: null,
      earliestExpiry: null,
      essentialMissing: []
    };
  }

  if (cookies.length === 0) {
    return {
      platform,
      exists: true,
      status: 'empty',
      badge: '○ Cookie Kosong',
      message: 'Array cookie kosong (0 cookie)',
      cookieCount: 0,
      daysRemaining: null,
      earliestExpiry: null,
      essentialMissing: []
    };
  }

  const cookieMap = new Map();
  cookies.forEach(c => {
    if (c.name) cookieMap.set(c.name.trim(), c);
  });

  const required = ESSENTIAL_COOKIES[normPlatform] || ESSENTIAL_COOKIES[targetPlatform] || [];

  // Khusus YouTube: cukup memiliki salah satu dari LOGIN_INFO / SAPISID / SID / SSID
  let missing = [];
  if (targetPlatform === 'youtube') {
    const hasAny = required.some(name => cookieMap.has(name));
    if (!hasAny) missing = ['LOGIN_INFO atau SAPISID/SID'];
  } else {
    missing = required.filter(name => !cookieMap.has(name));
  }

  // Hitung Expiry: Prioritaskan token autentikasi utama!
  const nowSec = Math.floor(Date.now() / 1000);
  let relevantCookies = [];

  // 1. Ambil cookie essential yang ada
  required.forEach(name => {
    const c = cookieMap.get(name);
    if (c && typeof (c.expirationDate || c.expires) === 'number') {
      relevantCookies.push(c);
    }
  });

  // 2. Jika tidak ada essential cookie ber-expiry, gunakan cookie selain yang diabaikan
  if (relevantCookies.length === 0) {
    relevantCookies = cookies.filter(c => {
      const name = (c.name || '').toLowerCase();
      return !IGNORED_EXPIRY_COOKIES.has(name) && typeof (c.expirationDate || c.expires) === 'number';
    });
  }

  let earliestExpiry = null;
  for (const c of relevantCookies) {
    const exp = c.expirationDate || c.expires;
    if (typeof exp === 'number' && exp > 0) {
      if (earliestExpiry === null || exp < earliestExpiry) {
        earliestExpiry = exp;
      }
    }
  }

  let daysRemaining = null;
  let isExpiredByTime = false;

  if (earliestExpiry !== null) {
    const diffSec = earliestExpiry - nowSec;
    daysRemaining = Math.round(diffSec / 86400);
    if (diffSec <= 0) {
      isExpiredByTime = true;
    }
  }

  let status = 'valid';
  let badge = '● Terpasang';
  let message = `Memiliki ${cookies.length} cookie.`;

  if (missing.length > 0) {
    status = 'missing_essential';
    badge = '⚠ Cookie Kurang';
    message = `Kurang cookie utama: ${missing.join(', ')}`;
  } else if (isExpiredByTime) {
    status = 'expired';
    badge = '🔴 Kedaluwarsa';
    message = `Sesi kedaluwarsa pada ${new Date(earliestExpiry * 1000).toLocaleDateString('id-ID')}`;
  } else if (daysRemaining !== null) {
    if (daysRemaining <= 3) {
      status = 'expiring_soon';
      badge = `🟡 Sisa ${daysRemaining} hari`;
      message = `Cookie mendekati batas kedaluwarsa (${daysRemaining} hari lagi)`;
    } else {
      badge = `🟢 Aktif (~${daysRemaining} hari)`;
      message = `Sesi aktif (berlaku hingga ${new Date(earliestExpiry * 1000).toLocaleDateString('id-ID')})`;
    }
  } else {
    badge = `● Terpasang (${cookies.length} cookies)`;
    message = `Sesi terpasang (${cookies.length} cookies)`;
  }

  return {
    platform,
    exists: true,
    status,
    badge,
    message,
    cookieCount: cookies.length,
    daysRemaining,
    earliestExpiry: earliestExpiry ? new Date(earliestExpiry * 1000).toISOString() : null,
    essentialMissing: missing
  };
}

/**
 * Verifikasi Nyata (Live Browser Check):
 * Membuka browser Playwright secara headless dan memastikan akun benar-benar login di platform tujuan.
 */
export async function verifyCookieLive(browser, platform, cookiePath) {
  const normPlatform = (platform || '').toLowerCase().replace('x', 'twitter');
  const actualCookiePath = normPlatform === 'facebook_page'
    ? path.join(path.dirname(cookiePath), 'facebook.json')
    : cookiePath;

  if (!fs.existsSync(actualCookiePath)) {
    return {
      platform,
      success: false,
      status: 'not_found',
      message: 'File cookie belum terpasang'
    };
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  try {
    const cookies = loadCookies(actualCookiePath);
    await context.addCookies(cookies);
    const page = await context.newPage();

    let result = { platform, success: false, username: null, message: '' };

    if (normPlatform === 'threads') {
      console.log('[Live Check] Testing Threads session...');
      await page.goto('https://www.threads.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        result = { platform, success: false, message: 'Dialihkan ke halaman login Threads/Instagram' };
      } else {
        const check = await page.evaluate(() => {
          const text = document.body ? document.body.innerText || '' : '';
          const hasComposer = text.includes("What's new?") || text.includes("What’s new?") || text.includes("Apa yang baru?");
          const hasNav = !!document.querySelector('svg[aria-label*="Profile" i], a[href*="/@"], a[href^="/@"]');
          const title = document.title || '';
          const hasHomeTitle = title.includes('Threads') && !title.includes('Log in');
          
          let username = null;
          const profileLink = document.querySelector('a[href^="/@"]');
          if (profileLink) {
            username = profileLink.getAttribute('href').replace('/', '');
          }
          return { isValid: hasComposer || hasNav || hasHomeTitle, username };
        });

        if (check.isValid) {
          result = {
            platform,
            success: true,
            username: check.username || 'Sesi Aktif',
            message: check.username ? `Login aktif sebagai ${check.username}` : 'Sesi Threads aktif & terverifikasi'
          };
        } else {
          result = { platform, success: false, message: 'Sesi Threads tidak aktif atau kedaluwarsa' };
        }
      }

    } else if (normPlatform === 'twitter') {
      console.log('[Live Check] Testing X/Twitter session...');
      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
        result = { platform, success: false, message: 'Dialihkan ke halaman login X' };
      } else {
        const check = await page.evaluate(() => {
          const hasComposer = !!document.querySelector('[data-testid="tweetTextarea_0"]');
          const hasNav = !!document.querySelector('[data-testid="AppTabBar_Home_Link"], [data-testid="SideNav_NewTweet_Button"]');
          const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
          const avatarContainer = document.querySelector('[data-testid*="UserAvatar-Container-"]');
          
          let username = null;
          if (avatarContainer) {
            const testid = avatarContainer.getAttribute('data-testid') || '';
            const m = testid.match(/UserAvatar-Container-(.+)/);
            if (m && m[1]) username = '@' + m[1];
          }
          if (!username && switcher) {
            const match = (switcher.innerText || '').match(/@[\w_]+/);
            if (match) username = match[0];
          }

          const title = document.title || '';
          const hasHomeTitle = title.includes('Home') || title.includes('Beranda');
          return { isValid: hasComposer || hasNav || !!switcher || hasHomeTitle, username };
        });

        if (check.isValid) {
          result = {
            platform,
            success: true,
            username: check.username || 'Sesi Aktif',
            message: check.username ? `Login aktif sebagai ${check.username}` : 'Sesi X (Twitter) aktif & terverifikasi'
          };
        } else {
          result = { platform, success: false, message: 'Gagal mendeteksi feed login X (Twitter)' };
        }
      }

    } else if (normPlatform === 'facebook') {
      console.log('[Live Check] Testing Facebook session...');
      await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('login.php')) {
        result = { platform, success: false, message: 'Dialihkan ke form login Facebook' };
      } else {
        const check = await page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText || '' : '';
          const hasComposer = bodyText.includes("What's on your mind") || bodyText.includes("Apa yang Anda pikirkan");
          const hasLoginForm = !!document.querySelector('input#email, input[name="email"]');
          const hasUserNav = !!document.querySelector('div[role="navigation"], div[aria-label*="Facebook" i], div[role="banner"]');
          return { isValid: (hasComposer || hasUserNav) && !hasLoginForm };
        });

        if (check.isValid) {
          result = { platform, success: true, message: 'Sesi Facebook Profil aktif & siap posting' };
        } else {
          result = { platform, success: false, message: 'Sesi Facebook berakhir atau memerlukan login ulang' };
        }
      }

    } else if (normPlatform === 'facebook_page') {
      console.log('[Live Check] Testing Facebook Page session...');
      await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        result = { platform, success: false, message: 'Dialihkan ke halaman login Facebook' };
      } else {
        const check = await page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText || '' : '';
          const hasComposer = bodyText.includes("What's on your mind") || bodyText.includes("Apa yang Anda pikirkan");
          const hasLoginForm = !!document.querySelector('input#email, input[name="email"]');
          return { isValid: hasComposer && !hasLoginForm };
        });

        if (check.isValid) {
          result = { platform, success: true, message: 'Akses Facebook Page aktif & siap switch profil' };
        } else {
          result = { platform, success: false, message: 'Sesi Facebook kedaluwarsa atau belum login' };
        }
      }

    } else if (normPlatform === 'linkedin') {
      console.log('[Live Check] Testing LinkedIn session...');
      await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/uas/login') || currentUrl.includes('/checkpoint')) {
        result = { platform, success: false, message: 'Dialihkan ke halaman login / checkpoint LinkedIn' };
      } else {
        const check = await page.evaluate(() => {
          const hasFeed = !!document.querySelector('.share-box-feed-entry__trigger, .feed-identity-module, [data-view-name="feed-identity-module"]');
          const hasNav = !!document.querySelector('.global-nav');
          const profileName = document.querySelector('.feed-identity-module__actor-meta a, .identity-headline')?.innerText || null;
          return { isValid: hasFeed || hasNav, profileName };
        });

        if (check.isValid) {
          result = {
            platform,
            success: true,
            username: check.profileName ? check.profileName.trim() : 'Sesi Aktif',
            message: check.profileName ? `Login aktif sebagai ${check.profileName.trim()}` : 'Sesi LinkedIn aktif & terverifikasi'
          };
        } else {
          result = { platform, success: false, message: 'Sesi LinkedIn kedaluwarsa' };
        }
      }

    } else if (normPlatform === 'instagram') {
      console.log('[Live Check] Testing Instagram session...');
      await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login')) {
        result = { platform, success: false, message: 'Dialihkan ke form login Instagram' };
      } else {
        const check = await page.evaluate(() => {
          const hasLoginForm = !!document.querySelector('input[name="username"]');
          const svgs = Array.from(document.querySelectorAll('svg[aria-label]'));
          const hasCreate = svgs.some(s => {
            const aria = (s.getAttribute('aria-label') || '').toLowerCase();
            return aria.includes('new post') || aria.includes('postingan baru') || aria.includes('create') || aria.includes('buat');
          });
          const hasNav = !!document.querySelector('nav, a[href*="/direct/inbox"]');
          return { isValid: (hasCreate || hasNav) && !hasLoginForm };
        });

        if (check.isValid) {
          result = { platform, success: true, message: 'Sesi Instagram aktif & siap posting foto/video' };
        } else {
          result = { platform, success: false, message: 'Sesi Instagram tidak aktif atau kedaluwarsa' };
        }
      }

    } else if (normPlatform === 'tiktok') {
      console.log('[Live Check] Testing TikTok session...');
      await page.goto('https://www.tiktok.com/tiktokstudio/upload?lang=en', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        result = { platform, success: false, message: 'Dialihkan ke halaman login TikTok Studio' };
      } else {
        const check = await page.evaluate(() => {
          const hasUploadArea = !!document.querySelector('input[type="file"], .upload-btn, [data-testid="upload-video-btn"]');
          const hasBody = !document.body?.innerText?.includes('Log in to TikTok');
          return hasUploadArea || hasBody;
        });

        if (check) {
          result = { platform, success: true, message: 'Sesi TikTok Studio aktif & siap upload video' };
        } else {
          result = { platform, success: false, message: 'Sesi TikTok Studio kedaluwarsa' };
        }
      }

    } else if (normPlatform === 'youtube') {
      console.log('[Live Check] Testing YouTube Studio session...');
      await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
        result = { platform, success: false, message: 'Dialihkan ke form login Akun Google' };
      } else {
        const check = await page.evaluate(() => {
          const hasCreateBtn = !!document.querySelector('ytcp-button#create-icon, #create-icon, ytcp-button:has-text("Create")');
          const hasStudio = !!document.querySelector('ytcp-app, #channel-title');
          return hasCreateBtn || hasStudio;
        });

        if (check) {
          result = { platform, success: true, message: 'Sesi YouTube Studio aktif & siap upload' };
        } else {
          result = { platform, success: false, message: 'Sesi Google / YouTube Studio tidak aktif' };
        }
      }
    }

    result.checkedAt = new Date().toISOString();
    return result;

  } catch (err) {
    return {
      platform,
      success: false,
      message: 'Gagal verifikasi: ' + err.message,
      checkedAt: new Date().toISOString()
    };
  } finally {
    await context.close().catch(() => {});
  }
}
