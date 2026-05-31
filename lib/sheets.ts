import { google } from 'googleapis';

// SHTS-01: Sheet ID hardcodeado (de CLAUDE.md)
const SHEET_ID = '1Sq8Uy0SdeMrbIxHbUAcZ4Dsc1K2QufeZify4pL59Dek';

export async function logToSheets(userName: string, employerName: string): Promise<void> {
  // SHTS-03: autenticar via Service Account JSON desde env var
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // SHTS-02: columnas A=userName, B=employerName, C="No" (respondido)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[userName, employerName, 'No']],
    },
  });
}
