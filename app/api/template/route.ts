import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LanguageEntry } from '@/lib/gemini';

const LEVEL_EN: Record<string, string> = {
  'nativo': 'native',
  'básico': 'basic',
  'intermedio': 'intermediate',
  'avanzado': 'advanced',
};

function buildTemplate(params: {
  name: string;
  languages: LanguageEntry[];
  availFrom: string;
  availTo: string;
  hasEUPassport: boolean;
}): string {
  const languagesStr = params.languages
    .filter(l => l.language.trim())
    .map(l => `${l.language} (${LEVEL_EN[l.level] ?? l.level})`)
    .join(', ');

  const passportLine = params.hasEUPassport
    ? `\nI hold a European Union passport, which grants me full work authorization in France.`
    : '';

  return `Dear [EMPLEADOR] Team,

I am writing to express my interest in joining your team at [EMPLEADOR] for the upcoming winter season in Val Thorens. I am seeking a position in [RUBRO], and I believe that [EMPLEADOR] would be a great fit for my profile.

My name is ${params.name}, and I will be available from ${params.availFrom} to ${params.availTo}. I am enthusiastic, reliable, and eager to contribute to your team throughout the season.${passportLine}

I speak the following languages: ${languagesStr || 'please see my CV'}.

Please find my CV${params.hasEUPassport ? ' and a cover letter' : ''} attached to this email. I would be delighted to discuss any available opportunities with you.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${params.name}`;
}

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

  const currentYear = new Date().getFullYear();
  const subject = `Job Application - Winter Season ${currentYear} - ${body.name}`;
  const template = buildTemplate({
    name: body.name,
    languages: body.languages ?? [],
    availFrom: body.availFrom ?? '',
    availTo: body.availTo ?? '',
    hasEUPassport: body.hasEUPassport ?? false,
  });

  return Response.json({ template, subject });
}
