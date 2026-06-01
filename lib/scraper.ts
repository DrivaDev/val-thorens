const EMAIL_PRIORITY = ['contact', 'rh', 'info', 'jobs', 'recrutement', 'emploi', 'saison'];
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function extractEmails(html: string): string[] {
  const seen = new Set<string>();

  // mailto: links
  const mailtoRe = /href="mailto:([^"?]+)/gi;
  let mailtoMatch: RegExpExecArray | null;
  while ((mailtoMatch = mailtoRe.exec(html)) !== null) {
    const email = mailtoMatch[1].trim().toLowerCase();
    if (email.includes('@')) seen.add(email);
  }

  // regex over full HTML (catches obfuscated text too)
  const regexMatches = html.match(EMAIL_REGEX) ?? [];
  for (const email of regexMatches) {
    seen.add(email.toLowerCase());
  }

  const FAKE_DOMAINS = ['example.com', 'example.org', 'domain.com', 'yourdomain.com',
    'test.com', 'email.com', 'mail.com', 'website.com', 'site.com', 'yoursite.com',
    'sentry.io', 'wixpress.com', 'squarespace.com', 'sendgrid.net', 'mailchimp.com',
    'no-reply.com', 'noreply.com'];
  const FAKE_LOCALS = ['email', 'yourname', 'name', 'username', 'user', 'test',
    'webmaster', 'placeholder', 'exemple', 'votrenom', 'votre-email'];

  return Array.from(seen).filter((e) => {
    if (!e.includes('@') || e.length > 80) return false;
    if (e.endsWith('.png') || e.endsWith('.jpg') || e.endsWith('.svg') || e.endsWith('.gif')) return false;
    const [local, domain] = e.split('@');
    if (!domain) return false;
    if (FAKE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return false;
    if (FAKE_LOCALS.includes(local)) return false;
    return true;
  });
}

function prioritizeEmail(emails: string[]): string {
  const sorted = Array.from(emails).sort((a, b) => {
    const pa = a.split('@')[0].toLowerCase();
    const pb = b.split('@')[0].toLowerCase();
    const ai = EMAIL_PRIORITY.findIndex((p) => pa.includes(p));
    const bi = EMAIL_PRIORITY.findIndex((p) => pb.includes(p));
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return sorted[0];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function scrapeEmail(url: string): Promise<string | null> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  // try homepage
  const html = await fetchHtml(url);
  if (html) {
    const emails = extractEmails(html);
    if (emails.length > 0) return prioritizeEmail(emails);
  }

  // fallback: try /contact and /recrutement
  for (const path of ['/contact', '/recrutement', '/nous-contacter', '/contact-us']) {
    try {
      const fallbackUrl = new URL(path, url).href;
      const fallbackHtml = await fetchHtml(fallbackUrl);
      if (fallbackHtml) {
        const emails = extractEmails(fallbackHtml);
        if (emails.length > 0) return prioritizeEmail(emails);
      }
    } catch {
      // continue
    }
  }

  return null;
}
