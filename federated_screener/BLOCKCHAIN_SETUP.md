# Blockchain Integration Setup Guide

## Overview

This guide explains how to set up the Ethereum blockchain integration for logging Federated Learning training metadata. The system logs immutable audit trails WITHOUT storing patient data or model weights.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            Federated Learning Training                       │
│                     ↓                                        │
│         blockchain/logger.py: BlockchainLogger               │
│                     ↓                                        │
│    ┌──────────────────────────────────────────┐             │
│    │ Is Ganache running?                      │             │
│    └──────────────┬──────────────────────────┘             │
│                   ├─ YES → Log to Ethereum ✓               │
│                   └─ NO  → Use Mock Logger (in-memory)     │
│                     ↓                                        │
│     FederatedTrainingLogger.sol (Smart Contract)            │
│     - logTrainingRound() function                           │
│     - Immutable training metadata                           │
└─────────────────────────────────────────────────────────────┘
```

## What Gets Logged to Blockchain

✅ **SAFE - Logged**:
- Round number
- Model accuracy (scaled by 10000)
- Model hash (SHA256 of parameters only)
- Timestamp

❌ **PROTECTED - NOT Logged**:
- Patient data (never shared)
- Model weights (only hash logged)
- Training data
- Hospital names/identifiers

## Setup Instructions

### Option 1: Local Development (Ganache) - RECOMMENDED

#### Step 1: Install Ganache

```bash
npm install -g ganache
```

#### Step 2: Start Ganache

```bash
ganache
```

Expected output:
```
ganache v7.x.x
Listening on http://127.0.0.1:8545
Account (0): 0x1234... (100 ETH)
Account (1): 0x5678... (100 ETH)
...
Private Keys:
(0) 0xabcd...
(1) 0xef01...
```

#### Step 3: Deploy Smart Contract

##### 3a. Using Truffle (Recommended)

```bash
npm install -g truffle
mkdir blockchain-deployment
cd blockchain-deployment
truffle init
```

Copy `FederatedTrainingLogger.sol` to `contracts/` directory.

```bash
truffle compile
truffle migrate --network development
```

Get the contract address from migration output.

##### 3b. Using Remix (Web IDE)

1. Go to https://remix.ethereum.org
2. Create new file: `FederatedTrainingLogger.sol`
3. Copy content from `blockchain/FederatedTrainingLogger.sol`
4. Click "Compile Solidity"
5. Click "Deploy & Run Transactions"
6. Change environment to "Web3 Provider"
7. Connect to `http://127.0.0.1:8545`
8. Deploy and copy contract address

#### Step 4: Configure .env

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env`:

```env
BLOCKCHAIN_LOCAL=true
PRIVATE_KEY=0xabcd...  # Copy from Ganache output (without 0x prefix for some wallets)
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3  # From deployment
```

#### Step 5: Test Connection

```bash
python test_setup.py
```

Expected output:
```
[BLOCKCHAIN] Connecting to local Ganache at http://127.0.0.1:8545...
[BLOCKCHAIN] ✓ Connected successfully
[BLOCKCHAIN] Account: 0x1234...
[BLOCKCHAIN] Contract address: 0x5FbDB...
[BLOCKCHAIN] ✓ Ready for training metadata logging
```

---

### Option 2: Sepolia Testnet

#### Step 1: Get Infura API Key

1. Sign up at https://infura.io
2. Create new project
3. Get API key

#### Step 2: Get Sepolia ETH

1. Go to https://sepoliafaucet.com
2. Connect your wallet
3. Request Sepolia ETH (takes 30 seconds - 1 minute)

#### Step 3: Deploy Contract

Use Remix (same as Step 3b above) but:
- Change environment to "Injected Provider - MetaMask"
- Switch MetaMask network to Sepolia
- Deploy contract

#### Step 4: Configure .env

```env
BLOCKCHAIN_LOCAL=false
INFURA_PROJECT_ID=your_key_here
PRIVATE_KEY=0xyour_private_key_here
CONTRACT_ADDRESS=0x...  # From deployment
```

#### Step 5: Test Connection

```bash
python test_setup.py
```

---

## Using the Logger in Code

### Basic Usage

```python
from blockchain.logger import BlockchainLogger

# Initialize logger
logger = BlockchainLogger()

# Log training round
success = logger.log_training_metadata(
    round_number=1,
    accuracy=0.856,  # 0-1 range
    model_hash="abc123...xyz"  # 64 hex chars (SHA256)
)

if success:
    print("Training metadata logged to blockchain!")
else:
    print("Failed to log - using mock logger")

# Retrieve logs
logs = logger.get_logs(from_index=0, max_count=10)
for log in logs:
    print(f"Round {log['round_number']}: {log['accuracy']:.4f} accuracy")
```

### In FL Server

```python
from fl_server.server import FederatedServer
from blockchain.logger import BlockchainLogger

