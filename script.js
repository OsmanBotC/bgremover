const form = document.getElementById('bg-form');
const imageInput = document.getElementById('image');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const originalPreviewEl = document.getElementById('originalPreview');
const previewEl = document.getElementById('preview');
const downloadEl = document.getElementById('download');
const submitBtn = document.getElementById('submit');
const clearBtn = document.getElementById('clear');

let resultUrl = null;
let originalUrl = null;

function clearError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function resetResult() {
  clearError();
  statusEl.textContent = '';

  previewEl.removeAttribute('src');
  previewEl.classList.add('hidden');

  downloadEl.classList.add('hidden');
  downloadEl.removeAttribute('href');

  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }
}

function clearAll() {
  imageInput.value = '';
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
  updateOriginalPreview(file);
});

clearBtn.addEventListener('click', clearAll);

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

    const base = file.name.replace(/\.[^/.]+$/, '') || 'result';
    downloadEl.href = resultUrl;
    downloadEl.download = `${base}-no-bg.png`;
    downloadEl.textContent = `Download ${downloadEl.download}`;
    downloadEl.classList.remove('hidden');

    statusEl.textContent = 'Done — your PNG is ready.';
  } catch (err) {
    showError(err.message || 'Unexpected error.');
    statusEl.textContent = '';
  } finally {
    submitBtn.disabled = false;
  }
});
