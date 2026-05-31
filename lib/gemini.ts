import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export interface LanguageEntry {
  language: string;
  level: string;
}

export interface CandidateData {
  name: string;
  jobTypes: string[];
  languages: LanguageEntry[];
  availFrom: string;
  availTo: string;
  hasEUPassport: boolean;
}

export async function generateEmailTemplate(candidate: CandidateData): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const languagesStr = candidate.languages
    .filter(l => l.language.trim())
    .map(l => `${l.language} (${l.level})`)
    .join(', ');

  const prompt = `Write a professional and friendly job application email template in English for a winter season in Val Thorens.

Candidate: ${candidate.name}
Job types sought: ${candidate.jobTypes.join(', ')}
Languages: ${languagesStr}
Availability: from ${candidate.availFrom} to ${candidate.availTo}
${candidate.hasEUPassport ? 'EU passport: yes (full work authorization in France)' : ''}

This template will be sent to many employers. Use [EMPLEADOR] as a placeholder for the employer name and [RUBRO] for the employer's business category.

The email must:
1. Open with "Dear [EMPLEADOR] Team,"
2. Introduce the candidate by name and express interest in working at [EMPLEADOR]
3. Mention the job type(s) sought and that they are applying for a position in [RUBRO]
4. State exact availability (from ${candidate.availFrom} to ${candidate.availTo})
5. List languages: ${languagesStr}
${candidate.hasEUPassport ? '6. Mention EU passport (work authorization)\n7.' : '6.'} State that a CV and a cover letter are attached
${candidate.hasEUPassport ? '8.' : '7.'} Close warmly with the candidate's name

Reply with ONLY the email body in English. No subject line. No code blocks. No surrounding quotes. Use [EMPLEADOR] and [RUBRO] exactly as written.`;

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
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[gemini] 429 recibido — reintentando en ${delay}ms (intento ${attempt + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
  throw new Error('[gemini] unreachable: all attempts exhausted');
}
