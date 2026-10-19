import fs from 'fs';
import path from 'path';

export function loadCookies(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cookie file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const cookies = JSON.parse(raw);

  // Normalisasi format cookie agar kompatibel dengan Playwright
  return cookies.map(c => {
    const cookie = {
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
    };

    // sameSite normalization
    if (c.sameSite) {
      const s = c.sameSite.toLowerCase();
      if (s === 'no_restriction' || s === 'none') cookie.sameSite = 'None';
      else if (s === 'lax') cookie.sameSite = 'Lax';
      else if (s === 'strict') cookie.sameSite = 'Strict';
    }

    if (c.expirationDate) {
      cookie.expires = Math.floor(c.expirationDate);
    }

    return cookie;
  });
}
