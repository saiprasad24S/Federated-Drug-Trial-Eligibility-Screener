# Blockchain Setup Checklist

Complete this checklist to verify your blockchain integration is working correctly.

## Pre-Setup Requirements

- [ ] Node.js and npm installed
- [ ] Python 3.8+ installed
- [ ] Project dependencies installed (`pip install -r requirements.txt`)

---

## Step 1: Ganache Installation & Setup

- [ ] Install Ganache globally: `npm install -g ganache`
- [ ] Start Ganache: `ganache` (in separate terminal)
- [ ] Ganache running on `http://127.0.0.1:8545` ✓
- [ ] Copy first account's private key from Ganache output (save it, you'll need it)
- [ ] Verify Ganache shows "Listening on http://127.0.0.1:8545"

**Terminal Output Example**:
```
ganache v7.9.2
Listening on http://127.0.0.1:8545
Account (0): 0x1234567890... (100 ETH)
Private Key: 0xabcdef1234567890...
```

---

## Step 2: Smart Contract Deployment

Choose ONE method below:

### Option A: Using Truffle (Recommended)

```bash
npm install -g truffle
mkdir blockchain-deployment
cd blockchain-deployment
truffle init
```

- [ ] Copy `federated_screener/blockchain/FederatedTrainingLogger.sol` to `contracts/`
- [ ] Run: `truffle compile`
- [ ] Run: `truffle migrate --network development`
- [ ] **Copy contract address from output** (looks like `0x5FbDB...`)
- [ ] Verify "FederatedTrainingLogger" deployment successful

### Option B: Using Remix Web IDE

- [ ] Go to https://remix.ethereum.org
- [ ] Create new file `FederatedTrainingLogger.sol`
- [ ] Copy content from `federated_screener/blockchain/FederatedTrainingLogger.sol`
- [ ] Click "Compile Solidity" (left sidebar)
- [ ] Click "Deploy & Run Transactions"
- [ ] Set environment to "Injected Provider - MetaMask" (for Ganache, may need custom setup)
- [ ] Deploy contract
- [ ] **Copy deployed contract address**

---

## Step 3: Environment Configuration

### Create .env file

```bash
cd federated_screener
cp .env.example .env
```

- [ ] `.env` file created (not `.env.example`)
- [ ] `.env` added to `.gitignore` (security!)

### Edit .env with your values

```bash
nano .env
# or your preferred editor
```

**Fill in these values**:
- [ ] `BLOCKCHAIN_LOCAL=true` (for Ganache)
- [ ] `PRIVATE_KEY=0x...` (from Ganache Account 0, step 1)
- [ ] `CONTRACT_ADDRESS=0x...` (from deployment, step 2)

