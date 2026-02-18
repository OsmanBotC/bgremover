require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const sharp = require('sharp');
const { removeBackground } = require('@imgly/background-removal-node');

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
    fileSize: 12 * 1024 * 1024
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
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided.' });
    }

    // Normalize any image format (jpg/webp/heic/etc if supported by libvips) to PNG first.
    // This avoids the upstream "Unsupported format" errors.
    const normalizedPng = await sharp(req.file.buffer)
      .rotate()
      .png()
      .toBuffer();

    const blob = await removeBackground(normalizedPng, {
      model: process.env.BGREMOVER_MODEL || 'small',
      output: {
        format: 'image/png',
        quality: 1,
        type: 'foreground'
      }
    });

    const arrayBuffer = await blob.arrayBuffer();
    const outputBuffer = Buffer.from(arrayBuffer);

    const outputName = `${path.parse(req.file.originalname || 'image').name}-no-bg.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    return res.send(outputBuffer);
  } catch (err) {
    const message = err.message || 'Unexpected server error.';
    return res.status(500).json({ error: `Background removal failed: ${message}` });
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
