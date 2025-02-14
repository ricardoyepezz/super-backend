const { Storage } = require('@google-cloud/storage');
const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Configuramos la autenticación para los clientes de Google Cloud y Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  projectId: credentials.project_id,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/devstorage.read_write'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

const storage = new Storage({
  projectId: credentials.project_id,
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  }
});

const bucketName = process.env.GCS_BUCKET;

module.exports = { storage, sheets, bucketName };
