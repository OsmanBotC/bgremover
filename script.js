const form = document.getElementById('bg-form');
const imageInput = document.getElementById('image');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const previewEl = document.getElementById('preview');
const downloadEl = document.getElementById('download');
const submitBtn = document.getElementById('submit');

let currentObjectUrl = null;

function resetOutput() {
  errorEl.classList.add('hidden');
  errorEl.textContent = '';
  previewEl.classList.add('hidden');
  downloadEl.classList.add('hidden');
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resetOutput();

  const file = imageInput.files?.[0];
  if (!file) {
    errorEl.textContent = 'Please choose an image file.';
    errorEl.classList.remove('hidden');
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
    errorEl.textContent = err.message || 'Unexpected error.';
    errorEl.classList.remove('hidden');
    statusEl.textContent = '';
  } finally {
    submitBtn.disabled = false;
  }
});
