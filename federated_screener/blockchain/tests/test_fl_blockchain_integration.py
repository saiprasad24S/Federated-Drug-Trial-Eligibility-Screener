"""Integration-style unit tests for FL server <-> BlockchainLogger interaction.

These tests patch `BlockchainLogger` inside `FederatedServer` so no network
or Flower internals are used. They ensure logging is attempted once per round
and that training evaluation returns metrics even if logging fails.
"""
import os
import sys
import hashlib
from unittest import mock

import pytest

# Ensure package imports work
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, ROOT)

from fl_server.server import FederatedServer


class DummyModel:
    def __init__(self):
        self._weights = None

    def set_weights(self, w):
        self._weights = w

    def evaluate(self, X, y, verbose=0):
        # deterministic simple metrics
        return 0.123, 0.789


def test_blockchain_enqueue_called_once(monkeypatch):
    """FederatedServer.evaluate_fn should call logger.enqueue exactly once per round."""
    # Patch model creation and data loader to small deterministic values
    monkeypatch.setattr('fl_server.server.create_model', lambda input_dim: DummyModel())
    monkeypatch.setattr('fl_server.server.load_and_preprocess_data', lambda: ([], [[0, 0]], [], [0], {}))

    server = FederatedServer(num_rounds=1)

    # Replace blockchain_logger with a mock that records calls
    mock_logger = mock.MagicMock()
    mock_logger.enqueue_training_metadata.return_value = (True, "mock_tx")
    server.blockchain_logger = mock_logger

    # Call evaluate_fn
    loss, metrics = server.evaluate_fn(1, parameters=[], config={})

    assert loss == 0.123
    assert isinstance(metrics, dict) and 'accuracy' in metrics

    # Ensure enqueue called once with correct round number
    mock_logger.enqueue_training_metadata.assert_called_once()
    called_args, called_kwargs = mock_logger.enqueue_training_metadata.call_args
    assert called_kwargs.get('round_number') == 1
    assert isinstance(called_kwargs.get('accuracy'), float)
    assert isinstance(called_kwargs.get('model_hash'), str)


def test_evaluate_returns_even_if_logging_fails(monkeypatch):
    """If blockchain logging raises, evaluate_fn still returns loss and metrics."""
    monkeypatch.setattr('fl_server.server.create_model', lambda input_dim: DummyModel())
    monkeypatch.setattr('fl_server.server.load_and_preprocess_data', lambda: ([], [[0, 0]], [], [0], {}))

    server = FederatedServer(num_rounds=1)

    # Mock logger that raises on enqueue
    class BrokenLogger:
        def enqueue_training_metadata(self, *args, **kwargs):
            raise RuntimeError("rpc down")

    server.blockchain_logger = BrokenLogger()

    # Should not raise despite logger failing
    loss, metrics = server.evaluate_fn(2, parameters=[], config={})
    assert loss == 0.123
    assert 'accuracy' in metrics
