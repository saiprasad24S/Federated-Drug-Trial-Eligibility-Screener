# Run Commands

## 1) Install Dependencies
```powershell
# from repo root
pip install -r requirements.txt

# frontend deps
cd frontend
npm install

# mobile deps
cd ../mobile
npm install

# back to root
cd ..
```

## 2) Start Backend (Terminal 1)
```powershell
# from repo root
D:/SaiPrasad_FL/.venv/Scripts/python.exe run_backend.py
```

## 3) Start Frontend (Terminal 2)
```powershell
# from repo root
cd frontend
npm run dev -- --host
```

## 4) Configure Mobile URL for Expo Go (One Time)
```powershell
# from repo root
cd mobile
copy .env.example .env
```

Set this in `mobile/.env`:
```env
EXPO_PUBLIC_WEB_APP_URL=http://<your-lan-ip>:3000
```

## 5) Start Expo Go Tunnel (Terminal 3)
```powershell
# from repo root
cd mobile
npm run start:tunnel
```

## 6) Open on Phone
```text
Open Expo Go app and scan the QR code shown in Terminal 3.
```
