import os
import sys
import unittest
import hashlib
from pathlib import Path

# Ensure federated_screener is on sys.path so 'blockchain' package imports work
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from blockchain.logger import BlockchainLogger, MockBlockchainLogger

class TestBlockchainLogger(unittest.TestCase):
    def test_compute_metadata_hash_static(self):
        metadata = {
            "round_number": 2,
            "accuracy_scaled": 9234,
            "model_hash": "abcd" * 16,
            "timestamp": 1700000000,
        }
        h = BlockchainLogger.compute_metadata_hash_static(metadata)
        self.assertIsInstance(h, str)
        self.assertEqual(len(h), 64)

        # Cross-check by computing canonical JSON then SHA256
        import json
        canonical = json.dumps({
            "round_number": int(metadata["round_number"]),
            "accuracy_scaled": int(metadata["accuracy_scaled"]),
            "model_hash": str(metadata["model_hash"]),
            "timestamp": int(metadata["timestamp"]),
        }, sort_keys=True, separators=(",", ":"))
        expected = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        self.assertEqual(h, expected)

    def test_mock_enqueue_and_get_logs(self):
        mock = MockBlockchainLogger()
        tx = mock.enqueue({"round_number": 1, "accuracy": 0.5, "model_hash": "h"})
        self.assertTrue(isinstance(tx, str) and tx.startswith("mock_tx_"))
        logs = mock.get_logs()
        self.assertTrue(len(logs) >= 1)
        self.assertEqual(logs[-1]["round_number"], 1)

    def test_enqueue_training_metadata_in_mock_mode(self):
        # Create logger in non-strict mode so it falls back to mock
        logger = BlockchainLogger(strict=False)
        self.assertTrue(logger.is_mock)

        ok, tx = logger.enqueue_training_metadata(1, 0.75, "deadbeef" * 8)
        self.assertTrue(ok)
        self.assertIsNotNone(tx)

        status = logger.health_check()
        self.assertTrue(status.get("is_mock"))
        self.assertGreaterEqual(status.get("queue_size"), 0)

if __name__ == "__main__":
    unittest.main()
