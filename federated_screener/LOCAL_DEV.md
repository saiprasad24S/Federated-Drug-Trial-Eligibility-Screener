Local Development (mock blockchain)

This guide explains how to run the backend, frontend, and optional local blockchain for development.

Requirements (recommended):
- Python 3.10+ with virtualenv
- Node.js 18+ and npm
- (Optional) Ganache GUI or compatible Ganache CLI for local Ethereum RPC

Start backend (uses mock blockchain by default)

1. Create Python venv and install requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Ensure `.env` exists. You may keep placeholder values for blockchain settings if you do NOT want on-chain logging. Example (already present):

```
BLOCKCHAIN_LOCAL=true
INFURA_PROJECT_ID=your_infura_project_id_here
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=your_deployed_contract_address_here
```

3. Start the backend API (mock logger will be used when blockchain config is missing or invalid):

```powershell
python run_backend.py
```

Notes:
- The API will print `[BLOCKCHAIN] Mode: MOCK` when it uses the mock logger.
- The backend will not crash when blockchain config is invalid; it will continue with the mock implementation.

Start frontend

1. Install node deps and start dev server:

```powershell
cd frontend
npm install
npm run dev
```

2. Open the Vite dev URL shown in the terminal (usually http://localhost:5173).

Optional: enable local blockchain (Ganache)

1. Install or open Ganache GUI. Ensure RPC endpoint is at http://127.0.0.1:8545.
2. If you want the backend to log to the local chain, update `.env` with a PRIVATE_KEY from an unlocked Ganache account and set `CONTRACT_ADDRESS` to a deployed contract address.
3. Restart the backend. It will print `[BLOCKCHAIN] Mode: REAL` when connected.

Troubleshooting

- If `ganache` CLI fails due to native binary issues, use the Ganache GUI app or reinstall Ganache matching your Node.js version.
- If the backend logs still show MOCK mode, double-check `.env` values for valid hex keys (no angle brackets or placeholders).

Security

- Do NOT commit real private keys to source control. Use `.env` and your local `.gitignore`.

Contact

If you want, I can attempt to deploy the supplied contracts to a local Ganache instance and update `.env` automatically. Reply with permission to proceed.