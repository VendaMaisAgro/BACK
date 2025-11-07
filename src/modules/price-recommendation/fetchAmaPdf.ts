import puppeteer from 'puppeteer';
import axios     from 'axios';

export async function fetchTodayCotacaoPdf(): Promise<string | null> {
  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  const listUrl =
    'https://www.juazeiro.ba.gov.br/category/autarquia-municipal-de-abastecimento-ama/';

  await page.goto(listUrl, { waitUntil: 'networkidle2' });

  // 1) encontra o link para a notícia de "cotação"
  const cotacaoUrl = await page.evaluate(() => {
    const regex = /cotação/i;
    const a = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
                   .find(x => regex.test(x.textContent || ''));
    return a?.href || null;
  });
  if (!cotacaoUrl) {
    await browser.close();
    return null;
  }

  await page.goto(cotacaoUrl, { waitUntil: 'networkidle2' });

  // 2) coleta todos os hrefs que terminam em .pdf e estejam em uploads
  const candidates: string[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
      .map(a => a.href)
      .filter(h => /\.pdf(\?.*)?$/i.test(h) &&
                  h.includes('/wp-content/uploads/'));
  });

  await browser.close();

  // 3) testa cada candidato até achar um que exista de verdade
  for (const pdfUrl of candidates) {
    try {
      const head = await axios.head(pdfUrl);
      if (head.status === 200) {
        return pdfUrl;
      }
    } catch {
      // ignora 404s e segue pro próximo
    }
  }

  // nenhum funcionou
  return null;
}
