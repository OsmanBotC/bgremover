require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024 // 12MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/remove-background', upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is not configured. Missing REMOVEBG_API_KEY.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided.' });
    }

    const formData = new FormData();
    formData.append('image_file', req.file.buffer, {
      filename: req.file.originalname || 'upload.jpg',
      contentType: req.file.mimetype
    });
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': apiKey
      },
      responseType: 'arraybuffer',
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      let details = 'remove.bg request failed.';
      try {
        const parsed = JSON.parse(Buffer.from(response.data).toString('utf8'));
        details = parsed.errors?.[0]?.title || parsed.errors?.[0]?.code || details;
      } catch (_) {}
      return res.status(400).json({ error: details });
    }

    const outputName = `${path.parse(req.file.originalname || 'image').name}-no-bg.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    return res.send(Buffer.from(response.data));
  } catch (err) {
    const message = err.message || 'Unexpected server error.';
    return res.status(500).json({ error: message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Invalid request.' });
  }
  next();
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Background remover app running on port ${PORT}`);
});
