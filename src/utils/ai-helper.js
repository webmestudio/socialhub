import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const CONFIG_FILE = path.join(ROOT_DIR, 'ai-config.json');

/**
 * Mengambil konfigurasi AI saat ini (default atau custom)
 */
export function getAIConfig() {
  const defaultConfig = {
    textProvider: 'default', // 'default' | 'custom'
    imageProvider: 'default', // 'default' | 'custom'
    customText: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      temperature: 0.7
    },
    customImage: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'dall-e-3'
    }
  };

  if (!fs.existsSync(CONFIG_FILE)) {
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      textProvider: parsed.textProvider || 'default',
      imageProvider: parsed.imageProvider || 'default',
      customText: {
        ...defaultConfig.customText,
        ...(parsed.customText || {})
      },
      customImage: {
        ...defaultConfig.customImage,
        ...(parsed.customImage || {})
      }
    };
  } catch (err) {
    console.warn('[AI Config] Gagal membaca ai-config.json, menggunakan default:', err.message);
    return defaultConfig;
  }
}

/**
 * Menyimpan konfigurasi AI baru ke ai-config.json
 */
export function saveAIConfig(newConfig) {
  const current = getAIConfig();
  const merged = {
    textProvider: newConfig.textProvider || current.textProvider,
    imageProvider: newConfig.imageProvider || current.imageProvider,
    customText: {
      ...current.customText,
      ...(newConfig.customText || {})
    },
    customImage: {
      ...current.customImage,
      ...(newConfig.customImage || {})
    }
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

/**
 * Uji koneksi ke API AI (Text atau Image)
 */
export async function testAIConnection({ type = 'text', config = null }) {
  const effectiveConfig = config || getAIConfig();

  if (type === 'text') {
    if (effectiveConfig.textProvider === 'custom') {
      const { baseUrl, apiKey, model } = effectiveConfig.customText || {};
      if (!baseUrl) throw new Error('Base URL wajib diisi');
      const cleanUrl = baseUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/chat/completions`;

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey && apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [
              { role: 'user', content: 'Halo! Mohon jawab singkat dalam 1 kalimat: "Koneksi API AI kustom berhasil terhubung!"' }
            ],
            max_tokens: 60
          })
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || 'Koneksi berhasil!';
        return {
          success: true,
          message: 'Koneksi Custom Text API Berhasil!',
          preview: reply,
          model: model || 'gpt-4o-mini'
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Permintaan ke API timeout (20 detik). Periksa Base URL Anda.');
        }
        throw err;
      }
    } else {
      // Default Pollinations text test
      const testUrl = `https://text.pollinations.ai/${encodeURIComponent('Katakan singkat: Koneksi Default AI Berhasil!')}?model=openai`;
      const response = await fetch(testUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      return {
        success: true,
        message: 'Koneksi Default AI (Pollinations) Berhasil!',
        preview: text.trim().slice(0, 150),
        model: 'openai (Pollinations Free)'
      };
    }
  } else if (type === 'image') {
    if (effectiveConfig.imageProvider === 'custom') {
      const { baseUrl, apiKey, model } = effectiveConfig.customImage || {};
      if (!baseUrl) throw new Error('Base URL gambar wajib diisi');
      if (!apiKey || !apiKey.trim()) throw new Error('API Key untuk custom image wajib diisi');

      const cleanUrl = baseUrl.replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/images/generations`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: model || 'dall-e-3',
            prompt: 'A tiny cute green checkmark icon, minimalist 3d render',
            n: 1,
            size: '1024x1024'
          })
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
        }

        const data = await response.json();
        return {
          success: true,
          message: 'Koneksi Custom Image API Berhasil!',
          preview: data.data?.[0]?.url || 'Image generated',
          model: model || 'dall-e-3'
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Permintaan ke API timeout (35 detik).');
        }
        throw err;
      }
    } else {
      // Default Pollinations image test
      const testUrl = `https://image.pollinations.ai/prompt/test?width=64&height=64&nologo=true&model=flux`;
      const response = await fetch(testUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        success: true,
        message: 'Koneksi Default Image AI (Flux) Berhasil!',
        preview: 'Flux Engine siap digunakan',
        model: 'flux (Pollinations Free)'
      };
    }
  }

  throw new Error('Tipe testing tidak valid');
}

/**
 * Helper untuk menghapus watermark di bagian bawah gambar secara otomatis
 */
async function cleanImageWatermark(imageBuffer) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge'
    }).catch(() => chromium.launch({ headless: true }));

    const page = await browser.newPage();
    const base64 = imageBuffer.toString('base64');
    await page.setContent(`
      <img id="source" src="data:image/jpeg;base64,${base64}" />
      <canvas id="cvs"></canvas>
    `);

    const cleanedBase64 = await page.evaluate(() => {
      const img = document.getElementById('source');
      const cvs = document.getElementById('cvs');
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Potong margin watermark 4.8% di bagian paling bawah
      const cropH = Math.floor(h * 0.952);
      cvs.width = w;
      cvs.height = cropH;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0, w, cropH, 0, 0, w, cropH);
      return cvs.toDataURL('image/jpeg', 0.96);
    });

    await browser.close();
    return Buffer.from(cleanedBase64.split(',')[1], 'base64');
  } catch (err) {
    if (browser) await browser.close();
    return imageBuffer; // Fallback ke buffer asli jika terjadi kendala
  }
}

