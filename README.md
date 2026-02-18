# Background Remover Web App (No External API)

Production-ready Node.js web app that removes image backgrounds **locally on your server** using `@imgly/background-removal-node`.

## Features
- Upload any image from browser
- Runs background removal on the server (no remove.bg API)
- Returns transparent PNG for download
- Minimal UI + preview
- Dockerized for deployment (Coolify-ready)

## Tech Stack
- Node.js + Express
- Multer (in-memory upload)
- `@imgly/background-removal-node`
- Static HTML/CSS/JS frontend

## Environment Variables
- `BGREMOVER_MODEL` (optional): `small` (default, faster) or `medium` (better quality)
- `PORT` (optional, default `3000`)

## Local Run
```bash
cp .env.example .env
npm install
npm start
```
Then open: `http://localhost:3000`

> First request can be slower because model assets are downloaded and cached.

## Docker Run
```bash
docker build -t bgremover .
docker run -p 3000:3000 --env BGREMOVER_MODEL=small bgremover
```

## API Endpoint
`POST /api/remove-background` with multipart form-data field `image`.

Returns `image/png` on success.

## Deployment Notes (Coolify)
- Build Pack: Dockerfile
- Port: `3000`
- No external API key needed
- Optional env var: `BGREMOVER_MODEL=small`
- Health check path: `/health`
