import { MotorPart } from '../types/motorPart';

export const SHEET_HEADERS = [
  'Part #',
  'Item Name',
  'Brand',
  'SRP Price',
  'Shop Price',
];

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function formatA1Range(sheetName: string, cellRange: string = 'A1'): string {
  const sanitized = sheetName.replace(/'/g, "''");
  return `'${sanitized}'!${cellRange}`;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: { id: number; title: string }[];
}

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title))`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Google authorization expired (HTTP 401). Please re-authenticate with Google.');
    }
    if (res.status === 403) {
      throw new Error('Permission denied (HTTP 403). Make sure your Google account has access to this spreadsheet.');
    }
    if (res.status === 404) {
      throw new Error('Spreadsheet not found (HTTP 404). Verify the Sheet ID.');
    }
    throw new Error(
      errorBody.error?.message ||
        `Failed to fetch spreadsheet (HTTP ${res.status}). Verify access permissions and Sheet ID.`
    );
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Motor Parts Pricelist',
    sheets:
      data.sheets?.map((s: any) => ({
        id: s.properties?.sheetId,
        title: s.properties?.title,
      })) || [],
  };
}

export async function createMotorPartsSpreadsheet(
  accessToken: string,
  title: string = 'Motor Parts Pricelist Database (PHP)',
  initialParts: MotorPart[] = []
): Promise<{ id: string; url: string; title: string; sheetTitle: string }> {
  const sheetTitle = 'Pricelist';
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: sheetTitle,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => ({}));
    if (createRes.status === 401) {
      throw new Error('Google authorization expired (HTTP 401). Please re-authenticate with Google.');
    }
    throw new Error(
      errorBody.error?.message || `Failed to create Google Sheet (HTTP ${createRes.status})`
    );
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const rows = [
    SHEET_HEADERS,
    ...initialParts.map((p) => [
      p.partNumber,
      p.itemName,
      p.brand,
      p.srpPrice,
      p.shopPrice,
    ]),
  ];

  await updateSpreadsheetValues(accessToken, spreadsheetId, sheetTitle, rows);

  // Apply styling to header row (dark navy background, bold white text)
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: created.sheets?.[0]?.properties?.sheetId || 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.08, green: 0.12, blue: 0.18 }, // #141f2e
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true,
                    fontSize: 11,
                  },
                  horizontalAlignment: 'LEFT',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: created.sheets?.[0]?.properties?.sheetId || 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 5,
              },
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Header styling batchUpdate error (non-fatal):', err);
  }

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    title,
    sheetTitle,
  };
}

export async function updateSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number)[][]
): Promise<void> {
  const safeSheet = sheetName.replace(/'/g, "''");

  // 1. Clear existing cells in sheet first to avoid ghost rows
  try {
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: [`'${safeSheet}'!A1:Z5000`],
        }),
      }
    );
    if (!clearRes.ok && clearRes.status === 401) {
      throw new Error('Google authorization expired (HTTP 401). Please re-authenticate with Google.');
    }
  } catch (clearErr: any) {
    if (clearErr.message?.includes('401')) {
      throw clearErr;
    }
    console.warn('Values clear warning (non-fatal, continuing to write):', clearErr);
  }

  // 2. Write new rows using values:batchUpdate to avoid URL encoding issues
  const colCount = Math.max(1, rows[0]?.length || 5);
  const colLetter = String.fromCharCode(65 + colCount - 1);
  const targetRange = `'${safeSheet}'!A1:${colLetter}${rows.length}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: targetRange,
            majorDimension: 'ROWS',
            values: rows,
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Google authorization expired (HTTP 401). Please re-authenticate with Google.');
    }
    if (res.status === 403) {
      throw new Error('Permission denied (HTTP 403). Make sure your Google account has edit access to this spreadsheet.');
    }
    if (res.status === 404) {
      throw new Error('Spreadsheet not found (HTTP 404). Verify your Google Sheet ID.');
    }
    throw new Error(
      errorBody.error?.message || `Failed to update spreadsheet values (HTTP ${res.status})`
    );
  }
}

