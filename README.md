# Background Remover Web App

Production-ready Node.js web app that removes image backgrounds using the [remove.bg API](https://www.remove.bg/api).

## Features
- Upload any image from browser
- Sends image to remove.bg using server-side API key
- Returns transparent PNG for download
- Minimal UI + preview
- Dockerized for deployment (Coolify-ready)

## Tech Stack
- Node.js + Express
- Multer (in-memory upload)
- Axios + FormData
- Static HTML/CSS/JS frontend

## Environment Variables
- `REMOVEBG_API_KEY` (**required**) — your remove.bg API key
- `PORT` (optional, default `3000`)

## Local Run
```bash
cp .env.example .env
# fill REMOVEBG_API_KEY
npm install
npm start
```
Then open: `http://localhost:3000`

## Docker Run
```bash
docker build -t bgremover .
docker run -p 3000:3000 --env REMOVEBG_API_KEY=xxx bgremover
```

## API Endpoint
`POST /api/remove-background` with multipart form-data field `image`.

Returns `image/png` on success.

## Deployment Notes (Coolify)
- Build Pack: Dockerfile
- Port: `3000`
- Required env var: `REMOVEBG_API_KEY`
- Health check path: `/health`
