import puppeteer, { Browser } from 'puppeteer';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { splitAgrolinkProduct } from './agrolinkName';

export type AgrolinkItem = {
  produto: string;
  name: string;        // apenas o nome
  unit: string | null; // unidade normalizada (ex.: "Cx 10 Kg") ou null
  local: string;
  preco: string;       // "62,80"
  data: string;        // "dd/mm/yyyy"
};

const URL_DEFAULT = 'https://www.agrolink.com.br/regional/ba/juazeiro/cotacoes';

/* ---------- utils locais ---------- */

function normalizePreco(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return '';
  if (/[.,]/.test(cleaned)) return cleaned.replace('.', ','); // 62.80 -> 62,80
  if (/^\d{3,}$/.test(cleaned)) {
    const intPart = cleaned.slice(0, -2);
    const decimal = cleaned.slice(-2);
    return `${parseInt(intPart, 10)},${decimal}`;
  }
  return cleaned;
}

async function ocrBuffer(buf: Buffer, scale = 3): Promise<string> {
  const pre = await sharp(buf)
    .grayscale()
    .threshold(180)
    .resize({ width: 48 * scale, height: 17 * scale, fit: 'fill' })
    .toBuffer();

  const opts: any = {
    tessedit_char_whitelist: '0123456789.,',
    preserve_interword_spaces: '1',
  };

  const { data } = await (Tesseract as any).recognize(pre, 'eng', opts);
  return normalizePreco((data.text || '').trim());
}

/* ------------------- coletor principal ------------------- */

export async function collectAgrolinkJuazeiro(url: string = URL_DEFAULT) {
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1200, deviceScaleFactor: 3 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.waitForSelector('table.table-main tbody tr', { timeout: 30_000 });

    const rows = await page.$$('table.table-main tbody tr');
    const out: AgrolinkItem[] = [];

    for (const tr of rows) {
      const tds = await tr.$$('td');
      if (tds.length < 4) continue;

      const produtoRaw = (await tr.$eval('td:nth-child(1)', el => el.textContent?.trim() || '')).replace(/\s+/g, ' ');
      const local = await tr.$eval('td:nth-child(2)', el => el.textContent?.trim() || '');
      const dataAtualizacao = await tr.$eval('td:nth-child(4)', el => el.textContent?.trim() || '');
      if (!/Juazeiro/i.test(local)) continue;

      const priceDiv = await tr.$('td:nth-child(3) div.text-right.float-right');
      if (!priceDiv) continue;

      const clip = await priceDiv.boundingBox();
      if (!clip) continue;

      const buf = (await page.screenshot({
        clip: { x: Math.max(clip.x, 0), y: Math.max(clip.y, 0), width: clip.width, height: clip.height },
      })) as Buffer;

      let preco = '';
      try {
        preco = await ocrBuffer(buf, 3);
      } catch {
        const buf2 = await sharp(buf).resize({ width: 48 * 4, height: 17 * 4, fit: 'fill' }).toBuffer();
        preco = await ocrBuffer(buf2, 4);
      }

      if (!preco) continue;

      const { name, unit } = splitAgrolinkProduct(produtoRaw);

      out.push({
        produto: produtoRaw,
        name,
        unit: unit ?? null,
        local,
        preco,
        data: dataAtualizacao,
      });
    }

    return out;
  } finally {
    await browser.close();
  }
}
