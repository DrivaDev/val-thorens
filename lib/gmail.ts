export interface SendEmailParams {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  cvBase64: string;
  cvFilename: string;
  fromEmail: string;
  coverLetterBase64?: string;
  coverLetterFilename?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // WR-01: codificar el asunto con RFC 2047 base64 para soportar caracteres no-ASCII
  const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`;

  // CR-04: codificar el cuerpo en base64 (no raw UTF-8 con cabecera quoted-printable)
  const bodyB64 = Buffer.from(params.body, 'utf-8').toString('base64');

  // SEND-01: construir mensaje MIME RFC 2822 multipart/mixed con body texto y adjunto PDF
  const mimeMessage = [
    `From: ${params.fromEmail}`,
    `To: ${params.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    bodyB64,
    '',
    `--${boundary}`,
    'Content-Type: application/pdf',
    `Content-Disposition: attachment; filename="${params.cvFilename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    params.cvBase64,
    '',
    ...(params.coverLetterBase64 && params.coverLetterFilename ? [
      `--${boundary}`,
      'Content-Type: application/pdf',
      `Content-Disposition: attachment; filename="${params.coverLetterFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      params.coverLetterBase64,
      '',
    ] : []),
    `--${boundary}--`,
  ].join('\r\n');

  // CRÍTICO: base64url encoding — 3 reemplazos OBLIGATORIOS (RESEARCH.md Pitfall 3)
  // Gmail API requiere base64url (RFC 4648), NO base64 estándar
  // Sin estos reemplazos: Gmail API devuelve 400 "Invalid base64 encoding"
  const encoded = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')   // reemplazo 1: + → -
    .replace(/\//g, '_')   // reemplazo 2: / → _
    .replace(/=+$/, '');   // reemplazo 3: eliminar padding =

  // SEND-02: enviar via Gmail API usando el access_token OAuth del usuario
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail send failed: ${response.status} — ${errorText}`);
    // El caller (run/route.ts) captura este throw, emite SSE event 'send_error', y continúa
  }
}
