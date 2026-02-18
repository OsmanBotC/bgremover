require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs/promises');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    }
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIME_TO_EXT[file.mimetype]) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }
    cb(null, true);
  }
});

function runRembg(inputPath, outputPath) {
  const pythonBin = process.env.PYTHON_BIN || 'python3';
  return new Promise((resolve, reject) => {
    execFile(
      pythonBin,
      ['-m', 'rembg', 'i', inputPath, outputPath],
      { timeout: 600000, maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const details = [
            stderr,
            stdout,
            error.message,
            error.code ? `code=${error.code}` : '',
            error.signal ? `signal=${error.signal}` : ''
          ]
            .filter(Boolean)
            .join(' | ');
          return reject(new Error((details || 'rembg failed').trim()));
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/remove-background', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided.' });
  }

  const reqId = crypto.randomUUID();
  const ext = MIME_TO_EXT[req.file.mimetype] || '.png';
  const inputPath = path.join(os.tmpdir(), `bg-${reqId}-input${ext}`);
  const outputPath = path.join(os.tmpdir(), `bg-${reqId}-output.png`);

  try {
    await fs.writeFile(inputPath, req.file.buffer);
    await runRembg(inputPath, outputPath);

    const outputBuffer = await fs.readFile(outputPath);
    const outputName = `${path.parse(req.file.originalname || 'image').name}-no-bg.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);
    return res.send(outputBuffer);
  } catch (err) {
    const message = err.message || 'Unexpected server error.';
    return res.status(500).json({ error: `Background removal failed: ${message}` });
  } finally {
    await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
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
