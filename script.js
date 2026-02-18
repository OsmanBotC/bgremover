const form = document.getElementById('bg-form');
const imageInput = document.getElementById('image');
const uploadArea = document.getElementById('upload-area');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const originalPreviewEl = document.getElementById('originalPreview');
const previewEl = document.getElementById('preview');
const downloadEl = document.getElementById('download');
const submitBtn = document.getElementById('submit');
const clearBtn = document.getElementById('clear');

let currentObjectUrl = null;
let originalObjectUrl = null;

function clearError() {
  errorEl.classList.add('hidden');
  errorEl.textContent = '';
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function resetOutput() {
  clearError();
  statusEl.textContent = '';
  previewEl.classList.add('hidden');
  previewEl.removeAttribute('src');
  downloadEl.classList.add('hidden');

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function clearAll() {
  imageInput.value = '';
  resetOutput();

  originalPreviewEl.classList.add('hidden');
  originalPreviewEl.removeAttribute('src');
  if (originalObjectUrl) {
    URL.revokeObjectURL(originalObjectUrl);
    originalObjectUrl = null;
  }
}

function validateImage(file) {
  if (!file) return 'Please choose an image file.';
  if (!file.type || !file.type.startsWith('image/')) return 'Please upload a valid image file.';
  if (file.size > 12 * 1024 * 1024) return 'Image too large. Max size is 12MB.';
  return null;
}

function setOriginalPreview(file) {
  if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
  originalObjectUrl = URL.createObjectURL(file);
  originalPreviewEl.src = originalObjectUrl;
  originalPreviewEl.classList.remove('hidden');
}

imageInput.addEventListener('change', () => {
  resetOutput();
  const file = imageInput.files?.[0];
  const validationError = validateImage(file);
  if (validationError) {
    showError(validationError);
    return;
  }
  setOriginalPreview(file);
});

for (const evt of ['dragenter', 'dragover']) {
  uploadArea.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('dragover');
  });
}
for (const evt of ['dragleave', 'drop']) {
  uploadArea.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('dragover');
  });
}
uploadArea.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  imageInput.files = dt.files;
  imageInput.dispatchEvent(new Event('change', { bubbles: true }));
});

clearBtn.addEventListener('click', clearAll);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resetOutput();

  const file = imageInput.files?.[0];
  const validationError = validateImage(file);
  if (validationError) {
    showError(validationError);
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = 'Processing image...';

  try {
    const body = new FormData();
    body.append('image', file);

    const response = await fetch('/api/remove-background', {
      method: 'POST',
      body
    });

    if (!response.ok) {
      let msg = 'Could not process image.';
      try {
        const data = await response.json();
        msg = data.error || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    const blob = await response.blob();
    currentObjectUrl = URL.createObjectURL(blob);

    previewEl.src = currentObjectUrl;
    previewEl.classList.remove('hidden');

    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'result';
    downloadEl.href = currentObjectUrl;
    downloadEl.download = `${baseName}-no-bg.png`;
    downloadEl.classList.remove('hidden');
    downloadEl.textContent = `Download ${downloadEl.download}`;

    statusEl.textContent = 'Done!';
  } catch (err) {
    showError(err.message || 'Unexpected error.');
    statusEl.textContent = '';
  } finally {
    submitBtn.disabled = false;
  }
});
