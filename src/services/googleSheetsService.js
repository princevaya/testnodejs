const path = require("path");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let sheetsClient;

const getSheetsClient = async () => {
  if (sheetsClient) return sheetsClient;

  const credentialPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!credentialPath || !spreadsheetId) {
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), credentialPath),
    scopes: SCOPES
  });

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: "v4", auth: authClient });
  return sheetsClient;
};

const appendComplaintToSheet = async (complaint) => {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!sheets || !spreadsheetId) {
      return { skipped: true, reason: "Google Sheets is not configured" };
    }

    const row = [
      complaint.id,
      complaint.title,
      complaint.category,
      complaint.priority,
      `${complaint.building}-${complaint.floor}-${complaint.room}`,
      complaint.status,
      complaint.created_at
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row]
      }
    });

    return { skipped: false };
  } catch (error) {
    console.error("Google Sheets append failed:", error.message);
    return { skipped: true, reason: error.message };
  }
};

module.exports = {
  appendComplaintToSheet
};
