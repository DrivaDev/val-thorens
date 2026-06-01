import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { discoverEmployers } from '@/lib/places';
import { scrapeEmail } from '@/lib/scraper';
import { sendEmail } from '@/lib/gmail';
import { logToSheets } from '@/lib/sheets';
import { categorizeEmployer } from '@/lib/rubros';

const encoder = new TextEncoder();

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accessToken = (session as { access_token?: string; user?: { email?: string } }).access_token;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token in session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fromEmail = session.user?.email;
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: 'Session user email not available' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    name: string;
    cvBase64: string;
    jobTypes: string[];
    languages: { language: string; level: string }[];
    hasEUPassport: boolean;
    template: string;
    subject: string;
    cartas: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, cvBase64, template, subject, cartas } = body;

  if (!name || !cvBase64 || !template) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, cvBase64, template' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (name.length > 100) {
    return new Response(JSON.stringify({ error: 'Field too long: name (max 100)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cvBase64Data = cvBase64.includes(',') ? cvBase64.split(',')[1] : cvBase64;

  const stream = new ReadableStream({
    async start(controller) {
      let sentCount = 0;
      let skippedCount = 0;

      try {
        controller.enqueue(sseEvent({ type: 'searching', message: 'Buscando empleadores en Val Thorens...' }));

        const employers = await discoverEmployers();

        // Filtrar por rubro seleccionado
        const selectedRubro = body.jobTypes?.[0] ?? null;
        const filtered = selectedRubro
          ? employers.filter(e => categorizeEmployer(e.types, e.name) === selectedRubro)
          : employers;

        const withWebsite = filtered.filter(e => e.website).length;
        controller.enqueue(sseEvent({ type: 'discovery_complete', total: filtered.length, withWebsite }));

        for (const employer of filtered) {
          try {
            if (sentCount > 0) await sleep(4000);

            if (!employer.website) {
              skippedCount++;
              controller.enqueue(sseEvent({ type: 'scraping', employer: employer.name, email: null }));
              continue;
            }

            const email = await scrapeEmail(employer.website);
            controller.enqueue(sseEvent({ type: 'scraping', employer: employer.name, email }));

            if (!email) {
              skippedCount++;
              continue;
            }

            controller.enqueue(sseEvent({ type: 'generating', employer: employer.name }));

            const rubro = categorizeEmployer(employer.types, employer.name);
            const emailBody = template
              .replace(/\[EMPLEADOR\]/g, employer.name)
              .replace(/\[RUBRO\]/g, rubro);

            const cartaBase64Raw = cartas?.[rubro] ?? null;
            const coverLetterBase64 = cartaBase64Raw
              ? (cartaBase64Raw.includes(',') ? cartaBase64Raw.split(',')[1] : cartaBase64Raw)
              : undefined;

            await sendEmail({
              accessToken,
              to: email,
              subject,
              body: emailBody,
              cvBase64: cvBase64Data,
              cvFilename: 'CV.pdf',
              fromEmail,
              ...(coverLetterBase64 ? {
                coverLetterBase64,
                coverLetterFilename: `Carta_${rubro.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
              } : {}),
            });

            sentCount++;
            controller.enqueue(sseEvent({ type: 'sent', employer: employer.name, email }));

            try {
              await logToSheets(name, employer.name);
              controller.enqueue(sseEvent({ type: 'logged', employer: employer.name }));
            } catch (sheetsErr) {
              console.error('[sheets] Log failed (non-blocking):', sheetsErr);
            }

          } catch (employerErr) {
            const errMessage = employerErr instanceof Error ? employerErr.message : String(employerErr);
            console.error(`[run] employer error — ${employer.name} (${employer.website}):`, errMessage);
            skippedCount++;
            controller.enqueue(sseEvent({ type: 'send_error', employer: employer.name, error: errMessage }));
          }
        }

        controller.enqueue(sseEvent({ type: 'complete', sent: sentCount, skipped: skippedCount }));

      } catch (fatalErr) {
        const errMessage = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
        controller.enqueue(sseEvent({ type: 'send_error', employer: 'pipeline', error: errMessage }));
        controller.enqueue(sseEvent({ type: 'complete', sent: sentCount, skipped: skippedCount }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