/**
 * Generate teks postingan media sosial menggunakan AI (Default atau Custom API)
 */
export async function generateAIText({
  topic,
  style = 'Santai & Menarik',
  platform = 'umum',
  includeHashtags = true,
  includeEmoji = true,
  configOverride = null
}) {
  if (!topic || !topic.trim()) {
    throw new Error('Topik atau ide postingan wajib diisi');
  }

  let styleGuide = `Gaya penulisan / nada bicara: ${style}.`;
  if (style.includes('Anak IT') || style.includes('Programmer') || style.includes('Developer')) {
    styleGuide = `Gaya penulisan: Anak IT / Programmer / Software Engineer sejati. Gunakan istilah khas dunia developer (bug, debugging, production, clean code, git commit, framework, kopi, deploy jumat, error 500, stackoverflow). Tuliskan dengan gaya yang sangat relatable, cerdas, sedikit humoris atau bernas, dan memicu interaksi sesama tech enthusiast.`;
  } else if (style.includes('Tech Lead') || style.includes('Engineering')) {
    styleGuide = `Gaya penulisan: Tech Lead / Senior Software Engineer. Berikan wawasan mendalam seputar software architecture, scalability, clean code, system design, dan best practice rekayasa perangkat lunak secara berbobot dan profesional.`;
  }

  const systemInstruction = `Kamu adalah social media copywriter profesional dan tech creator berbahasa Indonesia.
Tugasmu adalah membuat caption atau status postingan media sosial yang sangat menarik, engaging, memiliki hook di awal, dan enak dibaca.
Target platform: ${platform}.
${styleGuide}
Gunakan emoji yang relevan: ${includeEmoji ? 'Ya' : 'Tidak'}.
Sertakan hashtag (#) yang populer dan relevan di akhir: ${includeHashtags ? 'Ya (3-6 hashtag)' : 'Tidak'}.
Aturan: Berikan HANYA teks postingan final yang siap di-publish, tanpa basa-basi pengantar seperti "Berikut adalah...", tanpa tanda kutip pembuka/penutup.`;

  const config = configOverride || getAIConfig();

  // 1. Custom OpenAI-Compatible API
  if (config.textProvider === 'custom') {
    const { baseUrl, apiKey, model, temperature } = config.customText || {};
    if (!baseUrl) throw new Error('Base URL Custom API belum diatur');
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/chat/completions`;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    console.log(`[AI Text] Menggunakan Custom API (${model || 'gpt-4o-mini'}) di ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Topik postingan: ${topic}` }
        ],
        temperature: typeof temperature === 'number' ? temperature : 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom API Error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = text.trim().replace(/^["']|["']$/g, '');
    return text;
  }

  // 2. Default Pollinations AI (Bebas Kuota, Tanpa API Key)
  console.log(`[AI Text] Menggunakan Default Provider (Pollinations AI)`);
  const fullPrompt = `${systemInstruction}\n\nTopik postingan: ${topic}`;
  const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal menghasilkan teks AI (HTTP ${response.status})`);
  }

  let text = await response.text();
  text = text.trim().replace(/^["']|["']$/g, '');
  return text;
}

/**
 * Generate gambar postingan menggunakan AI (Default Flux atau Custom API)
 */
export async function generateAIImage({
  prompt,
  style = 'Photorealistic',
  aspectRatio = '1:1',
  outputDir,
  configOverride = null
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Deskripsi gambar (prompt) wajib diisi');
  }

  let width = 1024;
  let height = 1024;

  if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  }

  // Tambahkan enhancement keyword berdasarkan gaya
  let enhancedPrompt = prompt.trim();
  if (style.includes('Developer Desk') || style.includes('Workspace Aesthetic')) {
    enhancedPrompt += ', professional aesthetic programmer desk setup, dual monitors with code IDE in dark mode, mechanical keyboard with RGB glow, coffee mug, cozy ambient lighting, cable management, cinematic photography, 8k resolution';
  } else if (style.includes('Isometric 3D Tech')) {
    enhancedPrompt += ', isometric 3D view, miniature developer room, floating code symbols, database icons, modern tech gadgets, vibrant soft pastel lighting, blender 3d render, trending on artstation';
  } else if (style.includes('Pixel Art') || style.includes('Retro Tech')) {
    enhancedPrompt += ', nostalgic 16-bit pixel art, retro computer terminal, aesthetic vaporwave vibe, detailed pixelated illustration';
  } else if (style === 'Photorealistic') {
    enhancedPrompt += ', highly detailed photograph, realistic lighting, 8k resolution, professional photography';
  } else if (style === '3D Render / Digital Art') {
    enhancedPrompt += ', 3D digital art, octane render, vibrant lighting, smooth shading, masterpiece';
  } else if (style === 'Anime / Manga') {
    enhancedPrompt += ', anime artwork style, clean lineart, vivid colors, detailed background';
  } else if (style === 'Minimalist Vector') {
    enhancedPrompt += ', modern flat vector illustration, clean lines, minimalist design, aesthetic colors';
  } else if (style === 'Cyberpunk / Futuristic') {
    enhancedPrompt += ', futuristic cyberpunk aesthetic, neon lights, high tech, cinematic atmospheric glow';
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const config = configOverride || getAIConfig();

  // 1. Custom Image API (DALL-E / OpenAI Compatible)
  if (config.imageProvider === 'custom') {
    const { baseUrl, apiKey, model } = config.customImage || {};
    if (!baseUrl) throw new Error('Base URL Custom Image API belum diatur');
    if (!apiKey || !apiKey.trim()) throw new Error('API Key untuk Custom Image API belum diatur');

    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/images/generations`;

    let size = '1024x1024';
    if (aspectRatio === '9:16') size = '1024x1792';
    else if (aspectRatio === '16:9') size = '1792x1024';

    console.log(`[AI Image] Menggunakan Custom Image API (${model || 'dall-e-3'})`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model || 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size,
        response_format: 'b64_json'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom Image API Error (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    let buffer;
    if (data.data?.[0]?.b64_json) {
      buffer = Buffer.from(data.data[0].b64_json, 'base64');
    } else if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url);
      const arr = await imgRes.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      throw new Error('Format respon API gambar tidak dikenali.');
    }

    const fileName = `ai-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return {
      fileName,
      filePath,
      urlPath: `/uploads/${fileName}`,
      fileSize: buffer.length
    };
  }

  // 2. Default Pollinations Flux Engine (Bebas Kuota, Tanpa API Key)
  console.log(`[AI Image] Menggunakan Default Provider (Pollinations Flux)`);
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!response.ok) {
    throw new Error(`Gagal menghasilkan gambar AI (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  // Bersihkan watermark dari gambar secara otomatis
  console.log('[AI Image] Cleaning watermark from generated image...');
  buffer = await cleanImageWatermark(buffer);

  const fileName = `ai-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return {
    fileName,
    filePath,
    urlPath: `/uploads/${fileName}`,
    fileSize: buffer.length
  };
}
