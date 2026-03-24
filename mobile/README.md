# Mobile (Expo Go)

This folder adds an Expo Go entry point so you can open the project from your phone.

## 1) Start backend and web frontend

From repository root:

```bash
# backend (already uses port 8001)
d:/SaiPrasad_FL/.venv/Scripts/python.exe run_backend.py
```

From `frontend/`:

```bash
npm run dev -- --host
```

## 2) Configure mobile URL

In `mobile/`, copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_WEB_APP_URL` to a URL your phone can reach.
- Same Wi-Fi: `http://<your-lan-ip>:3000`
- Public tunnel: use an ngrok/cloudflared URL that points to your Vite frontend.

## 3) Start Expo tunnel

From `mobile/`:

```bash
npm install
npm run start:tunnel
```

Scan the QR code in Expo Go.

## Notes

- Expo tunnel exposes the JavaScript bundle for the mobile app itself.
- The WebView target URL must still be reachable by the phone (LAN IP or a public web tunnel).
