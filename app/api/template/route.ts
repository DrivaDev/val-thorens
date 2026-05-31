import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateEmailTemplate, CandidateData, LanguageEntry } from '@/lib/gemini';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    name: string;
    jobTypes: string[];
    languages: LanguageEntry[];
    availFrom: string;
    availTo: string;
    hasEUPassport: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: 'Missing required field: name' }, { status: 400 });
  }

  const candidate: CandidateData = {
    name: body.name,
    jobTypes: body.jobTypes ?? [],
    languages: body.languages ?? [],
    availFrom: body.availFrom ?? '',
    availTo: body.availTo ?? '',
    hasEUPassport: body.hasEUPassport ?? false,
  };

  const currentYear = new Date().getFullYear();
  const subject = `Job Application - Winter Season ${currentYear} - ${body.name}`;

  let template: string;
  try {
    template = await generateEmailTemplate(candidate);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[template] Gemini error:', msg);
    return Response.json({ error: `Gemini error: ${msg}` }, { status: 502 });
  }

  return Response.json({ template, subject });
}
