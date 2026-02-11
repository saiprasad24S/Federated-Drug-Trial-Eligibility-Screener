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
    def __init__(self):
        # Try to connect to blockchain, fall back to mock if not available
        try:
            from web3 import Web3
            from eth_account import Account
            import json

            # Connect to local Ganache or Sepolia
            self.is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"

            if self.is_local:
                self.w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
            else:
                # Sepolia testnet
                self.w3 = Web3(Web3.HTTPProvider(f"https://sepolia.infura.io/v3/{os.getenv('INFURA_PROJECT_ID')}"))

            if not self.w3.is_connected():
                raise ConnectionError("Cannot connect to blockchain")

            # Load private key from environment
            self.private_key = os.getenv("PRIVATE_KEY")
            if not self.private_key:
                raise ValueError("PRIVATE_KEY environment variable not set")

            self.account = Account.from_key(self.private_key)

            # FederatedTrainingLogger contract ABI
            self.contract_abi = [
                {
                    "inputs": [
                        {"internalType": "uint256", "name": "roundNumber", "type": "uint256"},
                        {"internalType": "uint256", "name": "accuracy", "type": "uint256"},
                        {"internalType": "string", "name": "modelHash", "type": "string"},
                        {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                    ],
                    "name": "addTrainingLog",
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
            },
            {
                "inputs": [
                    {"internalType": "uint256", "name": "startIndex", "type": "uint256"},
                    {"internalType": "uint256", "name": "count", "type": "uint256"}
                ],
                "name": "getTrainingLogs",
                "outputs": [
                    {
                        "components": [
                            {"internalType": "uint256", "name": "roundNumber", "type": "uint256"},
                            {"internalType": "uint256", "name": "accuracy", "type": "uint256"},
                            {"internalType": "string", "name": "modelHash", "type": "string"},
                            {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                        ],
                        "internalType": "struct FederatedTrainingLogger.TrainingLog[]",
                        "name": "",
                        "type": "tuple[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]

            self.is_mock = False
            print("Connected to blockchain successfully")

        except Exception as e:
            print(f"Blockchain connection failed: {e}")
            print("Falling back to mock blockchain logger")
            # Fall back to mock implementation
            self.mock_logger = MockBlockchainLogger()
            self.is_mock = True

    def log_training_metadata(self, round_number: int, accuracy: float, model_hash: str):
        """
        Log training metadata to blockchain.

        Args:
            round_number: Current FL round
            accuracy: Model accuracy (multiplied by 100 for integer storage)
            model_hash: SHA256 hash of model parameters
        """
        if self.is_mock:
            return self.mock_logger.log_training_round(round_number, accuracy, 0.0, model_hash)  # Mock doesn't track loss

        if not self.contract_address:
            print("Contract address not set, skipping blockchain logging")
            return

        try:
            # Convert accuracy to integer (multiply by 1000 for 3 decimal places)
            accuracy_int = int(accuracy * 1000)
            timestamp = int(datetime.utcnow().timestamp())

            # Build transaction
            txn = self.contract.functions.addTrainingLog(
                round_number,
                accuracy_int,
                model_hash,
                timestamp
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })

            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            print(f"Blockchain log successful: Round {round_number}, TX: {tx_hash.hex()}")

        except Exception as e:
            print(f"Blockchain logging failed: {e}")

    def get_logs(self, from_index: int = 0, max_count: int = 50) -> list:
        """
        Retrieve logs from blockchain using contract getters.

        Args:
            from_index: Starting log index
            max_count: Maximum number of logs to retrieve

        Returns:
            List of log entries
        """
        if self.is_mock:
            logs = self.mock_logger.get_logs()
            return logs[from_index:from_index + max_count]

        if not self.contract_address:
            return []

        try:
            # Get total log count
            total_logs = self.contract.functions.getLogCount().call()

            if from_index >= total_logs:
                return []

            # Calculate how many logs to fetch
            end_index = min(from_index + max_count, total_logs)
            logs = []

            # Fetch logs individually (could be optimized with getTrainingLogs for batch)
            for i in range(from_index, end_index):
                log_data = self.contract.functions.getTrainingLog(i).call()
                logs.append({
                    'round_number': log_data[0],
                    'accuracy': log_data[1] / 1000,  # Convert back to float
                    'model_hash': log_data[2],
                    'timestamp': log_data[3]
                })

            return logs

        except Exception as e:
            print(f"Failed to retrieve logs: {e}")
            return []

    def get_logs_by_events(self, from_block: int = 0) -> list:
        """
        Retrieve logs from blockchain using events (alternative method).

        Args:
            from_block: Starting block number

        Returns:
            List of log events
        """
        if self.is_mock:
            return self.mock_logger.get_logs()

        if not self.contract_address:
            return []

        try:
            # Get past events
            events = self.contract.events.TrainingLogAdded.create_filter(
                fromBlock=from_block
            ).get_all_entries()

            return [{
                'round_number': event['args']['roundNumber'],
                'accuracy': event['args']['accuracy'] / 1000,  # Convert back to float
                'model_hash': event['args']['modelHash'],
                'timestamp': event['args']['timestamp']
            } for event in events]

        except Exception as e:
            print(f"Failed to retrieve event logs: {e}")
            return []