class FederatedServer:
    def __init__(self, num_rounds: int = 10):
        self.num_rounds = num_rounds
        self.blockchain_logger = BlockchainLogger()  # Initializes with auto-fallback
    
    def evaluate_fn(self, server_round, parameters, config):
        # ... training code ...
        
        # Log to blockchain (safe - only logs metadata)
        self.blockchain_logger.log_training_metadata(
            round_number=server_round,
            accuracy=float(accuracy),
            model_hash=model_hash
        )
        
        return loss, {"accuracy": accuracy}
```

---

## Troubleshooting

### Error: "Cannot connect to blockchain at http://127.0.0.1:8545"

**Solution:**
```bash
ganache  # Start Ganache in a new terminal
```

### Error: "PRIVATE_KEY environment variable not set in .env"

**Solution:**
```bash
# Check .env file exists
ls -la .env

# Copy example
cp .env.example .env

# Edit .env with your private key from Ganache
nano .env
```

### Error: "CONTRACT_ADDRESS environment variable not set"

**Solution:**
1. Deploy the smart contract first
2. Copy the address from deployment output
3. Add to `.env`: `CONTRACT_ADDRESS=0x...`

### Error: "Contract at 0x... not accessible"

**Solution:**
- Verify contract was deployed to this address: Check Ganache logs
- Verify you're using the correct network:
  - If `BLOCKCHAIN_LOCAL=true`: Ganache must be running
  - If `BLOCKCHAIN_LOCAL=false`: Check Sepolia is accessible (Infura working)
- Verify ABI matches contract: ABI in logger.py must match deployed contract

### Logs falling back to Mock Logger

**Check:**
```bash
python -c "from blockchain.logger import BlockchainLogger; logger = BlockchainLogger()"
```

If output shows `[BLOCKCHAIN] Using MOCK logger`:
1. Check Ganache is running
2. Check `.env` has `PRIVATE_KEY` and `CONTRACT_ADDRESS`
3. Check contract is deployed to specified address
4. Run `test_setup.py` for detailed diagnostics

---

## Verification & Testing

### 1. Check Blockchain Connection

```bash
python -c "
from blockchain.logger import BlockchainLogger
logger = BlockchainLogger()
print(f'Connected: {logger.w3.is_connected()}')
print(f'Mock mode: {logger.is_mock}')
"
```

### 2. Test Logging

```python
from blockchain.logger import BlockchainLogger

logger = BlockchainLogger()

# Test metadata logging
success = logger.log_training_metadata(
    round_number=1,
    accuracy=0.85,
    model_hash="a" * 64
)

print(f"Log successful: {success}")

# Retrieve logs
logs = logger.get_logs()
print(f"Total logs: {len(logs)}")
```

### 3. View on Ganache/Etherscan

**For Ganache:**
- Check Ganache terminal for transaction details
- Verify gas usage and block number

**For Sepolia:**
- Visit https://sepolia.etherscan.io
- Paste contract address in search
- View all transactions and storage

---

## Performance & Costs

| Network | Cost | Speed | Best For |
|---------|------|-------|----------|
| Ganache | Free | Instant | Development |
| Sepolia | ~$0.01 per log | 5-30 seconds | Testing |
| Ethereum Mainnet | $1-5 per log | 10-20 seconds | Production |

### Transaction Optimization

Current implementation:
- Gas limit: Auto-estimated (typically 150k-200k per log)
- Gas price: Network default
- Logs: Single transaction per round

To reduce costs:
- Batch multiple rounds (not implemented yet)
- Use Layer 2 (Arbitrum/Optimism) - requires contract redeployment

---

## Security Considerations

### Private Key Management

✅ DO:
- Store in `.env` file (add to `.gitignore`)
- Use Ganache accounts for development
- Use dedicated testnet wallet for Sepolia
- Rotate keys regularly in production

❌ DON'T:
- Commit `.env` to git
- Share private keys
- Use mainnet keys in development
- Store in code/comments

### Contract Ownership

The `FederatedTrainingLogger.sol` uses `Ownable` pattern:
- Only owner (deployer) can call `logTrainingRound()`
- Prevents unauthorized logging
- Backend server account must be owner

### Privacy Guarantee

- ✅ Model hash only (not weights)
- ✅ No patient identifiers
- ✅ No training data
- ✅ Immutable audit trail
- ✅ Transparent (anyone can verify)

---

## Next Steps

1. **Set up local blockchain** (this guide, Step 1-2)
2. **Deploy smart contract** (this guide, Step 3)
3. **Configure .env** (this guide, Step 4)
4. **Test setup** (this guide, Step 5)
5. **Run FL training** - logs automatically!

## References

- [Ganache Documentation](https://github.com/trufflesuite/ganache)
- [Web3.py Documentation](https://web3py.readthedocs.io/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethereum Development](https://ethereum.org/en/developers/)
