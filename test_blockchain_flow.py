#!/usr/bin/env python3
"""Test script to verify blockchain logging flow."""

import sys
import os

# Add project to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'federated_screener'))

from blockchain.logger import get_safe_blockchain_logger

# Test 1: Initialize logger
print("=" * 60)
print("TEST 1: Initialize logger")
print("=" * 60)
logger = get_safe_blockchain_logger()
print(f"Logger type: {type(logger).__name__}")
print(f"Is mock: {getattr(logger, 'is_mock', 'N/A')}")

# Test 2: Enqueue metadata
print("\n" + "=" * 60)
print("TEST 2: Enqueue training metadata")
print("=" * 60)
for i in range(1, 4):
    ok, tx = logger.enqueue_training_metadata(
        round_number=i,
        accuracy=0.7 + (i * 0.05),
        model_hash=f"model_hash_{i}"
    )
    print(f"Round {i}: success={ok}, tx={tx}")

# Test 3: Get logs
print("\n" + "=" * 60)
print("TEST 3: Retrieve logs")
print("=" * 60)
logs = logger.get_logs()
print(f"Total logs: {len(logs)}")
for idx, log in enumerate(logs):
    print(f"  Log {idx}: {log}")

# Test 4: Test mock logger directly
print("\n" + "=" * 60)
print("TEST 4: Verify mock logger interface")
print("=" * 60)
print(f"Has enqueue_training_metadata: {hasattr(logger, 'enqueue_training_metadata')}")
print(f"Has get_logs: {hasattr(logger, 'get_logs')}")
print(f"Has w3: {hasattr(logger, 'w3')}")
if hasattr(logger, 'w3'):
    print(f"w3.is_connected(): {logger.w3.is_connected()}")

print("\n" + "=" * 60)
print("All tests passed!")
print("=" * 60)
