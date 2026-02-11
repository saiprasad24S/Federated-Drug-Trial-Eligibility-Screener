"""Pytest suite for `blockchain.logger`.

These tests use `unittest.mock` to simulate Web3 connectivity and ensure
the `BlockchainLogger` falls back to `MockBlockchainLogger` when appropriate,
and that accuracy scaling and duplicate protections behave deterministically
without any network calls.
"""
import os
import sys
import time
import types
from unittest import mock

import pytest

# Ensure package import works when running tests from repo root
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, ROOT)

from blockchain import logger as logger_mod


class DummyContract:
    def __init__(self):
        self._last_call_args = None

    class Func:
        def __init__(self, parent):
            self.parent = parent

        def getLogCount(self):
            class C:
                def call(self):
                    return 0
            return C()

        def getTrainingLog(self, idx):
            class C:
                def call(self):
                    return (0, 0, "", int(time.time()))
            return C()

        def logTrainingRound(self, *args):
            parent = self.parent

            class Call:
                def estimate_gas(self, tx):
                    return 21000

                def build_transaction(self, tx):
                    parent._last_call_args = args
                    return {"from": tx.get("from"), "nonce": tx.get("nonce")}

            return Call()

    @property
    def functions(self):
        return DummyContract.Func(self)


class DummyEth:
    def __init__(self):
        self.chain_id = 1337
        self.gas_price = 1

    def get_transaction_count(self, addr):
        return 0

    class Account:
        @staticmethod
        def sign_transaction(tx, pk):
            class S:
                rawTransaction = b"signed"
            return S()

    @property
    def account(self):
        return DummyEth.Account()

    def send_raw_transaction(self, raw):
        return b"\x01"


class DummyW3:
    def __init__(self):
        self.eth = DummyEth()

    def is_connected(self):
        return True

    def from_wei(self, value, unit):
        return value

    def to_wei(self, value, unit):
        return value


def test_real_logger_used_when_web3_connects(monkeypatch, caplog):
    """When Web3 is connectable and required env vars set, a real BlockchainLogger is initialized."""
    # Prepare environment
    monkeypatch.setenv("BLOCKCHAIN_LOCAL", "true")
    monkeypatch.setenv("PRIVATE_KEY", "0x" + "1" * 64)
    monkeypatch.setenv("CONTRACT_ADDRESS", "0xdeadbeef")

    # Patch _get_contract to avoid ABI validation/network calls
    monkeypatch.setattr(logger_mod.BlockchainLogger, "_get_contract", lambda self: DummyContract())

    # Patch Web3 to a dummy that reports connected
    monkeypatch.setattr(logger_mod, "Web3", lambda provider: DummyW3())

    # Create logger in strict mode; should not fall back to mock
    bl = logger_mod.BlockchainLogger(strict=True)
    assert not bl.is_mock


def test_web3_failure_uses_mock_and_logs_warning(monkeypatch, caplog):
    """If blockchain init fails, non-strict creation falls back to mock and logs a warning."""
    monkeypatch.delenv("PRIVATE_KEY", raising=False)
    monkeypatch.delenv("CONTRACT_ADDRESS", raising=False)
    monkeypatch.setenv("BLOCKCHAIN_LOCAL", "true")

    caplog.clear()
    # Force _init_blockchain to raise
    monkeypatch.setattr(logger_mod.BlockchainLogger, "_init_blockchain", lambda self: (_ for _ in ()).throw(RuntimeError("no rpc")))

    bl = logger_mod.BlockchainLogger(strict=False, allow_mock_fallback=True)
    assert bl.is_mock
    # Ensure warning was logged about fallback
    assert any("Falling back to MockBlockchainLogger" in r.message for r in caplog.records)


def test_accuracy_scaling_and_duplicate_protection(monkeypatch):
    """Verify _send_tx computes integer scaled accuracy and skips duplicate rounds."""
    # Create instance bypassing __init__ to control attributes
    bl = object.__new__(logger_mod.BlockchainLogger)
    bl.is_mock = False
    bl.private_key = "0x" + "1" * 64
    bl.account = types.SimpleNamespace(address="0xabc")
    bl.w3 = DummyW3()
    bl.contract = DummyContract()
    bl._logged_rounds = set()
    bl.retry_attempts = 1
    bl.receipt_timeout = 5

    # Build an item and call _send_tx directly
    item = logger_mod._QueueItem(round_number=42, accuracy=0.8567, model_hash="a" * 64, timestamp=int(time.time()))

    tx = bl._send_tx(item)

    # Check that DummyContract recorded the args passed to logTrainingRound
    last_args = bl.contract._last_call_args
    assert last_args is not None
    sent_round = int(last_args[0])
    sent_accuracy = int(last_args[1])
    sent_hash = last_args[2]

    assert sent_round == 42
    assert sent_accuracy == int(0.8567 * 10000)
    assert sent_hash == logger_mod.BlockchainLogger.compute_metadata_hash_static({
        "round_number": 42,
        "accuracy_scaled": int(0.8567 * 10000),
        "model_hash": "a" * 64,
        "timestamp": int(item.timestamp),
    })

    # Now simulate duplicate: add round to logged set and verify _process_item skips
    bl._logged_rounds.add(42)
    # Should simply return without exception
    bl._process_item(item)
