import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { discoverEmployers } from '@/lib/places';
import { scrapeEmail } from '@/lib/scraper';
import { generateEmailBody, CandidateData } from '@/lib/gemini';
import { sendEmail } from '@/lib/gmail';
import { logToSheets } from '@/lib/sheets';

const encoder = new TextEncoder();

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  // ASVS V4: verificar sesión antes de ejecutar el pipeline
  // Pasar authOptions es obligatorio en NextAuth v4 + App Router — sin authOptions
  // getServerSession() puede siempre retornar null (no lee las callbacks de sesión)
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // CR-01: leer el access token desde la sesión verificada, no desde el body del cliente
  const accessToken = (session as { access_token?: string; user?: { email?: string; name?: string } }).access_token;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token in session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // WR-02: verificar email del usuario antes de ejecutar el pipeline
  const fromEmail = session.user?.email;
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: 'Session user email not available' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parsear y validar el body del POST
  let body: {
    name: string;
    cvBase64: string;
    jobTypes: string[];
    languages: string;
    availFrom: string;
    availTo: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, cvBase64, jobTypes, languages, availFrom, availTo } = body;

  // ASVS V5: validar campos requeridos antes del pipeline
  if (!name || !cvBase64) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, cvBase64' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // CR-03: validar longitud de campos para prevenir prompt injection
  if (name.length > 100 || languages.length > 200) {
    return new Response(JSON.stringify({ error: 'Field too long: name (max 100), languages (max 200)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (Array.isArray(jobTypes) && jobTypes.some((jt) => jt.length > 50)) {
    return new Response(JSON.stringify({ error: 'Field too long: each jobType must be <= 50 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // El cvBase64 del frontend tiene formato "data:application/pdf;base64,<data>"
  // Extraer solo la parte de los datos base64 para el adjunto MIME
  const cvBase64Data = cvBase64.includes(',') ? cvBase64.split(',')[1] : cvBase64;

  // GEN-03: asunto hardcodeado con año actual
  const currentYear = new Date().getFullYear();
  const emailSubject = `Candidature - Saison d'hiver ${currentYear} - ${name}`;

  const candidate: CandidateData = {
    name,
    jobTypes: jobTypes ?? [],
    languages: languages ?? '',
    availFrom: availFrom ?? '',
    availTo: availTo ?? '',
  };

  const stream = new ReadableStream({
    async start(controller) {
      let sentCount = 0;
      let skippedCount = 0;

      try {
        // ─── ETAPA 1: DISCOVERY ───────────────────────────────────────────
        controller.enqueue(sseEvent({ type: 'searching', message: 'Buscando empleadores en Val Thorens...' }));

        const employers = await discoverEmployers();

        controller.enqueue(sseEvent({ type: 'discovery_complete', total: employers.length }));

        // ─── ETAPAS 2-4: POR EMPLEADOR ────────────────────────────────────
        for (const employer of employers) {
          try {
            // WR-03: rate limit al inicio del loop, solo si ya enviamos al menos uno
            if (sentCount > 0) await sleep(4000); // SEND-03: 4s entre envíos

            // ETAPA 2: SCRAPING
            // Sin website: emitir scraping con null y saltar
            if (!employer.website) {
              skippedCount++;
              controller.enqueue(sseEvent({ type: 'scraping', employer: employer.name, email: null }));
              continue;
            }

            // Con website: scraping y emitir resultado final (un único evento por empleador)
            const email = await scrapeEmail(employer.website);
            controller.enqueue(sseEvent({ type: 'scraping', employer: employer.name, email: email }));

            if (!email) {
              // SCRP-05: sin email encontrado → marcar como skipped
              skippedCount++;
              continue;
            }

            // ETAPA 3: GENERACIÓN DE EMAIL
            controller.enqueue(sseEvent({ type: 'generating', employer: employer.name }));
            const emailBody = await generateEmailBody(candidate, { name: employer.name });

            // ETAPA 4: ENVÍO
            await sendEmail({
              accessToken,
              to: email,
              subject: emailSubject,
              body: emailBody,
              cvBase64: cvBase64Data,
              cvFilename: 'CV.pdf',
              fromEmail,
            });

            sentCount++;
            controller.enqueue(sseEvent({ type: 'sent', employer: employer.name, email }));

            // LOGGING: registrar en Sheets (graceful — no abortar si falla)
            try {
              await logToSheets(name, employer.name);
              controller.enqueue(sseEvent({ type: 'logged', employer: employer.name }));
            } catch (sheetsErr) {
              // Error de logging es no-bloqueante — el email ya fue enviado
              console.error('[sheets] Log failed (non-blocking):', sheetsErr);
            }

          } catch (employerErr) {
            // SEND-04 / CLAUDE.md: error individual → log + continuar, nunca abortar el pipeline
            const errMessage = employerErr instanceof Error ? employerErr.message : String(employerErr);
            skippedCount++;
            controller.enqueue(sseEvent({ type: 'send_error', employer: employer.name, error: errMessage }));
          }
        }

        // Pipeline completado
        controller.enqueue(sseEvent({ type: 'complete', sent: sentCount, skipped: skippedCount }));

      } catch (fatalErr) {
        // Error fatal (ej: discovery falló completamente) — emitir evento y cerrar
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
