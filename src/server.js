import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import multer from 'multer';
import { postToThreads } from './platforms/threads.js';
import { postToTwitter } from './platforms/twitter.js';
import { postToFacebook } from './platforms/facebook.js';
import { postToFacebookPage } from './platforms/facebook-page.js';
import { postToInstagram } from './platforms/instagram.js';
import { postToTikTok } from './platforms/tiktok.js';
import { postToLinkedIn } from './platforms/linkedin.js';
import { postToYouTube } from './platforms/youtube.js';
import { generateAIText, generateAIImage, getAIConfig, saveAIConfig, testAIConnection } from './utils/ai-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const COOKIES_DIR = path.join(ROOT_DIR, 'cookies');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const HISTORY_FILE = path.join(ROOT_DIR, 'history.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // max 100MB
});

const app = express();
const PORT = 3456;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Read history
function getHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// Helper: Save history
function saveHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > 50) history.pop(); // keep last 50
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// 1. API: Cek status cookie akun
app.get('/api/status', (req, res) => {
  const platforms = ['threads', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'youtube'];
  const status = {};

  platforms.forEach(p => {
    const file = path.join(COOKIES_DIR, `${p}.json`);
    const exists = fs.existsSync(file);
    let count = 0;
    let updatedAt = null;

    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        count = Array.isArray(data) ? data.length : 0;
        const stat = fs.statSync(file);
        updatedAt = stat.mtime;
      } catch {
        count = 0;
      }
    }

    status[p] = {
      connected: exists && count > 0,
      cookieCount: count,
      updatedAt
    };
  });

  // facebook_page shares the facebook.json cookie
  status['facebook_page'] = {
    connected: status['facebook'].connected,
    cookieCount: status['facebook'].cookieCount,
    updatedAt: status['facebook'].updatedAt,
    pageName: 'Webme Studio'
  };

  res.json({ success: true, platforms: status, history: getHistory() });
});

// 2. API: Simpan / Update Cookie
app.post('/api/cookie/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const { cookies } = req.body;

  if (!['threads', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'youtube'].includes(platform)) {
    return res.status(400).json({ error: 'Platform tidak valid' });
  }

  try {
    let parsed = typeof cookies === 'string' ? JSON.parse(cookies) : cookies;
    if (!Array.isArray(parsed)) {
      return res.status(400).json({ error: 'Format cookie harus berupa array JSON' });
    }

    if (!fs.existsSync(COOKIES_DIR)) {
      fs.mkdirSync(COOKIES_DIR, { recursive: true });
    }

    const filePath = path.join(COOKIES_DIR, `${platform}.json`);
    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
    res.json({ success: true, message: `Cookie ${platform} berhasil disimpan!` });
  } catch (err) {
    res.status(400).json({ error: 'JSON Cookie tidak valid: ' + err.message });
  }
});

// 3. API: Hapus Cookie
app.delete('/api/cookie/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const filePath = path.join(COOKIES_DIR, `${platform}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ success: true, message: `Cookie ${platform} berhasil dihapus` });
});

// 3a1. API: Ambil Konfigurasi AI
app.get('/api/ai/config', (req, res) => {
  try {
    const config = getAIConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca konfigurasi AI: ' + err.message });
  }
});

// 3a2. API: Simpan Konfigurasi AI
app.post('/api/ai/config', (req, res) => {
  try {
    const { textProvider, imageProvider, customText, customImage } = req.body;
    const updated = saveAIConfig({ textProvider, imageProvider, customText, customImage });
    res.json({ success: true, message: 'Konfigurasi AI berhasil disimpan!', config: updated });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan konfigurasi AI: ' + err.message });
  }
});

