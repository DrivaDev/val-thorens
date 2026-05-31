import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeEmail } from '@/lib/scraper';

export async function POST(request: Request) {
  // CR-02: autenticar antes de lanzar Puppeteer
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let url: string;

  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validar esquema URL para prevenir SSRF (T-02-04-02)
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL — must be http or https' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const email = await scrapeEmail(url);
    return new Response(JSON.stringify({ email }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
