# Complete Corrected blockchain/logger.py

This document shows the complete, corrected `blockchain/logger.py` file with all fixes applied.

## Key Fixes Summary

1. ✓ Load CONTRACT_ADDRESS from .env
2. ✓ Properly initialize self.contract using Web3.eth.contract()
3. ✓ Fix function name: logTrainingRound() (matches Solidity)
4. ✓ Fix accuracy scaling: multiply by 10000
5. ✓ Explicit transaction handling: nonce, gas, receipt waiting
6. ✓ Clear error messages with [BLOCKCHAIN] prefix
7. ✓ Input validation before sending
8. ✓ Return bool from log_training_metadata()
9. ✓ Keep mock fallback on connection failure

## Complete Code

```python
import os
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MockBlockchainLogger:
    """Mock blockchain logger for when blockchain is not available"""

    def __init__(self):
        self.logs = []
        print("Using mock blockchain logger - no real blockchain connection")

    def log_training_round(self, round_number: int, accuracy: float, loss: float, model_hash: str) -> str:
        """Log training round to memory"""
        timestamp = int(datetime.now().timestamp())
        log_entry = {
            "round": round_number,
            "accuracy": int(accuracy * 10000),  # Convert to basis points
            "loss": int(loss * 10000),
            "model_hash": model_hash,
            "timestamp": timestamp
        }
        self.logs.append(log_entry)
        print(f"Mock logged round {round_number}: accuracy={accuracy:.4f}, loss={loss:.4f}")
        return f"mock_tx_{round_number}"

    def get_logs(self) -> list:
        """Get all logged training rounds"""
        return self.logs

    def get_log_count(self) -> int:
        """Get number of logged rounds"""
        return len(self.logs)

    def log_data_upload(self, data_type: str, source: str, record_count: int, hospitals: list = None) -> str:
        """Log data upload to memory"""
        timestamp = int(datetime.now().timestamp())
        log_entry = {
            "type": "data_upload",
            "data_type": data_type,
            "source": source,
            "record_count": record_count,
            "hospitals": hospitals or [],
            "timestamp": timestamp
        }
        self.logs.append(log_entry)
        print(f"Mock logged data upload: {data_type} from {source}, {record_count} records")
        return f"mock_upload_{timestamp}"


class BlockchainLogger:
    """
    Blockchain logger for Federated Learning training metadata.
    
    Connects to Ethereum (Ganache for local development) and logs:
    - Training round number
    - Model accuracy (scaled by 10000)
    - Model hash (SHA256 of parameters, NOT the weights)
    - Timestamp
    
    NO patient data or model weights are stored on chain.
    Falls back to mock logging if blockchain connection fails.
    """

    def __init__(self):
        """Initialize blockchain connection and contract."""
        self.is_mock = False
        self.w3 = None
        self.contract = None
        self.contract_address = None
        self.account = None
        self.private_key = None
        self.mock_logger = None

        try:
            from web3 import Web3
            from eth_account import Account

            # ========== 1. LOAD ENVIRONMENT CONFIGURATION ==========
            self.is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"

            # Load private key (required)
            self.private_key = os.getenv("PRIVATE_KEY")
            if not self.private_key:
                raise ValueError(
                    "ERROR: PRIVATE_KEY environment variable not set in .env\n"
                    "Add: PRIVATE_KEY=your_ganache_private_key"
                )

            # Load contract address (required for real logging)
            self.contract_address = os.getenv("CONTRACT_ADDRESS")
            if not self.contract_address:
                raise ValueError(
                    "ERROR: CONTRACT_ADDRESS environment variable not set in .env\n"
                    "Deploy FederatedTrainingLogger.sol first and add: CONTRACT_ADDRESS=0x..."
                )

            # ========== 2. CONNECT TO BLOCKCHAIN ==========
            if self.is_local:
                provider_url = "http://127.0.0.1:8545"
                print(f"[BLOCKCHAIN] Connecting to local Ganache at {provider_url}...")
                self.w3 = Web3(Web3.HTTPProvider(provider_url))
            else:
                # Sepolia testnet
                infura_id = os.getenv("INFURA_PROJECT_ID")
                if not infura_id:
                    raise ValueError(
                        "ERROR: INFURA_PROJECT_ID environment variable not set\n"
                        "Add: INFURA_PROJECT_ID=your_infura_project_id"
                    )
                provider_url = f"https://sepolia.infura.io/v3/{infura_id}"
                print(f"[BLOCKCHAIN] Connecting to Sepolia testnet...")
                self.w3 = Web3(Web3.HTTPProvider(provider_url))

            # Validate connection
            if not self.w3.is_connected():
                raise ConnectionError(
                    f"Failed to connect to blockchain at {provider_url}\n"
                    "If using Ganache: ensure it's running with 'ganache'"
                )

            print(f"[BLOCKCHAIN] ✓ Connected successfully")

            # ========== 3. SET UP ACCOUNT ==========
            self.account = Account.from_key(self.private_key)
            print(f"[BLOCKCHAIN] Account: {self.account.address}")

            # ========== 4. BIND SMART CONTRACT ==========
            self.contract = self._get_contract()
            if not self.contract:
                raise RuntimeError("Failed to initialize contract")

            print(f"[BLOCKCHAIN] Contract address: {self.contract_address}")
            print("[BLOCKCHAIN] ✓ Ready for training metadata logging")
            print("[BLOCKCHAIN] ⚠ Only metadata logged (no patient data or model weights)")

            self.is_mock = False

        except Exception as e:
            print(f"\n[BLOCKCHAIN] ERROR: {e}")
            print("[BLOCKCHAIN] Falling back to mock blockchain logger\n")
            self.is_mock = True
            self.mock_logger = MockBlockchainLogger()

    def _get_contract(self):
        """
        Initialize and return the contract object.
        
        Returns:
            Contract instance bound to self.contract_address
            
        Raises:
            Exception if contract cannot be initialized
        """
        try:
            # ABI for FederatedTrainingLogger contract
            # This matches the Solidity contract functions
            contract_abi = [
                {
                    "inputs": [
                        {"internalType": "uint256", "name": "roundNumber", "type": "uint256"},
                        {"internalType": "uint256", "name": "accuracy", "type": "uint256"},
                        {"internalType": "string", "name": "modelHash", "type": "string"},
                        {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                    ],
                    "name": "logTrainingRound",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getLogCount",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
                    "name": "getTrainingLog",
                    "outputs": [
                        {"internalType": "uint256", "name": "roundNumber", "type": "uint256"},
                        {"internalType": "uint256", "name": "accuracy", "type": "uint256"},
                        {"internalType": "string", "name": "modelHash", "type": "string"},
                        {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]

            # Create contract object
            contract = self.w3.eth.contract(
                address=self.contract_address,
                abi=contract_abi
            )

            # Validate contract is accessible by calling a view function
            try:
                log_count = contract.functions.getLogCount().call()
                print(f"[BLOCKCHAIN] Contract validated: {log_count} existing logs")
                return contract
            except Exception as e:
                raise RuntimeError(
                    f"Contract at {self.contract_address} not accessible: {e}\n"
                    "Verify: 1) Contract is deployed, 2) Address is correct, 3) ABI matches"
                )

        except Exception as e:
            print(f"[BLOCKCHAIN] Contract initialization error: {e}")
            raise

    def log_training_metadata(self, round_number: int, accuracy: float, model_hash: str) -> bool:
        """
        Log training round metadata to blockchain (Ethereum).
        
        PRIVACY GUARANTEE: Only logs metadata, NEVER logs:
        - Patient data
        - Model weights
        - Raw training data
        
        Args:
            round_number: Federated learning round number (> 0)
            accuracy: Model accuracy as float (0.0 to 1.0)
            model_hash: SHA256 hash of model parameters (64 hex chars)
            
        Returns:
            True if successfully logged, False if failed
        """
        if self.is_mock:
            print(f"[BLOCKCHAIN] Using MOCK logger (not connected to real blockchain)")
            self.mock_logger.log_training_round(round_number, accuracy, 0.0, model_hash)
            return True

        if not self.contract or not self.contract_address:
            print(f"[BLOCKCHAIN] ERROR: Contract not initialized - cannot log training round")
            return False

        try:
            # ========== 1. VALIDATE INPUTS ==========
            if not isinstance(round_number, int) or round_number <= 0:
                raise ValueError(f"Round number must be positive integer, got: {round_number}")

            if not isinstance(accuracy, (int, float)) or not (0 <= accuracy <= 1):
                raise ValueError(f"Accuracy must be float 0-1, got: {accuracy}")

            if not isinstance(model_hash, str) or len(model_hash) != 64:
                raise ValueError(f"Model hash must be 64 hex chars, got: {len(model_hash)} chars")

            # ========== 2. SCALE ACCURACY FOR SOLIDITY ==========
            # Solidity stores: accuracy * 10000
            # e.g., 0.856 → 8560
            accuracy_scaled = int(accuracy * 10000)
            timestamp = int(datetime.utcnow().timestamp())

            print(f"[BLOCKCHAIN] Logging round {round_number}: accuracy={accuracy:.4f} ({accuracy_scaled}/10000), hash={model_hash[:8]}...")

            # ========== 3. BUILD TRANSACTION ==========
            # Get current nonce
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            # Estimate gas
            try:
                gas_estimate = self.contract.functions.logTrainingRound(
                    round_number,
                    accuracy_scaled,
                    model_hash,
                    timestamp
                ).estimate_gas({'from': self.account.address})
            except Exception as e:
                print(f"[BLOCKCHAIN] Gas estimation failed: {e}, using default 200000")
                gas_estimate = 200000

            gas_price = self.w3.eth.gas_price

            # Build transaction
            txn = self.contract.functions.logTrainingRound(
                round_number,
                accuracy_scaled,
                model_hash,
                timestamp
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': gas_estimate,
                'gasPrice': gas_price,
                'chainId': self.w3.eth.chain_id
            })

            print(f"[BLOCKCHAIN] Transaction prepared: nonce={nonce}, gas={gas_estimate}, gasPrice={gas_price}")

            # ========== 4. SIGN TRANSACTION ==========
            signed_txn = self.w3.eth.account.sign_transaction(txn, self.private_key)

            # ========== 5. SEND TRANSACTION ==========
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            print(f"[BLOCKCHAIN] Transaction sent: {tx_hash.hex()}")

            # ========== 6. WAIT FOR RECEIPT ==========
            print(f"[BLOCKCHAIN] Waiting for transaction confirmation...")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] == 1:
                print(f"[BLOCKCHAIN] ✓ CONFIRMED - Round {round_number} logged successfully")
                print(f"[BLOCKCHAIN] TX Hash: {tx_hash.hex()}")
                print(f"[BLOCKCHAIN] Block: {receipt['blockNumber']}, Gas Used: {receipt['gasUsed']}")
                return True
            else:
                print(f"[BLOCKCHAIN] ✗ FAILED - Transaction reverted on chain")
                print(f"[BLOCKCHAIN] TX Hash: {tx_hash.hex()}")
                return False

        except Exception as e:
            print(f"[BLOCKCHAIN] ✗ FAILED to log training metadata: {e}")
            print(f"[BLOCKCHAIN] Round: {round_number}, Accuracy: {accuracy}")
            import traceback
            traceback.print_exc()
            return False

    def get_logs(self, from_index: int = 0, max_count: int = 50) -> list:
        """
        Retrieve training logs from blockchain.
        
        Args:
            from_index: Starting log index
            max_count: Maximum number of logs to retrieve
            
        Returns:
            List of log entries with keys: round_number, accuracy, model_hash, timestamp
        """
        if self.is_mock:
            logs = self.mock_logger.get_logs()
            return logs[from_index:from_index + max_count]

        if not self.contract:
            print("[BLOCKCHAIN] Contract not available")
            return []

        try:
            # Get total log count
            total_logs = self.contract.functions.getLogCount().call()

            if from_index >= total_logs:
                return []

            # Calculate range
            end_index = min(from_index + max_count, total_logs)
            logs = []

            # Fetch logs
            for i in range(from_index, end_index):
                log_data = self.contract.functions.getTrainingLog(i).call()
                logs.append({
                    'round_number': log_data[0],
                    'accuracy': log_data[1] / 10000,  # Convert back to 0-1 range
                    'model_hash': log_data[2],
                    'timestamp': log_data[3]
                })

            return logs

        except Exception as e:
            print(f"[BLOCKCHAIN] Error retrieving logs: {e}")
            return []
```

