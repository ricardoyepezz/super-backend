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
const storage = new Storage({ auth });

const bucketName = JSON.parse(process.env.GCS_BUCKET);

module.exports = { storage, sheets, bucketName };

app.post('/upload', cors(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const uniqueFilename = `${Date.now()}-${req.file.originalname}`;

  const blob = bucket.file(uniqueFilename);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  blobStream.on('error', err => res.status(500).send(err.toString()));
  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    res.status(200).send({ url: publicUrl });
  });

  blobStream.end(req.file.buffer);
});

app.post('/sheet', cors(), async (req, res) => {
  try {
    const { date, category, description, amount, imageURL, sheetName, spreadsheetId } = req.body;
    
    const firstEmptyRow = await findFirstEmptyRow(sheetName, spreadsheetId);
    const range = `${sheetName}!C${firstEmptyRow}:G${firstEmptyRow}`;
    const valueInputOption = 'USER_ENTERED';
    const resource = {
      values: [[date, category, description, amount, imageURL]],
    };

    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      resource,
    });

    res.status(200).json({ message: 'Data added to Google Sheets successfully', details: updateResponse.data });
  } catch (error) {
    console.error('Error uploading data to Google Sheets:', error);
    res.status(500).json({ error: error.toString() });
  }
});