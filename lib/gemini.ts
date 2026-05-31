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

  const prompt = `Write a professional and friendly job application email in English for a winter season in Val Thorens.

Candidate: ${candidate.name}
Job types sought: ${candidate.jobTypes.join(', ')}
Languages: ${candidate.languages}
Availability: from ${candidate.availFrom} to ${candidate.availTo}

Employer: ${employer.name}

The email must include:
1. Brief introduction of the candidate with their name
2. Specific interest in working at "${employer.name}"
3. Exact availability (from ${candidate.availFrom} to ${candidate.availTo})
4. Languages spoken: ${candidate.languages}
5. Explicit mention that a CV is attached
6. Friendly closing with the candidate's name

Reply with ONLY the email body in English, no subject line, no "Subject:", no code blocks, no surrounding quotes.`;

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
  // WR-05: dead code — el loop siempre retorna en el try o re-lanza en el catch.
  // El throw siguiente existe únicamente para satisfacer el análisis de flujo de TypeScript.
  throw new Error('[gemini] unreachable: all attempts exhausted');
}
