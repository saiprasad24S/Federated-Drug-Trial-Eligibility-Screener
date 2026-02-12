import os
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv
import os
import time
import json
import queue
import threading
import logging
import hashlib
import traceback
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv

# MongoDB persistence helper (imported lazily to avoid circular imports)
_db_module = None

def _get_db():
    """Lazily import the database module."""
    global _db_module
    if _db_module is None:
        try:
            import sys, importlib
            # Ensure the parent package is on the path
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.insert(0, parent_dir)
            _db_module = importlib.import_module("database")
        except Exception:
            _db_module = False  # mark as unavailable
    return _db_module if _db_module else None

# Load environment variables
load_dotenv()

# Expose Web3 and Account at module scope so tests can monkeypatch them.
# If the packages aren't installed, these will be None and initialization
# will fall back to the mock logger.
try:
    from web3 import Web3
    from eth_account import Account
except Exception:
    Web3 = None
    Account = None


class ConfigurationError(Exception):
    """Raised when required blockchain configuration is missing or invalid."""


def _make_logger() -> logging.Logger:
    """Create and configure a logger for the blockchain module."""
    logger = logging.getLogger("blockchain")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter("[BLOCKCHAIN] %(levelname)s: %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


logger = _make_logger()


class MockBlockchainLogger:
    """Mock logger used when blockchain is unavailable.

    Useful for development and tests; keeps raw metadata off-chain.
    Supports both training-round logs and general audit event logs.
    All logs are persisted to MongoDB.
    """

    def __init__(self) -> None:
        self._logs = []          # training round logs (in-memory cache)
        self._audit_logs = []    # general audit trail (in-memory cache)
        self.is_mock = True
        self._lock = threading.Lock()
        self._db_module = None   # Lazy-loaded database module for MongoDB
        logger.info("Using mock blockchain logger - no real blockchain connection")

        # Import database module for MongoDB persistence
        try:
            import database as _db
            self._db_module = _db
            logger.info("MongoDB persistence: enabled (all logs stored in MongoDB)")
        except ImportError:
            logger.warning("MongoDB persistence: DISABLED (database module not available)")

        class _MockW3:
            def is_connected(self_inner):
                return False

        # Provide minimal `w3` compatibility to avoid attribute errors in callers
        self.w3 = _MockW3()

    def _persist_audit_to_mongo(self, entry: dict) -> None:
        """Write a single audit log entry to MongoDB (best-effort)."""
        if self._db_module is None:
            return
        try:
            self._db_module.insert_audit_log_sync(entry)
        except Exception as e:
            logger.warning(f"Could not persist audit log to MongoDB: {e}")

    def _persist_training_to_mongo(self, entry: dict) -> None:
        """Write a single training log entry to MongoDB (best-effort)."""
        if self._db_module is None:
            return
        try:
            self._db_module.insert_training_log_sync(entry)
        except Exception as e:
            logger.warning(f"Could not persist training log to MongoDB: {e}")

    def _generate_tx_hash(self, seed: str = "") -> str:
        """Generate a realistic-looking mock transaction hash."""
        raw = f"{seed}_{time.time()}_{len(self._audit_logs)}"
        return "0x" + hashlib.sha256(raw.encode()).hexdigest()[:40]

    def enqueue(self, payload: Dict[str, Any]) -> str:
        ts = int(time.time())
        entry = {**payload, "timestamp": payload.get("timestamp", ts)}
        with self._lock:
            self._logs.append(entry)
        self._persist_training_to_mongo(entry)
        logger.info(f"Mock enqueued round {entry.get('round_number')}")
        return f"mock_tx_{entry.get('round_number')}_{ts}"

    def enqueue_training_metadata(self, round_number: int, accuracy: float, model_hash: str) -> Tuple[bool, Optional[str]]:
        """Enqueue training metadata (matches BlockchainLogger interface)."""
        try:
            ts = int(time.time())
            tx_hash = self._generate_tx_hash(f"training_{round_number}")
            entry = {
                "round_number": round_number,
                "accuracy": accuracy,
                "model_hash": model_hash,
                "timestamp": ts,
                "txHash": tx_hash,
            }
            audit_entry = {
                    "action": "TRAINING_ROUND",
                    "details": f"Round {round_number} completed — accuracy {accuracy:.4f}",
                    "actor": "FL Server",
                    "record_count": 1,
                    "timestamp": ts,
                    "txHash": tx_hash,
                    "metadata": {"round": round_number, "accuracy": accuracy, "model_hash": model_hash},
                }
            with self._lock:
                self._logs.append(entry)
                self._audit_logs.append(audit_entry)
            self._persist_training_to_mongo(entry)
            self._persist_audit_to_mongo(audit_entry)
            logger.info(f"Mock enqueued training metadata for round {round_number}")
            return True, tx_hash
        except Exception as e:
            logger.error(f"Mock enqueue failed: {e}")
            return False, str(e)

    def log_event(self, action: str, details: str = "", actor: str = "System",
                  record_count: int = 0, metadata: Dict[str, Any] = None) -> str:
        """Log a general audit event (patient upload, eligibility check, etc.)."""
        ts = int(time.time())
        tx_hash = self._generate_tx_hash(f"{action}_{details}")
        entry = {
            "action": action,
            "details": details,
            "actor": actor,
            "record_count": record_count,
            "timestamp": ts,
            "txHash": tx_hash,
            "metadata": metadata or {},
        }
        with self._lock:
            self._audit_logs.append(entry)
        self._persist_audit_to_mongo(entry)
        logger.info(f"Mock audit log: {action} — {details}")
        return tx_hash

    def log_data_upload(self, data_type: str, source: str, record_count: int,
                        hospitals: list = None) -> str:
        """Log a patient data upload event."""
        hosp_str = ", ".join(hospitals) if hospitals else "Unknown"
        return self.log_event(
            action="DATA_UPLOAD",
            details=f"{data_type} file uploaded from {source} ({record_count} records, hospitals: {hosp_str})",
            actor=source,
            record_count=record_count,
            metadata={"data_type": data_type, "hospitals": hospitals or [], "record_count": record_count},
        )

    def log_patient_action(self, action: str, patient_count: int = 0,
                           actor: str = "System", details: str = "") -> str:
        """Log a patient-related action (view, screen, predict, etc.)."""
        return self.log_event(
            action=action,
            details=details,
            actor=actor,
            record_count=patient_count,
        )

    def get_logs(self) -> list:
        with self._lock:
            return list(self._logs)

    def get_audit_logs(self) -> list:
        """Return all audit trail entries, newest first."""
        with self._lock:
            return list(reversed(self._audit_logs))

    def get_log_count(self) -> int:
        return len(self._logs)

    def get_audit_log_count(self) -> int:
        return len(self._audit_logs)

    def verify(self, onchain_hash: str, local_metadata: Dict[str, Any]) -> bool:
        """Verify provided local metadata against an on-chain hash."""
        meta_hash = BlockchainLogger.compute_metadata_hash_static(local_metadata)
        return meta_hash == onchain_hash


@dataclass
class _QueueItem:
    round_number: int
    accuracy: float
    model_hash: str
    timestamp: int
    retries: int = 0


class BlockchainLogger:
    """
    Robust Blockchain logger with async queue, retries, and verification helpers.

    Design choices / why they matter:
    - Non-blocking: enqueue metadata so FL training isn't delayed by RPC latency.
    - Hashing: store only a SHA256 of metadata on-chain to avoid exposing raw info.
    - Retries: transient RPC failures are retried with exponential backoff.
    - Strict mode: fail loudly on misconfiguration in production; dev may choose fallback.
    - Health checks and observability: startup checks and queue status help operations.
    """

    def __init__(
        self,
        strict: bool = False,
        retry_attempts: int = 3,
        receipt_timeout: int = 120,
        worker_sleep: float = 1.0,
        allow_mock_fallback: bool = True,
    ) -> None:
        """Initialize blockchain access and start background worker.

        Args:
            strict: If True, raise ConfigurationError for missing config. If False, fall back to mock.
            retry_attempts: Number of times to retry transient failures.
            receipt_timeout: Seconds to wait for transaction receipt.
            worker_sleep: Sleep between worker loop iterations.
            allow_mock_fallback: If True, will fallback to mock on init failure regardless of strict.
        """
        self.strict = strict
        self.retry_attempts = retry_attempts
        self.receipt_timeout = receipt_timeout
        self.worker_sleep = worker_sleep
        self.allow_mock_fallback = allow_mock_fallback

        self.is_mock = False
        self.w3 = None
        self.contract = None
        self.contract_address: Optional[str] = None
        self.account = None
        self.private_key: Optional[str] = None

        # Queue and worker
        self._queue: "queue.Queue[_QueueItem]" = queue.Queue()
        self._worker_thread: Optional[threading.Thread] = None
        self._stop_worker = threading.Event()

        # Track rounds to avoid duplicates (in-memory). For robust uniqueness, also check on-chain.
        self._logged_rounds = set()

        try:
            self._init_blockchain()
            # Start worker thread
            self._start_worker()
            logger.info("BlockchainLogger initialized successfully - REAL mode")
        except Exception as exc:
            logger.error(f"Initialization failed: {exc}")
            if strict and not allow_mock_fallback:
                raise
            logger.warning("Falling back to MockBlockchainLogger due to initialization failure")
            self.is_mock = True
            self.mock_logger = MockBlockchainLogger()

    # ----------------- Initialization helpers -----------------
    def _init_blockchain(self) -> None:
        """Load configuration, connect to provider, set up account and contract.

        Raises ConfigurationError on fatal misconfiguration.
        """
        # Ensure Web3 and Account are available (tests may monkeypatch module-level names)
        if Web3 is None or Account is None:
            raise ConfigurationError("web3 or eth_account not available")

        self.is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"

        # RPC provider
        if self.is_local:
            provider_url = os.getenv("BLOCKCHAIN_RPC", "http://127.0.0.1:8545")
        else:
            infura_id = os.getenv("INFURA_PROJECT_ID")
            if not infura_id:
                raise ConfigurationError("INFURA_PROJECT_ID not set for non-local network")
            provider_url = f"https://sepolia.infura.io/v3/{infura_id}"

        if not provider_url:
            raise ConfigurationError("Blockchain RPC provider URL not configured")

        logger.info(f"Connecting to blockchain RPC at {provider_url} (local={self.is_local})")
        # Use module-level Web3 (tests can monkeypatch this)
        try:
            if hasattr(Web3, "HTTPProvider"):
                provider = Web3.HTTPProvider(provider_url)
                self.w3 = Web3(provider)
            else:
                # Some tests monkeypatch `Web3` as a callable that accepts the provider URL
                self.w3 = Web3(provider_url)
        except Exception as e:
            raise ConfigurationError(f"Unable to construct Web3 provider: {e}")

        if not self.w3.is_connected():
            raise ConfigurationError(f"Unable to connect to RPC at {provider_url}")

        logger.info("Connected to blockchain RPC")

        # Private key and account
        self.private_key = os.getenv("PRIVATE_KEY")
        self._use_node_account = False

        if not self.private_key:
            # Allow using unlocked local node account when running in local mode
            if self.is_local:
                try:
                    accounts = self.w3.eth.accounts
                    if accounts:
                        addr = accounts[0]
                        # lightweight account object for address usage
                        class _A: pass
                        a = _A()
                        a.address = addr
                        self.account = a
                        self.private_key = None
                        self._use_node_account = True
                        logger.info(f"Using unlocked node account {addr} for local signing")
                    else:
                        raise ConfigurationError("No unlocked accounts available on local node and PRIVATE_KEY not set")
                except Exception as e:
                    raise ConfigurationError(f"PRIVATE_KEY not set and unable to use node account: {e}")
            else:
                raise ConfigurationError("PRIVATE_KEY not set in environment")
        else:
            # Use module-level Account (tests can monkeypatch this)
            self.account = Account.from_key(self.private_key)
            logger.info(f"Using account {self.account.address}")

        # Contract address
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        if not self.contract_address:
            raise ConfigurationError("CONTRACT_ADDRESS not set in environment")

        # Bind contract and validate ABI/function alignment
        self.contract = self._get_contract()
        logger.info(f"Using contract at {self.contract_address}")

    def _get_contract(self):
        """Create contract object and validate expected functions are present.

        This method attempts a set of known ABI shapes (AuditLogger, FederatedTrainingLogger variants)
        and selects the first one that appears to be callable on the deployed contract.
        It also records which function name should be used to append logs so callers can be agnostic
        to the specific solidity helper name used in different contract versions.
        """

        # Candidate ABIs with mapping of logical function names -> solidity function names
        candidates = [
            # AuditLogger.sol style (logTrainingRound, getLogCount, getLog)
            ({
                "abi": [
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
                    {"inputs": [], "name": "getLogCount", "outputs": [{"internalType": "uint256","name":"","type":"uint256"}], "stateMutability":"view","type":"function"},
                    {"inputs": [{"internalType":"uint256","name":"index","type":"uint256"}], "name":"getLog", "outputs": [
                        {"internalType":"uint256","name":"roundNumber","type":"uint256"},
                        {"internalType":"uint256","name":"accuracy","type":"uint256"},
                        {"internalType":"string","name":"modelHash","type":"string"},
                        {"internalType":"uint256","name":"timestamp","type":"uint256"}
                    ], "stateMutability":"view","type":"function"}
                ],
                "log_fn": "logTrainingRound",
                "get_log_fn": "getLog",
                "get_count_fn": "getLogCount",
            }),

            # FederatedTrainingLogger variant which exposes addTrainingLog and getTrainingLog
            ({
                "abi": [
                    {"inputs": [{"internalType":"uint256","name":"roundNumber","type":"uint256"},{"internalType":"uint256","name":"accuracy","type":"uint256"},{"internalType":"string","name":"modelHash","type":"string"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"addTrainingLog","outputs":[],"stateMutability":"nonpayable","type":"function"},
                    {"inputs": [], "name": "getLogCount", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view","type":"function"},
                    {"inputs": [{"internalType":"uint256","name":"index","type":"uint256"}], "name":"getTrainingLog", "outputs": [
                        {"internalType":"uint256","name":"roundNumber","type":"uint256"},
                        {"internalType":"uint256","name":"accuracy","type":"uint256"},
                        {"internalType":"string","name":"modelHash","type":"string"},
                        {"internalType":"uint256","name":"timestamp","type":"uint256"}
                    ], "stateMutability":"view","type":"function"}
                ],
                "log_fn": "addTrainingLog",
                "get_log_fn": "getTrainingLog",
                "get_count_fn": "getLogCount",
            }),

            # Backwards-compatible variant used in earlier code (logTrainingRound + getTrainingLog)
            ({
                "abi": [
                    {"inputs": [{"internalType":"uint256","name":"roundNumber","type":"uint256"},{"internalType":"uint256","name":"accuracy","type":"uint256"},{"internalType":"string","name":"metadataHash","type":"string"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"logTrainingRound","outputs":[],"stateMutability":"nonpayable","type":"function"},
                    {"inputs": [], "name": "getLogCount", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view","type":"function"},
                    {"inputs": [{"internalType":"uint256","name":"index","type":"uint256"}], "name": "getTrainingLog", "outputs": [
                        {"internalType":"uint256","name":"roundNumber","type":"uint256"},
                        {"internalType":"uint256","name":"accuracy","type":"uint256"},
                        {"internalType":"string","name":"metadataHash","type":"string"},
                        {"internalType":"uint256","name":"timestamp","type":"uint256"}
                    ], "stateMutability":"view","type":"function"}
                ],
                "log_fn": "logTrainingRound",
                "get_log_fn": "getTrainingLog",
                "get_count_fn": "getLogCount",
            }),
        ]

        last_err = None
        for cand in candidates:
            try:
                abi = cand["abi"]
                contract = self.w3.eth.contract(address=self.contract_address, abi=abi)

                # Quick sanity check - call getLogCount (if present) to validate contract
                get_count_fn = cand.get("get_count_fn")
                if hasattr(contract.functions, get_count_fn):
                    count = getattr(contract.functions, get_count_fn)().call()
                    logger.info(f"Contract variant `{cand.get('log_fn')}` detected: {count} existing logs")
                else:
                    logger.info(f"Contract variant `{cand.get('log_fn')}` detected (no count callable)")

                # Save the selected function names for later use
                self._log_fn_name = cand.get("log_fn")
                self._get_log_fn_name = cand.get("get_log_fn")
                self._get_count_fn_name = cand.get("get_count_fn")
                return contract
            except Exception as e:
                last_err = e
                # try next candidate
                continue

        raise ConfigurationError(f"Contract ABI mismatch or not callable at address {self.contract_address}: {last_err}")

    # ----------------- Queue & Worker -----------------
    def _start_worker(self) -> None:
        """Start background worker thread for sending transactions."""
        if self.is_mock:
            return

        if self._worker_thread and self._worker_thread.is_alive():
            return

        self._stop_worker.clear()
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()
        logger.info("Blockchain worker thread started")

    def stop(self, timeout: float = 5.0) -> None:
        """Stop the background worker (flushes queue while stopping)."""
        if self.is_mock:
            return
        self._stop_worker.set()
        if self._worker_thread:
            self._worker_thread.join(timeout)

    def _worker_loop(self) -> None:
        """Continuously process queued items until stopped."""
        while not self._stop_worker.is_set():
            try:
                item: _QueueItem = self._queue.get(timeout=self.worker_sleep)
            except queue.Empty:
                continue

            try:
                self._process_item(item)
            except Exception as e:
                logger.error(f"Worker failed processing item {item}: {e}")
                traceback.print_exc()
            finally:
                self._queue.task_done()

    def _process_item(self, item: _QueueItem) -> None:
        """Attempt to send a single queued transaction with retries."""
        # Check duplicate local cache
        if item.round_number in self._logged_rounds:
            logger.warning(f"Round {item.round_number} already logged locally; skipping")
            return

        for attempt in range(1, self.retry_attempts + 1):
            try:
                tx_hash = self._send_tx(item)
                logger.info(f"Transaction sent for round {item.round_number}: {tx_hash}")
                # Wait for receipt
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=self.receipt_timeout)
                if receipt.get("status") == 1:
                    logger.info(f"Round {item.round_number} confirmed in block {receipt.get('blockNumber')}")
                    self._logged_rounds.add(item.round_number)
                    return
                else:
                    logger.error(f"Transaction reverted for round {item.round_number}: {tx_hash}")
                    # do not retry on revert
                    return

            except Exception as e:
                logger.warning(f"Attempt {attempt} failed for round {item.round_number}: {e}")
                if attempt >= self.retry_attempts:
                    logger.error(f"Exhausted retries for round {item.round_number}")
                    return
                backoff = 2 ** (attempt - 1)
                time.sleep(backoff)

    # ----------------- Transaction building/sending -----------------
    def _send_tx(self, item: _QueueItem) -> str:
        """Build, sign and send transaction. Returns tx hash hex string."""
        # Prepare on-chain values
        accuracy_scaled = int(item.accuracy * 10000)
        metadata = {
            "round_number": item.round_number,
            "accuracy_scaled": accuracy_scaled,
            "model_hash": item.model_hash,
            "timestamp": item.timestamp,
        }

        metadata_hash = self.compute_metadata_hash_static(metadata)

        # Duplicate prevention: quick on-chain check of last log
        try:
            total = getattr(self.contract.functions, self._get_count_fn_name)().call()
            if total > 0:
                last = getattr(self.contract.functions, self._get_log_fn_name)(total - 1).call()
                last_round = int(last[0])
                if last_round == item.round_number:
                    logger.warning(f"Round {item.round_number} already on-chain according to last log; skipping send")
                    self._logged_rounds.add(item.round_number)
                    raise RuntimeError("Duplicate on-chain")
        except Exception:
            # Non-fatal: continue and attempt to send
            pass

        nonce = self.w3.eth.get_transaction_count(self.account.address)

        # estimate gas
        # Dynamically call the selected log function
        try:
            func = getattr(self.contract.functions, self._log_fn_name)
        except Exception:
            raise RuntimeError(f"Contract does not expose expected log function {getattr(self, '_log_fn_name', None)}")

        try:
            gas_est = func(
                item.round_number,
                accuracy_scaled,
                metadata_hash,
                item.timestamp,
            ).estimate_gas({"from": self.account.address})
        except Exception:
            gas_est = 200000
            logger.debug("Using fallback gas estimate 200000")

        gas_price = self.w3.eth.gas_price

        txn = func(
            item.round_number,
            accuracy_scaled,
            metadata_hash,
            item.timestamp,
        ).build_transaction({
            "from": self.account.address,
            "nonce": nonce,
            "gas": gas_est,
            "gasPrice": gas_price,
            "chainId": self.w3.eth.chain_id,
        })

        if getattr(self, '_use_node_account', False):
            # Node is expected to have unlocked accounts (Ganache/Anvil). Send raw txn via node
            try:
                tx_hash = self.w3.eth.send_transaction(txn)
                hex_hash = tx_hash.hex() if hasattr(tx_hash, 'hex') else self.w3.toHex(tx_hash)
                logger.info(f"Tx submitted via node account: {hex_hash}")
                return hex_hash
            except Exception as e:
                logger.error(f"Failed to send tx via node account: {e}")
                raise
        else:
            signed = self.w3.eth.account.sign_transaction(txn, self.private_key)
            raw = signed.rawTransaction
            tx_hash = self.w3.eth.send_raw_transaction(raw)
            hex_hash = tx_hash.hex()
            logger.info(f"Tx submitted: {hex_hash}")
            return hex_hash

    # ----------------- Public API -----------------
    def enqueue_training_metadata(self, round_number: int, accuracy: float, model_hash: str) -> Tuple[bool, Optional[str]]:
        """Enqueue metadata for asynchronous on-chain logging.

        Returns (enqueued, message_or_txid). This call is non-blocking so training can continue.
        """
        if self.is_mock:
            tx = self.mock_logger.enqueue({
                "round_number": round_number,
                "accuracy": accuracy,
                "model_hash": model_hash,
                "timestamp": int(time.time()),
            })
            return True, tx

        # Basic input validation
        if not isinstance(round_number, int) or round_number <= 0:
            return False, "invalid round"
        if not isinstance(accuracy, (float, int)) or not (0 <= accuracy <= 1):
            return False, "invalid accuracy"
        if not isinstance(model_hash, str) or len(model_hash) < 8:
            return False, "invalid model_hash"

        ts = int(time.time())
        item = _QueueItem(round_number=round_number, accuracy=float(accuracy), model_hash=model_hash, timestamp=ts)

        # Fast-path duplicate avoidance
        if round_number in self._logged_rounds:
            logger.warning(f"Round {round_number} already queued or logged; dropping request")
            return False, "duplicate"

        self._queue.put(item)
        logger.info(f"Enqueued round {round_number} for blockchain logging (queue size={self._queue.qsize()})")
        return True, None

    def flush(self, timeout: Optional[float] = None) -> None:
        """Block until queue is empty or until timeout (seconds) elapses."""
        start = time.time()
        while not self._queue.empty():
            if timeout and (time.time() - start) > timeout:
                logger.warning("Flush timeout reached before queue drained")
                return
            time.sleep(0.1)

    def get_logs(self, from_index: int = 0, max_count: int = 50) -> list:
        """Retrieve training logs from blockchain (or mock)."""
        if self.is_mock:
            return self.mock_logger.get_logs()[from_index:from_index + max_count]

        try:
            total = getattr(self.contract.functions, self._get_count_fn_name)().call()
            if from_index >= total:
                return []
            end = min(from_index + max_count, total)
            results = []
            for i in range(from_index, end):
                data = getattr(self.contract.functions, self._get_log_fn_name)(i).call()
                results.append({
                    "round_number": int(data[0]),
                    "accuracy": int(data[1]) / 10000.0,
                    "metadata_hash": data[2],
                    "timestamp": int(data[3]),
                })
            return results
        except Exception as e:
            logger.error(f"Error retrieving logs: {e}")
            return []

    def verify_onchain_hash(self, index: int, local_metadata: Dict[str, Any]) -> bool:
        """Recompute local metadata hash and compare to on-chain stored value at `index`.

        local_metadata should contain: round_number, accuracy (0-1), model_hash, timestamp
        """
        if self.is_mock:
            return self.mock_logger.verify(local_metadata.get("metadata_hash", ""), local_metadata)

        try:
            onchain = getattr(self.contract.functions, self._get_log_fn_name)(index).call()
            onchain_hash = onchain[2]
            computed = self.compute_metadata_hash_static({
                "round_number": int(local_metadata["round_number"]),
                "accuracy_scaled": int(local_metadata["accuracy"] * 10000),
                "model_hash": local_metadata["model_hash"],
                "timestamp": int(local_metadata["timestamp"]),
            })
            return onchain_hash == computed
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return False

    @staticmethod
    def compute_metadata_hash_static(metadata: Dict[str, Any]) -> str:
        """Compute SHA256 hex of canonical JSON of metadata.

        Metadata keys used: round_number, accuracy_scaled (int), model_hash, timestamp
        """
        canonical = json.dumps(
            {
                "round_number": int(metadata["round_number"]),
                "accuracy_scaled": int(metadata["accuracy_scaled"]),
                "model_hash": str(metadata["model_hash"]),
                "timestamp": int(metadata["timestamp"]),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    # ----------------- Observability / Health -----------------
    def health_check(self) -> Dict[str, Any]:
        """Return a small health snapshot for startup and monitoring."""
        status = {
            "is_mock": self.is_mock,
            "queue_size": self._queue.qsize(),
            "logged_rounds_count": len(self._logged_rounds),
            "contract_address": self.contract_address,
            "connected": False,
        }
        try:
            status["connected"] = bool(self.w3 and self.w3.is_connected())
        except Exception:
            status["connected"] = False
        return status


# ----------------- Convenience factory -----------------
def get_safe_blockchain_logger(strict: bool = False):
    """Return a real `BlockchainLogger` when possible, otherwise a `MockBlockchainLogger`.

    This helper never raises; it always returns a usable logger object suitable for
    application startup where blockchain is optional.
    """
    try:
        bl = BlockchainLogger(strict=strict, allow_mock_fallback=True)
        if getattr(bl, "is_mock", False):
            return bl.mock_logger
        return bl
    except Exception as e:
        logger.warning(f"get_safe_blockchain_logger: falling back to mock due to: {e}")
        return MockBlockchainLogger()