import { getAccessToken } from './google-auth';

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;
}

export interface SheetExportRow {
  name: string;
  username: string;
  xUserId: string;
  eligibilityStatus: string;
  xVerified: string;
  xVerifiedType: string;
  firstAuthenticatedAt: string;
  lastAuthenticatedAt: string;
  exportedAt: string;
}

export const SHEETS_HEADER = [
  'Participant Name',
  'X Username',
  'X User ID',
  'Eligibility Status',
  'X Verified',
  'X Verified Type',
  'First Authenticated',
  'Last Authenticated',
  'Exported At',
];

export async function createParticipantSpreadsheet(
  title: string,
  participantRow?: SheetExportRow,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitle: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Sheets authorization token is required. Please sign in with Google.');
  }

  const initialSheetTitle = 'Nova Airdrop Participants';

  // 1. Create the spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Nova Airdrop Registry',
      },
      sheets: [
        {
          properties: {
            title: initialSheetTitle,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create spreadsheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // 2. Add header and initial row
  const rows: (string | number)[][] = [SHEETS_HEADER];
  if (participantRow) {
    rows.push([
      participantRow.name,
      participantRow.username,
      participantRow.xUserId,
      participantRow.eligibilityStatus,
      participantRow.xVerified,
      participantRow.xVerifiedType,
      participantRow.firstAuthenticatedAt,
      participantRow.lastAuthenticatedAt,
      participantRow.exportedAt,
    ]);
  }

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(initialSheetTitle)}'!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    },
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    console.warn('Appended initial rows warning:', errorData);
  }

  return { spreadsheetId, spreadsheetUrl, sheetTitle: initialSheetTitle };
}

export async function appendParticipantToSpreadsheet(
  spreadsheetId: string,
  participantRow: SheetExportRow,
): Promise<{ updatedRange: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Sheets authorization token is required. Please sign in with Google.');
  }

  // Fetch spreadsheet metadata to get the first sheet's real title (avoid assuming Sheet1)
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!metaRes.ok) {
    const errorData = await metaRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Could not find spreadsheet (${metaRes.status})`);
  }

  const meta = await metaRes.json();
  const firstSheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  const rowValues = [
    participantRow.name,
    participantRow.username,
    participantRow.xUserId,
    participantRow.eligibilityStatus,
    participantRow.xVerified,
    participantRow.xVerifiedType,
    participantRow.firstAuthenticatedAt,
    participantRow.lastAuthenticatedAt,
    participantRow.exportedAt,
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(firstSheetTitle)}':append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    },
  );

  if (!appendRes.ok) {
    const errorData = await appendRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to append row (${appendRes.status})`);
  }

  const appendData = await appendRes.json();
  return { updatedRange: appendData.updates?.updatedRange || firstSheetTitle };
}

export async function fetchSpreadsheetPreview(
  spreadsheetId: string,
): Promise<{ title: string; rows: string[][] }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Sheets authorization token is required.');
  }

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!metaRes.ok) {
    const errorData = await metaRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Spreadsheet not accessible');
  }

  const meta = await metaRes.json();
  const title = meta.properties?.title || 'Spreadsheet';
  const firstSheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(firstSheetTitle)}'!A1:Z50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!valRes.ok) {
    return { title, rows: [] };
  }

  const valData = await valRes.json();
  return { title, rows: valData.values || [] };
}