**Example .env**:
```env
BLOCKCHAIN_LOCAL=true
PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

- [ ] All three values filled in
- [ ] No empty values
- [ ] Private key starts with `0x`
- [ ] Contract address starts with `0x`

---

## Step 4: Verify Environment Loading

```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('BLOCKCHAIN_LOCAL:', os.getenv('BLOCKCHAIN_LOCAL'))
print('PRIVATE_KEY set:', bool(os.getenv('PRIVATE_KEY')))
print('CONTRACT_ADDRESS:', os.getenv('CONTRACT_ADDRESS'))
"
```

- [ ] Shows all three values correctly
- [ ] PRIVATE_KEY shows "True" (set but not displayed for security)

---

## Step 5: Test Setup

```bash
python test_setup.py
```

Expected output:
```
✓ Data loaded: ... train, ... test samples
✓ Class weights: ...
✓ Model created with input shape: ...
⚠ Blockchain not connected (expected if Ganache not running)
```

- [ ] Data loading test: PASS ✓
- [ ] Model creation test: PASS ✓
- [ ] Blockchain test: Shows message (may warn if Ganache not running, that's OK)

---

## Step 6: Run Blockchain Diagnostic

```bash
python blockchain/diagnose.py
```

This comprehensive diagnostic checks:
1. Environment variables
2. Web3 connection
3. Account balance
4. Contract deployment
5. Test transaction

**Expected output for each section**:
- [ ] ENVIRONMENT CONFIGURATION: All values set
- [ ] WEB3 CONNECTION: ✓ Connected successfully
- [ ] ACCOUNT & BALANCE: Shows address and >0 ETH
- [ ] SMART CONTRACT: ✓ Contract found at address
- [ ] TEST TRANSACTION: ✓ Test transaction SUCCESSFUL!
- [ ] SUMMARY: 5/5 checks passed

If any checks fail:
- [ ] Review error messages (they're detailed)
- [ ] Check corresponding setup step above
- [ ] See BLOCKCHAIN_SETUP.md for troubleshooting

---

## Step 7: Start Backend & Training

### Terminal 1: Keep Ganache Running
```bash
ganache
```
- [ ] Ganache still running from Step 1
- [ ] Block number increasing

### Terminal 2: Start Backend API
```bash
cd federated_screener
python api/main.py
```

Expected output:
```
[BLOCKCHAIN] Connecting to local Ganache at http://127.0.0.1:8545...
[BLOCKCHAIN] ✓ Connected successfully
[BLOCKCHAIN] Account: 0x1234...
[BLOCKCHAIN] Contract address: 0x5FbDB...
[BLOCKCHAIN] ✓ Ready for training metadata logging
INFO:     Uvicorn running on http://0.0.0.0:8002
```

- [ ] Shows blockchain is connected (not in mock mode)
- [ ] No connection errors
- [ ] API running on http://0.0.0.0:8002

### Terminal 3 (Optional): Start Frontend
```bash
cd federated_screener/frontend
npm run dev
```

- [ ] Frontend running on http://localhost:3000
- [ ] Can log in with demo credentials
- [ ] Can start training

---

## Step 8: Verify Logging

When training starts, watch the backend terminal for blockchain logging:

```
[BLOCKCHAIN] Logging round 1: accuracy=0.8560 (8560/10000), hash=a1b2c3d4...
[BLOCKCHAIN] Transaction prepared: nonce=0, gas=156789, gasPrice=2000000000
[BLOCKCHAIN] Transaction sent: 0xabcdef1234567890...
[BLOCKCHAIN] Waiting for transaction confirmation...
[BLOCKCHAIN] ✓ CONFIRMED - Round 1 logged successfully
[BLOCKCHAIN] TX Hash: 0xabcdef1234567890...
[BLOCKCHAIN] Block: 42, Gas Used: 156789
```

- [ ] Each round shows blockchain logging
- [ ] Transaction hash displayed
- [ ] Shows "CONFIRMED" for successful logs
- [ ] No errors in blockchain logging

---

## Troubleshooting Checklist

### "Cannot connect to blockchain"
- [ ] Is Ganache running? (`ganache` command in Terminal 1)
- [ ] Is Ganache on http://127.0.0.1:8545 ? (default port)
- [ ] Check `BLOCKCHAIN_LOCAL=true` in .env

### "Contract not found at address"
- [ ] Did you deploy FederatedTrainingLogger.sol? (Step 2)
- [ ] Is CONTRACT_ADDRESS correct in .env? (copy from deployment output)
- [ ] Is Ganache running (contracts only exist when Ganache is running)?

### "PRIVATE_KEY environment variable not set"
- [ ] Is .env file in the right directory? (federated_screener/)
- [ ] Does .env have PRIVATE_KEY=0x...? (not empty)
- [ ] Is private key copied from Ganache Account 0? (first account)

### "Blockchain connection failed: Invalid value provided. The private key must be a 32 bytes hexstring"
- [ ] Remove `0x` prefix if present: `PRIVATE_KEY=abcdef...` (or keep it: `PRIVATE_KEY=0xabcdef...`)
- [ ] Is private key exactly 64 hex characters (32 bytes)?
- [ ] No spaces or special characters?

### "Falling back to mock blockchain logger"
- [ ] Run `python blockchain/diagnose.py` to find the root cause
- [ ] Check all 5 checks pass: Environment → Web3 → Account → Contract → Transaction

### Transaction hangs/times out
- [ ] Check Ganache is still running (it might have crashed)
- [ ] Check gas price and balance (too low gas = transactions fail)
- [ ] Restart Ganache: `ganache`

---

## Data Privacy Verification

Verify ONLY metadata is logged (no patient data):

On Ganache:
```bash
# Check transaction details in Ganache terminal
# Look for block numbers and gas usage
```

What's logged ✓:
- Round number (integer)
- Accuracy (scaled by 10000)
- Model hash (64 hex chars, SHA256)
- Timestamp (Unix timestamp)

What's NOT logged ✓:
- Patient names/IDs
- Medical records
- Model weights
- Training data
- Hospital identifiers

---

## Final Verification Checklist

Run all checks ONE MORE TIME:

```bash
python test_setup.py          # Should PASS all tests
python blockchain/diagnose.py  # Should show 5/5 checks passed
```

Then start training and watch backend logs:

```bash
python api/main.py
```

- [ ] Backend API starts with blockchain connected
- [ ] Each training round shows blockchain logging
- [ ] Transactions confirmed with hashes
- [ ] No errors in logs

---

## Success Indicators

You're ready to go! ✓ if:

1. ✓ Ganache running on http://127.0.0.1:8545
2. ✓ Smart contract deployed (have CONTRACT_ADDRESS)
3. ✓ .env file configured with PRIVATE_KEY and CONTRACT_ADDRESS
4. ✓ `python blockchain/diagnose.py` shows 5/5 checks passed
5. ✓ Backend API runs with blockchain connected (not in mock mode)
6. ✓ Training logs show blockchain transaction hashes
7. ✓ No errors about missing environment variables

---

## Support Resources

- **Blockchain Setup Guide**: See `BLOCKCHAIN_SETUP.md`
- **Fixes Explanation**: See `BLOCKCHAIN_FIXES.md`
- **Smart Contract**: See `blockchain/FederatedTrainingLogger.sol`
- **Blockchain Logger**: See `blockchain/logger.py`

## Need Help?

1. Read the error message carefully (they're detailed now!)
2. Run `python blockchain/diagnose.py` for diagnostics
3. Check BLOCKCHAIN_SETUP.md troubleshooting section
4. Verify all steps 1-6 above are completed
