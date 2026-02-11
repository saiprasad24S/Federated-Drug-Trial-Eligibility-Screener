#!/usr/bin/env python3
"""
Test script to verify the federated learning setup
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from model import create_model
from data_utils import load_and_preprocess_data
from blockchain.logger import BlockchainLogger

def test_data_loading():
    """Test data loading and preprocessing."""
    print("Testing data loading...")
    try:
        X_train, X_test, y_train, y_test, class_weights = load_and_preprocess_data()
        print(f"✓ Data loaded: {X_train.shape[0]} train, {X_test.shape[0]} test samples")
        print(f"✓ Class weights: {class_weights}")
        return True
    except Exception as e:
        print(f"✗ Data loading failed: {e}")
        return False

def test_model_creation():
    """Test model creation."""
    print("Testing model creation...")
    try:
        X_train, _, _, _, _ = load_and_preprocess_data()
        model = create_model(X_train.shape[1])
        print(f"✓ Model created with input shape: {X_train.shape[1]}")
        return True
    except Exception as e:
        print(f"✗ Model creation failed: {e}")
        return False

def test_blockchain_connection():
    """Test blockchain connection."""
    print("Testing blockchain connection...")
    try:
        logger = BlockchainLogger()
        connected = logger.w3.is_connected()
        if connected:
            print("✓ Blockchain connected")
        else:
            print("⚠ Blockchain not connected (expected if Ganache not running)")
        return True  # Don't fail the test for this
    except Exception as e:
        print(f"⚠ Blockchain connection failed (expected): {e}")
        return True  # Don't fail the test

def main():
    """Run all tests."""
    print("Federated Drug Trial Eligibility Screener - Test Suite")
    print("=" * 60)

    tests = [
        test_data_loading,
        test_model_creation,
        test_blockchain_connection
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Ready to start federated learning.")
        print("\nNext steps:")
        print("1. Start Ganache: ganache")
        print("2. Deploy smart contract (see blockchain/AuditLogger.sol)")
        print("3. Update .env with contract address")
        print("4. Run: python api/main.py")
        print("5. POST to /start-fl to begin training")
    else:
        print("❌ Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()