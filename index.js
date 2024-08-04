const express = require('express');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();
const {storage, bucketName, sheets } = require('./api/google');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const gsStorage = storage
const bucket = gsStorage.bucket(bucketName)
const port = process.env.PORT || 8080;

async function findFirstEmptyRow(sheetName, spreadsheetId) {
  const range = `${sheetName}!C12:G`; // Ajusta para especificar hasta qué columna quieres verificar

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    let firstEmptyRow = 12; // Comenzamos a verificar desde la fila 12
    if (rows && rows.length) {
      // Encuentra el índice de la primera fila completamente vacía
      const emptyRowIndex = rows.findIndex(row => row.filter(cell => cell.trim() !== '').length === 0);
      if (emptyRowIndex === -1) {
        // Si no hay filas vacías, devuelva la siguiente fila después de la última fila con datos
        firstEmptyRow = 12 + rows.length;
      } else {
        // Ajusta el índice de la fila vacía a la base de la fila correcta en la hoja
        firstEmptyRow += emptyRowIndex;
      }
    }
    return firstEmptyRow;
  } catch (error) {
    console.error('The API returned an error: ' + error);
    throw error;
  }
}

const corsOptions = {
  origin: 'https://upload-expenses.netlify.app', // Asegúrate de que este es el origen correcto
  methods: ['GET', 'POST', 'OPTIONS'], // Métodos que quieres permitir
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, algunos SmartTVs) necesitan esto
};

app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors(corsOptions));

app.get('/ping', (req, res) => {
  try {
    res.status(200).send({ status: 'ok', message: 'pong' });
  } catch (error) {
    console.error('Error in /ping route:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/upload', cors(), upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).json({ error: `No file uploaded. ${bucket.name}` });
  }

  const uniqueFilename = `${Date.now()}-${req.file.originalname}`;

  const blob = bucket.file(uniqueFilename);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  blobStream.on('error', err => {
    console.error('Error during file upload:', err);
    res.status(500).json({ error: 'Internal Server Error during file upload.' });
  });

  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    res.status(200).json({ url: publicUrl });
  });

  blobStream.end(req.file.buffer);
});

app.post('/sheet', cors(), async (req, res) => {
  try {
    const { date, category, description, amount, imageURL, sheetName, spreadsheetId } = req.body;
    
    if (!date || !category || !description || !amount || !imageURL || !sheetName || !spreadsheetId) {
      console.error('Missing required fields in request body.');
      return res.status(400).json({ error: 'Missing required fields in request body.' });
    }

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
    res.status(500).json({ error: 'Internal Server Error during data upload to Google Sheets.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});