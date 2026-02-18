const form = document.getElementById('bg-form');
const imageInput = document.getElementById('image');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const originalPreviewEl = document.getElementById('originalPreview');
const previewEl = document.getElementById('preview');
const downloadBtn = document.getElementById('download');
const submitBtn = document.getElementById('submit');
const clearBtn = document.getElementById('clear');

const editorEl = document.getElementById('editor');
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const toolRestoreBtn = document.getElementById('toolRestore');
const toolEraseBtn = document.getElementById('toolErase');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const undoBtn = document.getElementById('undoBtn');
const resetMaskBtn = document.getElementById('resetMaskBtn');

let resultUrl = null;
let originalUrl = null;
let originalImageObj = null;
let aiResultImageObj = null;
let currentFileBase = 'result';

let isDrawing = false;
let tool = 'restore';
let brushSize = Number(brushSizeInput.value);
let lastPoint = null;
const undoStack = [];
const UNDO_LIMIT = 20;

function clearError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function setTool(nextTool) {
  tool = nextTool;
  toolRestoreBtn.classList.toggle('active', tool === 'restore');
  toolEraseBtn.classList.toggle('active', tool === 'erase');
}

function updateBrushLabel() {
  brushSizeValue.textContent = `${brushSize}px`;
}

function resetEditor() {
  editorEl.classList.add('hidden');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  undoStack.length = 0;
  originalImageObj = null;
  aiResultImageObj = null;
}

function resetResult() {
  clearError();
  statusEl.textContent = '';

  previewEl.removeAttribute('src');
  previewEl.classList.add('hidden');

  downloadBtn.classList.add('hidden');

  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }

  resetEditor();
}

function clearAll() {
  imageInput.value = '';
  currentFileBase = 'result';
  resetResult();

  originalPreviewEl.removeAttribute('src');
  originalPreviewEl.classList.add('hidden');
  if (originalUrl) {
    URL.revokeObjectURL(originalUrl);
    originalUrl = null;
  }
}

function validateImage(file) {
  if (!file) return 'Please select an image first.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Only JPG, PNG, and WebP are supported.';
  }
  if (file.size > 12 * 1024 * 1024) return 'Image too large (max 12MB).';
  return null;
}

function updateOriginalPreview(file) {
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = URL.createObjectURL(file);
  originalPreviewEl.src = originalUrl;
  originalPreviewEl.classList.remove('hidden');
}

function createImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image into editor.'));
    img.src = url;
  });
}

function pushUndoState() {
  if (!canvas.width || !canvas.height) return;
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  undoStack.push(snapshot);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function drawStroke(from, to) {
  if (!originalImageObj || !aiResultImageObj) return;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const step = Math.max(brushSize * 0.2, 1);
  const steps = Math.ceil(distance / step);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;

    if (tool === 'restore') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalImageObj, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function startDrawing(e) {
  if (!originalImageObj || !aiResultImageObj) return;
  isDrawing = true;
  pushUndoState();
  const p = getCanvasPoint(e);
  lastPoint = p;
  drawStroke(p, p);
}

function continueDrawing(e) {
  if (!isDrawing || !lastPoint) return;
  const p = getCanvasPoint(e);
  drawStroke(lastPoint, p);
  lastPoint = p;
}

function stopDrawing() {
  isDrawing = false;
  lastPoint = null;
}

async function initEditor(originalUrlValue, resultUrlValue) {
  originalImageObj = await createImageFromUrl(originalUrlValue);
  aiResultImageObj = await createImageFromUrl(resultUrlValue);

  canvas.width = aiResultImageObj.naturalWidth;
  canvas.height = aiResultImageObj.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(aiResultImageObj, 0, 0, canvas.width, canvas.height);
  editorEl.classList.remove('hidden');
  undoStack.length = 0;
}

for (const evt of ['dragenter', 'dragover']) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
}
for (const evt of ['dragleave', 'drop']) {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
}

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;

  const dt = new DataTransfer();
  dt.items.add(file);
  imageInput.files = dt.files;
  imageInput.dispatchEvent(new Event('change', { bubbles: true }));
});

imageInput.addEventListener('change', () => {
  resetResult();
  const file = imageInput.files?.[0];
  const error = validateImage(file);
  if (error) {
    showError(error);
    return;
  }
  currentFileBase = (file.name.replace(/\.[^/.]+$/, '') || 'result');
  updateOriginalPreview(file);
});

clearBtn.addEventListener('click', clearAll);

toolRestoreBtn.addEventListener('click', () => setTool('restore'));
toolEraseBtn.addEventListener('click', () => setTool('erase'));
brushSizeInput.addEventListener('input', () => {
  brushSize = Number(brushSizeInput.value);
  updateBrushLabel();
});

undoBtn.addEventListener('click', () => {
  const prev = undoStack.pop();
  if (!prev) return;
  ctx.putImageData(prev, 0, 0);
});

resetMaskBtn.addEventListener('click', () => {
  if (!aiResultImageObj) return;
  pushUndoState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(aiResultImageObj, 0, 0, canvas.width, canvas.height);
});

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  startDrawing(e);
});
canvas.addEventListener('pointermove', continueDrawing);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);
canvas.addEventListener('pointerleave', stopDrawing);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetResult();

  const file = imageInput.files?.[0];
  const error = validateImage(file);
  if (error) {
    showError(error);
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = 'Removing background...';

  try {
    const data = new FormData();
    data.append('image', file);

    const response = await fetch('/api/remove-background', {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      let msg = 'Failed to process image.';
      try {
        const j = await response.json();
        msg = j.error || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    const blob = await response.blob();
    resultUrl = URL.createObjectURL(blob);

    previewEl.src = resultUrl;
    previewEl.classList.remove('hidden');

    await initEditor(originalUrl, resultUrl);

    downloadBtn.classList.remove('hidden');
    statusEl.textContent = 'Done — refine if needed, then download.';
  } catch (err) {
    showError(err.message || 'Unexpected error.');
    statusEl.textContent = '';
  } finally {
    submitBtn.disabled = false;
  }
});

downloadBtn.addEventListener('click', async () => {
  if (!canvas.width || !canvas.height) return;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentFileBase}-no-bg-edited.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

setTool('restore');
updateBrushLabel();
