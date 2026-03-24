pip install -r requirements.txt
cd frontend
npm install
cd ..\mobile
npm install
Copy-Item .env.example .env -Force
code .env
npm run start:tunnel
cd ..
D:/SaiPrasad_FL/.venv/Scripts/python.exe run_backend.py
cd frontend
npm run dev -- --host
