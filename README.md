# Background Remover Web App (No External API)

Production-ready Node.js web app that removes image backgrounds **locally on your server** via `rembg`.

## Features
- Upload JPG / PNG / WebP
- Background removal runs on your own server
- Returns transparent PNG for download
- Modern drag-and-drop UI
- Dockerized for deployment (Coolify-ready)

## Environment Variables
- `PORT` (optional, default `3000`)
- `PYTHON_BIN` (optional, default `python3`)

## Local Run
```bash
npm install
npm start
```
Then open: `http://localhost:3000`

> Requires Python + `rembg` locally for non-Docker runs.

## Docker Run
```bash
docker build -t bgremover .
docker run -p 3000:3000 bgremover
```

## API Endpoint
`POST /api/remove-background` with multipart form-data field `image`.
Returns `image/png` on success.

## Deployment Notes (Coolify)
- Build Pack: Dockerfile
- Port: `3000`
- No API key needed
- Health check path: `/health`
