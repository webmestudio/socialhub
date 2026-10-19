import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { postToThreads } from './platforms/threads.js';
import { postToTwitter } from './platforms/twitter.js';
import { postToFacebook } from './platforms/facebook.js';
import { postToFacebookPage } from './platforms/facebook-page.js';
import { postToInstagram } from './platforms/instagram.js';
import { postToTikTok } from './platforms/tiktok.js';
import { postToLinkedIn } from './platforms/linkedin.js';
import { postToYouTube } from './platforms/youtube.js';
import { generateAIText, generateAIImage } from './utils/ai-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const COOKIES_DIR = path.join(ROOT_DIR, 'cookies');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

async function main() {
  const args = process.argv.slice(2);
  let text = '';
  let link = '';
  let mediaPath = null;
  let targetPlatforms = [];
  let userSpecifiedPlatforms = false;
  let headless = true;
  let aiTopic = null;
  let aiImagePrompt = null;
  let aiBundle = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' || args[i] === '-t') {
      text = args[++i];
    } else if (args[i] === '--link' || args[i] === '-l') {
      link = args[++i];
    } else if (args[i] === '--media' || args[i] === '-m') {
      mediaPath = path.resolve(args[++i]);
    } else if (args[i] === '--platforms' || args[i] === '-p') {
      targetPlatforms = args[++i].split(',').map(s => s.trim().toLowerCase());
      userSpecifiedPlatforms = true;
    } else if (args[i] === '--no-headless' || args[i] === '--visible') {
      headless = false;
    } else if (args[i] === '--ai-text') {
      aiTopic = args[++i];
    } else if (args[i] === '--ai-image') {
      aiImagePrompt = args[++i];
    } else if (args[i] === '--ai-bundle') {
      aiBundle = args[++i];
    }
  }

  // Handle AI generation if requested via CLI flags
  if (aiBundle) {
    console.log(`[AI] Generating complete package (text + image) for: "${aiBundle}" ...`);
    const [genText, imgData] = await Promise.all([
      generateAIText({ topic: aiBundle }),
      generateAIImage({ prompt: aiBundle, outputDir: UPLOADS_DIR })
    ]);
    text = genText;
    mediaPath = imgData.filePath;
    console.log('[AI] Text & Image generated successfully!');
  } else {
    if (aiTopic) {
      console.log(`[AI] Generating text for: "${aiTopic}" ...`);
      text = await generateAIText({ topic: aiTopic });
      console.log('[AI] Text generated successfully!');
    }
    if (aiImagePrompt) {
      console.log(`[AI] Generating image for: "${aiImagePrompt}" ...`);
      const imgData = await generateAIImage({ prompt: aiImagePrompt, outputDir: UPLOADS_DIR });
      mediaPath = imgData.filePath;
      console.log('[AI] Image generated successfully:', imgData.fileName);
    }
  }

  // Jika user tidak menentukan platform secara eksplisit:
  if (!userSpecifiedPlatforms) {
    if (mediaPath) {
      // Jika ada media, targetkan semua platform termasuk Instagram, TikTok, dan YouTube
      targetPlatforms = ['threads', 'twitter', 'facebook', 'linkedin', 'instagram', 'tiktok', 'youtube'];
    } else {
      // Jika teks murni, hanya targetkan platform teks
      targetPlatforms = ['threads', 'twitter', 'facebook', 'linkedin'];
      console.log('\n[Info] Mode Teks Murni: Instagram, TikTok & YouTube otomatis dilewati (memerlukan media foto/video).');
    }
  }

  if (link && !text.includes(link)) {
    text = text ? `${text}\n\n${link}` : link;
  }

  if (!text && !mediaPath) {
    console.log(`
Penggunaan:
  node src/cli.js [--text "Teks"] [--media "path/gambar.png"] [--link "https://..."] [--platforms threads,instagram,...] [--visible]
  node src/cli.js --ai-text "Topik postingan"
  node src/cli.js --ai-image "Deskripsi gambar"
  node src/cli.js --ai-bundle "Topik postingan" (Teks + Gambar Sekaligus)

Contoh:
  node src/cli.js --ai-bundle "Tips memilih laptop programmer" --platforms threads,instagram,linkedin
  node src/cli.js --ai-text "Motivasi kerja pagi hari" --platforms threads,facebook
`);
    process.exit(1);
  }

  console.log(`\n===========================================`);
  console.log(`🚀 SocialHub Publisher Starting...`);
  console.log(`Target Platforms: ${targetPlatforms.join(', ')}`);
  console.log(`Headless Mode   : ${headless}`);
  if (mediaPath) console.log(`Media File      : ${mediaPath}`);
  console.log(`Content:\n"${text}"`);
  console.log(`===========================================\n`);

  const browser = await chromium.launch({
    headless: headless,
    channel: 'msedge' // Menggunakan Microsoft Edge bawaan OS jika tersedia
  }).catch(() => {
    // Fallback ke chromium standar
    return chromium.launch({ headless: headless });
  });

  const results = [];

  for (const platform of targetPlatforms) {
    const isFbPage = platform === 'facebook_page' || platform === 'fb_page' || platform === 'page';
    const isMediaPlatform = platform === 'instagram' || platform === 'ig' || platform === 'tiktok' || platform === 'tt' || platform === 'youtube' || platform === 'yt';

    if (isMediaPlatform && !mediaPath) {
      console.warn(`[Skip] ${platform.toUpperCase()} memerlukan file media foto/video. Gunakan parameter --media "path/file" untuk posting ke platform ini.`);
      results.push({ success: false, platform, error: 'Memerlukan file media foto/video (tidak mendukung teks saja)' });
      continue;
    }

    const cookieFileName = isFbPage ? 'facebook.json' : `${platform}.json`;
    const cookiePath = path.join(COOKIES_DIR, cookieFileName);
    if (!fs.existsSync(cookiePath)) {
      console.warn(`[Skip] Cookie untuk ${platform} belum ada di: ${cookiePath}`);
      continue;
    }

    try {
      if (platform === 'threads') {
        const res = await postToThreads(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (platform === 'twitter' || platform === 'x') {
        const res = await postToTwitter(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (platform === 'facebook') {
        const res = await postToFacebook(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (isFbPage) {
        const res = await postToFacebookPage(browser, cookiePath, text, 'Webme Studio', mediaPath);
        results.push(res);
      } else if (platform === 'instagram' || platform === 'ig') {
        const res = await postToInstagram(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (platform === 'tiktok' || platform === 'tt') {
        const res = await postToTikTok(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (platform === 'linkedin' || platform === 'li') {
        const res = await postToLinkedIn(browser, cookiePath, text, mediaPath);
        results.push(res);
      } else if (platform === 'youtube' || platform === 'yt') {
        const res = await postToYouTube(browser, cookiePath, text, mediaPath);
        results.push(res);
      }
    } catch (err) {
      console.error(`[Error] Eksekusi ${platform} gagal:`, err.message);
      results.push({ success: false, platform, error: err.message });
    }
  }

  await browser.close();

  console.log(`\n--- Ringkasan Hasil Posting ---`);
  console.table(results);
}

main().catch(console.error);
