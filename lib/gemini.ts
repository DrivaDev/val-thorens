import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export interface CandidateData {
  name: string;
  jobTypes: string[];
  languages: string;
  availFrom: string;
  availTo: string;
}

export async function generateEmailBody(
  candidate: CandidateData,
  employer: { name: string }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Escribe un email de candidatura en francés profesional y cordial para una temporada de invierno en Val Thorens.

Candidato: ${candidate.name}
Tipos de trabajo buscados: ${candidate.jobTypes.join(', ')}
Idiomas: ${candidate.languages}
Disponibilidad: del ${candidate.availFrom} al ${candidate.availTo}

Empleador: ${employer.name}

El email debe incluir obligatoriamente:
1. Presentación breve del candidato con su nombre
2. Interés específico en trabajar en el establecimiento "${employer.name}"
3. Disponibilidad exacta mencionada (del ${candidate.availFrom} al ${candidate.availTo})
4. Idiomas hablados: ${candidate.languages}
5. Mención explícita de que el CV se adjunta al email
6. Cierre cordial con el nombre del candidato

Responde ÚNICAMENTE con el cuerpo del email en francés, sin asunto, sin "Objet:", sin bloques de código, sin comillas alrededor del texto.`;

  return await callWithRetry(() => model.generateContent(prompt));
}

// GEN-04: retry exponencial para errores 429 (rate limit de Gemini API)
async function callWithRetry(
  fn: () => Promise<{ response: { text: () => string } }>,
  maxAttempts = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result.response.text();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const is429 = err?.status === 429 || err?.message?.includes('429');

      if (is429 && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[gemini] 429 recibido — reintentando en ${delay}ms (intento ${attempt + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error; // re-throw si no es 429 o se agotaron los intentos
    }
  }
  throw new Error('[gemini] Max retries exceeded');
}
