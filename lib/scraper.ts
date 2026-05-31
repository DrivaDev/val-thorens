import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const EMAIL_PRIORITY = ['contact', 'rh', 'info', 'jobs', 'recrutement', 'emploi', 'saison'];

export async function scrapeEmail(url: string): Promise<string | null> {
  // T-02-02-01: validar esquema antes de pasarlo a Puppeteer
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(`[scraper] URL inválida (esquema no-HTTP rechazado): ${url}`);
    return null;
  }

  // CRÍTICO para serverless: deshabilitar gráficos antes de lanzar el browser
  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
    );

    // SCRP-01: abrir el website del empleador
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // SCRP-02: extraer emails de la homepage
    const emails = await extractEmails(page);
    if (emails.length > 0) return prioritizeEmail(emails); // SCRP-03

    // SCRP-04: fallback — intentar /contact y /recrutement
    for (const path of ['/contact', '/recrutement']) {
      try {
        const fallbackUrl = new URL(path, url).href;
        await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const more = await extractEmails(page);
        if (more.length > 0) return prioritizeEmail(more); // SCRP-03
      } catch {
        // continuar con el siguiente path de fallback — no abortar
      }
    }

    return null; // SCRP-05: sin email encontrado — el caller marca como skipped
  } finally {
    // CRÍTICO: SIEMPRE cerrar el browser — evitar zombie processes en serverless (Pitfall 1)
    await browser.close();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractEmails(page: any): Promise<string[]> {
  return page.evaluate(() => {
    // WR-06: usar Set con normalización lowercase para deduplicar correctamente
    const seen = new Set<string>();

    // Extraer de mailto: links
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const email = (a as HTMLAnchorElement).href
        .replace('mailto:', '')
        .split('?')[0]
        .trim();
      if (email && email.includes('@')) seen.add(email.toLowerCase());
    });

    // Extraer por regex en el texto de la página
    const text = document.body?.innerText || '';
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    matches.forEach((e: string) => seen.add(e.toLowerCase()));

    return Array.from(seen);
  });
}

function prioritizeEmail(emails: string[]): string {
  // SCRP-03: priorizar por prefijos de mayor relevancia
  const sorted = [...emails].sort((a, b) => {
    const prefixA = a.split('@')[0].toLowerCase();
    const prefixB = b.split('@')[0].toLowerCase();
    const ai = EMAIL_PRIORITY.findIndex((p) => prefixA.includes(p));
    const bi = EMAIL_PRIORITY.findIndex((p) => prefixB.includes(p));
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return sorted[0];
}