## Changes from Original

### 1. __init__ Method
- Added explicit initialization of all instance variables at the start
- Load PRIVATE_KEY and CONTRACT_ADDRESS from .env with validation
- Call `_get_contract()` to properly initialize contract
- Check `self.w3.is_connected()` explicitly
- Clear error messages with [BLOCKCHAIN] prefix

### 2. New _get_contract() Method
- Extract contract initialization into separate method
- Use correct ABI with `logTrainingRound` (not addTrainingLog)
- Call `self.w3.eth.contract()` to create contract object
- Validate contract is accessible via getLogCount() call
- Raise clear errors if contract not found

### 3. log_training_metadata() Method
- **FIX**: Multiply accuracy by 10000 (not 1000)
- **FIX**: Call `logTrainingRound()` (not addTrainingLog)
- **FIX**: Explicit nonce management
- **FIX**: Gas estimation with fallback
- **FIX**: Include chainId in transaction
- **FIX**: Wait for receipt explicitly
- **FIX**: Check receipt['status'] for success
- **FIX**: Return bool (True/False)
- **FIX**: Input validation before sending
- Added detailed logging with [BLOCKCHAIN] prefix
- Full traceback on error

### 4. get_logs() Method
- Divide accuracy by 10000 (convert back from Solidity storage)
- Better error handling

## Usage Example

```python
from blockchain.logger import BlockchainLogger

# Initialize (auto-detects connection, falls back to mock if needed)
logger = BlockchainLogger()

# Log training metadata (only metadata - no patient data!)
success = logger.log_training_metadata(
    round_number=1,
    accuracy=0.856,
    model_hash="abc123def456..."  # 64 hex chars
)

if success:
    print("✓ Logged to blockchain")
else:
    print("✗ Failed - check logs above")

# Retrieve logs
logs = logger.get_logs()
for log in logs:
    print(f"Round {log['round_number']}: {log['accuracy']:.4f}")
```

## Testing

```bash
# Quick test
python test_setup.py

# Comprehensive diagnostic
python blockchain/diagnose.py

# Then start training
python api/main.py
```

See `BLOCKCHAIN_SETUP.md` for complete setup instructions.