export async function syncAllPartsToSheet(
  accessToken: string,
  spreadsheetId: string,
  parts: MotorPart[],
  sheetName?: string
): Promise<string> {
  let targetSheet = sheetName;
  if (!targetSheet) {
    try {
      const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
      targetSheet = meta.sheets[0]?.title || 'Pricelist';
    } catch {
      targetSheet = 'Pricelist';
    }
  }

  const rows = [
    SHEET_HEADERS,
    ...parts.map((p) => [
      p.partNumber,
      p.itemName,
      p.brand,
      p.srpPrice,
      p.shopPrice,
    ]),
  ];

  try {
    await updateSpreadsheetValues(accessToken, spreadsheetId, targetSheet, rows);
  } catch (err: any) {
    // If targetSheet fails with range error or not found, try discovering the sheet from metadata
    if (!sheetName && (err.message?.includes('Unable to parse') || err.message?.includes('not found') || err.message?.includes('Range'))) {
      const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
      if (meta.sheets[0]?.title && meta.sheets[0].title !== targetSheet) {
        targetSheet = meta.sheets[0].title;
        await updateSpreadsheetValues(accessToken, spreadsheetId, targetSheet, rows);
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  return targetSheet;
}

export async function readPartsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName?: string
): Promise<{ parts: MotorPart[]; sheetTitle: string }> {
  let targetSheet = sheetName;
  if (!targetSheet) {
    const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
    targetSheet = meta.sheets[0]?.title || 'Pricelist';
  }

  const readRange = encodeURIComponent(formatA1Range(targetSheet, 'A1:Z5000'));
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${readRange}`;

  let rows: any[][] = [];

  if (!accessToken.startsWith('google_token_') && !accessToken.startsWith('demo_')) {
    try {
      const res = await fetch(readUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        rows = data.values || [];
      } else if (res.status === 404) {
        throw new Error('Spreadsheet not found (HTTP 404). Verify your Google Sheet ID.');
      }
    } catch (fetchErr: any) {
      console.warn('Google Sheets API direct fetch warning:', fetchErr?.message);
    }
  }

  // If Sheets API was blocked by token or permissions, attempt public CSV export
  if (rows.length === 0) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetSheet)}`;
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        // Parse simple CSV rows
        rows = csvText
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            // Match comma separated values respecting double quotes
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches) {
              return matches.map((v) => v.replace(/^"|"$/g, '').trim());
            }
            return line.split(',').map((v) => v.trim());
          });
      }
    } catch (csvErr) {
      console.warn('CSV public sheet fallback error:', csvErr);
    }
  }

  if (rows.length === 0) {
    return { parts: [], sheetTitle: targetSheet };
  }

  const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());

  // Find column indexes
  const colIndex = {
    partNumber: headerRow.findIndex((h) => h.includes('part') || h.includes('#') || h.includes('sku') || h.includes('code')),
    itemName: headerRow.findIndex((h) => h.includes('item') || h.includes('name') || h.includes('desc')),
    brand: headerRow.findIndex((h) => h.includes('brand') || h.includes('manuf') || h.includes('make')),
    srpPrice: headerRow.findIndex((h) => h.includes('srp') || h.includes('retail')),
    shopPrice: headerRow.findIndex((h) => h.includes('shop') || h.includes('whole') || h.includes('dealer') || h.includes('cost')),
  };

  const idxPartNumber = colIndex.partNumber !== -1 ? colIndex.partNumber : 0;
  const idxItemName = colIndex.itemName !== -1 ? colIndex.itemName : 1;
  const idxBrand = colIndex.brand !== -1 ? colIndex.brand : 2;
  const idxSrp = colIndex.srpPrice !== -1 ? colIndex.srpPrice : 3;
  const idxShop = colIndex.shopPrice !== -1 ? colIndex.shopPrice : 4;

  const parts: MotorPart[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || (!row[idxItemName] && !row[idxPartNumber])) continue;

    const rawSrp = String(row[idxSrp] || '0').replace(/[^0-9.-]+/g, '');
    const srpNum = parseFloat(rawSrp) || 0;

    const rawShop = String(row[idxShop] || '0').replace(/[^0-9.-]+/g, '');
    const shopNum = parseFloat(rawShop) || (srpNum ? Number((srpNum * 0.8).toFixed(2)) : 0);

    const partNumber = String(row[idxPartNumber] || `PT-${i}`).trim();
    const itemName = String(row[idxItemName] || '').trim();
    const brand = String(row[idxBrand] || 'Generic').trim();

    const part: MotorPart = {
      id: `part-${i}-${partNumber.replace(/\s+/g, '-')}`,
      partNumber,
      itemName,
      brand,
      srpPrice: srpNum,
      shopPrice: shopNum,
      updatedAt: new Date().toISOString(),
    };

    parts.push(part);
  }

  return { parts, sheetTitle: targetSheet };
}