// 3a3. API: Test Koneksi AI
app.post('/api/ai/test', async (req, res) => {
  try {
    const { type, config } = req.body;
    const result = await testAIConnection({ type, config });
    res.json(result);
  } catch (err) {
    console.error('[AI Test Error]', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3b. API: AI Generate Text
app.post('/api/ai/text', async (req, res) => {
  const { topic, style, platform, includeHashtags = true, includeEmoji = true } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topik postingan wajib diisi' });
  }

  try {
    const text = await generateAIText({
      topic,
      style,
      platform,
      includeHashtags: includeHashtags !== false,
      includeEmoji: includeEmoji !== false
    });
    res.json({ success: true, text });
  } catch (err) {
    console.error('[AI Text Error]', err.message);
    res.status(500).json({ error: 'Gagal membuat teks AI: ' + err.message });
  }
});

// 3c. API: AI Generate Image
app.post('/api/ai/image', async (req, res) => {
  const { prompt, style = 'Photorealistic', aspectRatio = '1:1' } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Deskripsi gambar (prompt) wajib diisi' });
  }

  try {
    const imgData = await generateAIImage({
      prompt,
      style,
      aspectRatio,
      outputDir: UPLOADS_DIR
    });
    res.json({ success: true, ...imgData });
  } catch (err) {
    console.error('[AI Image Error]', err.message);
    res.status(500).json({ error: 'Gagal membuat gambar AI: ' + err.message });
  }
});

// 3d. API: AI Generate Bundle (Teks + Gambar Sekaligus)
app.post('/api/ai/bundle', async (req, res) => {
  const { topic, textStyle, imageStyle = 'Photorealistic', aspectRatio = '1:1', platform } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topik postingan wajib diisi' });
  }

  try {
    const [text, imgData] = await Promise.all([
      generateAIText({ topic, style: textStyle, platform }),
      generateAIImage({ prompt: topic, style: imageStyle, aspectRatio, outputDir: UPLOADS_DIR })
    ]);

    res.json({
      success: true,
      text,
      ...imgData
    });
  } catch (err) {
    console.error('[AI Bundle Error]', err.message);
    res.status(500).json({ error: 'Gagal membuat konten AI bundle: ' + err.message });
  }
});

// 4. API: Publish Postingan
app.post('/api/publish', upload.single('media'), async (req, res) => {
  let { text = '', link = '', platforms, headless = true, mediaPath } = req.body;

  if (typeof platforms === 'string') {
    try {
      platforms = JSON.parse(platforms);
    } catch {
      platforms = platforms.split(',').map(s => s.trim().toLowerCase());
    }
  }

  if (req.file) {
    mediaPath = req.file.path;
  }

  if (link && !text.includes(link)) {
    text = text ? `${text}\n\n${link}` : link;
  }

  if ((!text && !mediaPath) || !platforms || platforms.length === 0) {
    return res.status(400).json({ error: 'Konten (teks / media) dan minimal satu platform wajib dipilih' });
  }

  console.log(`[API Publish] Starting publish to: ${platforms.join(', ')}`);
  if (mediaPath) console.log(`[API Publish] Media attached: ${mediaPath}`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: !!headless,
      channel: 'msedge'
    }).catch(() => chromium.launch({ headless: !!headless }));
  } catch (err) {
    return res.status(500).json({ error: 'Gagal membuka browser: ' + err.message });
  }

  const results = [];

  for (const p of platforms) {
    const isFbPage = p === 'facebook_page' || p === 'fb_page';
    const isMediaPlatform = p === 'instagram' || p === 'ig' || p === 'tiktok' || p === 'tt' || p === 'youtube' || p === 'yt';

    if (isMediaPlatform && !mediaPath) {
      results.push({ platform: p, success: false, error: 'Memerlukan lampiran file foto atau video (tidak mendukung teks saja)' });
      continue;
    }

    const cookieFile = isFbPage ? 'facebook.json' : `${p}.json`;
    const cookiePath = path.join(COOKIES_DIR, cookieFile);
    if (!fs.existsSync(cookiePath)) {
      results.push({ platform: p, success: false, error: 'Cookie belum terpasang' });
      continue;
    }

    try {
      if (p === 'threads') {
        const r = await postToThreads(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (p === 'twitter' || p === 'x') {
        const r = await postToTwitter(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (p === 'facebook') {
        const r = await postToFacebook(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (isFbPage) {
        const r = await postToFacebookPage(browser, cookiePath, text, 'Webme Studio', mediaPath);
        results.push(r);
      } else if (p === 'instagram' || p === 'ig') {
        const r = await postToInstagram(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (p === 'tiktok' || p === 'tt') {
        const r = await postToTikTok(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (p === 'linkedin' || p === 'li') {
        const r = await postToLinkedIn(browser, cookiePath, text, mediaPath);
        results.push(r);
      } else if (p === 'youtube' || p === 'yt') {
        const r = await postToYouTube(browser, cookiePath, text, mediaPath);
        results.push(r);
      }
    } catch (err) {
      results.push({ platform: p, success: false, error: err.message });
    }
  }

  await browser.close();

  const historyEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    text,
    link: link || null,
    hasMedia: !!mediaPath,
    mediaName: req.file ? req.file.originalname : (mediaPath ? path.basename(mediaPath) : null),
    platforms,
    results
  };
  saveHistory(historyEntry);

  res.json({ success: true, results, historyEntry });
});

app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🌐 SocialHub Web Dashboard Aktif!`);
  console.log(`Akses URL: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
