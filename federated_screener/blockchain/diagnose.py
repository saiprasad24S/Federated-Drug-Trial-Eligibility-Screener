#!/usr/bin/env python3
"""
Blockchain Integration Diagnostic Script

This script checks all components of the blockchain setup:
1. Environment configuration (.env)
2. Web3 connection to Ganache/Ethereum
3. Smart contract deployment
4. Account balance and permissions
5. Test transaction logging

Run this to diagnose blockchain issues before starting FL training.
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def print_header(title):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_status(message, status="INFO"):
    """Print status message with color."""
    colors = {
        "INFO": "\033[94m",      # Blue
        "SUCCESS": "\033[92m",   # Green
        "WARNING": "\033[93m",   # Yellow
        "ERROR": "\033[91m",     # Red
    }
    reset = "\033[0m"
    
    color = colors.get(status, colors["INFO"])
    print(f"{color}[{status:8}]{reset} {message}")

def check_environment():
    """Check environment variables."""
    print_header("ENVIRONMENT CONFIGURATION")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    checks = {
        "BLOCKCHAIN_LOCAL": os.getenv("BLOCKCHAIN_LOCAL", "true"),
        "PRIVATE_KEY": "SET" if os.getenv("PRIVATE_KEY") else "MISSING",
        "CONTRACT_ADDRESS": os.getenv("CONTRACT_ADDRESS", "MISSING"),
        "INFURA_PROJECT_ID": "SET" if os.getenv("INFURA_PROJECT_ID") else "OPTIONAL",
    }
    
    all_good = True
    for key, value in checks.items():
        if value == "MISSING" and key != "INFURA_PROJECT_ID":
            print_status(f"{key}: {value}", "ERROR")
            all_good = False
        elif value == "OPTIONAL":
            print_status(f"{key}: {value} (not needed for local Ganache)", "WARNING")
        else:
            status = "SUCCESS" if value != "MISSING" else "ERROR"
            display_value = value if len(str(value)) < 20 else f"{str(value)[:17]}..."
            print_status(f"{key}: {display_value}", status)
    
    return all_good

def check_web3_connection():
    """Check Web3 connection to blockchain."""
    print_header("WEB3 CONNECTION")
    
    try:
        from web3 import Web3
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        
        is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"
        
        if is_local:
            provider_url = "http://127.0.0.1:8545"
            print_status(f"Connecting to local Ganache...", "INFO")
        else:
            infura_id = os.getenv("INFURA_PROJECT_ID")
            if not infura_id:
                print_status("INFURA_PROJECT_ID not set for testnet mode", "ERROR")
                return False
            provider_url = f"https://sepolia.infura.io/v3/{infura_id}"
            print_status(f"Connecting to Sepolia testnet...", "INFO")
        
        w3 = Web3(Web3.HTTPProvider(provider_url))
        
        if w3.is_connected():
            print_status(f"✓ Connected to {provider_url}", "SUCCESS")
            print_status(f"Chain ID: {w3.eth.chain_id}", "SUCCESS")
            print_status(f"Latest block: {w3.eth.block_number}", "SUCCESS")
            
            # Check gas price
            gas_price = w3.eth.gas_price
            gas_price_gwei = w3.from_wei(gas_price, 'gwei')
            print_status(f"Gas price: {gas_price_gwei:.2f} Gwei", "SUCCESS")
            
            return True
        else:
            print_status(f"✗ Failed to connect to {provider_url}", "ERROR")
            if is_local:
                print_status("Make sure Ganache is running: ganache", "WARNING")
            return False
            
    except Exception as e:
        print_status(f"✗ Connection error: {e}", "ERROR")
        return False

def check_account():
    """Check account balance and permissions."""
    print_header("ACCOUNT & BALANCE")
    
    try:
        from web3 import Web3
        from eth_account import Account
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        
        is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"
        
        if is_local:
            w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
        else:
            infura_id = os.getenv("INFURA_PROJECT_ID")
            w3 = Web3(Web3.HTTPProvider(f"https://sepolia.infura.io/v3/{infura_id}"))
        
        if not w3.is_connected():
            print_status("Web3 not connected", "ERROR")
            return False
        
        private_key = os.getenv("PRIVATE_KEY")
        if not private_key:
            print_status("PRIVATE_KEY not set", "ERROR")
            return False
        
        # Load account
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        
        account = Account.from_key(private_key)
        print_status(f"Account address: {account.address}", "SUCCESS")
        
        # Check balance
        balance = w3.eth.get_balance(account.address)
        balance_eth = w3.from_wei(balance, 'ether')
        
        if balance_eth > 0:
            print_status(f"Balance: {balance_eth:.4f} ETH", "SUCCESS")
        else:
            print_status(f"Balance: {balance_eth:.4f} ETH (needs funds!)", "WARNING")
            if is_local:
                print_status("Ganache provides 100 ETH per account by default", "INFO")
            else:
                print_status("Use Sepolia faucet to get test ETH", "WARNING")
        
        return True
        
    except Exception as e:
        print_status(f"✗ Account error: {e}", "ERROR")
        return False

def check_contract():
    """Check smart contract deployment."""
    print_header("SMART CONTRACT")
    
    try:
        from web3 import Web3
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        
        is_local = os.getenv("BLOCKCHAIN_LOCAL", "true").lower() == "true"
        
        if is_local:
            w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
        else:
            infura_id = os.getenv("INFURA_PROJECT_ID")
            w3 = Web3(Web3.HTTPProvider(f"https://sepolia.infura.io/v3/{infura_id}"))
        
        if not w3.is_connected():
            print_status("Web3 not connected", "ERROR")
            return False
        
        contract_address = os.getenv("CONTRACT_ADDRESS")
        if not contract_address:
            print_status("CONTRACT_ADDRESS not set in .env", "ERROR")
            return False
        
        print_status(f"Contract address: {contract_address}", "INFO")
        
        # Check if address has code (contract deployed)
        code = w3.eth.get_code(contract_address)
        
        if code == b'':
            print_status(f"✗ No contract found at {contract_address}", "ERROR")
            print_status("Deploy FederatedTrainingLogger.sol first", "WARNING")
            return False
        
        print_status(f"✓ Contract found at address", "SUCCESS")
        print_status(f"Bytecode size: {len(code)} bytes", "SUCCESS")
        
        # Try to call a view function
        try:
            from blockchain.logger import BlockchainLogger
            logger = BlockchainLogger()
            
            if logger.contract:
                log_count = logger.contract.functions.getLogCount().call()
                print_status(f"✓ Contract is callable", "SUCCESS")
                print_status(f"Existing logs: {log_count}", "SUCCESS")
                return True
            else:
                print_status(f"✗ Failed to initialize contract object", "ERROR")
                return False
        except Exception as e:
            print_status(f"✗ Cannot call contract: {e}", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"✗ Contract check error: {e}", "ERROR")
        return False

def test_logging():
    """Test actual logging transaction."""
    print_header("TEST TRANSACTION")
    
    try:
        from blockchain.logger import BlockchainLogger
        import hashlib
        
        print_status("Initializing BlockchainLogger...", "INFO")
        logger = BlockchainLogger()
        
        if logger.is_mock:
            print_status("Using MOCK logger (not connected to blockchain)", "WARNING")
            print_status("Cannot test transaction without blockchain connection", "WARNING")
            return False
        
        print_status("✓ Connected to real blockchain", "SUCCESS")
        
        # Create test data
        round_num = 1
        accuracy = 0.9234
        # Create a fake model hash
        test_string = f"test_model_round_{round_num}".encode()
        model_hash = hashlib.sha256(test_string).hexdigest()
        
        print_status(f"Test data:", "INFO")
        print_status(f"  Round: {round_num}", "INFO")
        print_status(f"  Accuracy: {accuracy:.4f}", "INFO")
        print_status(f"  Model hash: {model_hash[:16]}...", "INFO")
        
        print_status("Attempting to log test transaction...", "INFO")
        success = logger.log_training_metadata(
            round_number=round_num,
            accuracy=accuracy,
            model_hash=model_hash
        )
        
        if success:
            print_status("✓ Test transaction SUCCESSFUL!", "SUCCESS")
            
            # Retrieve logs
            logs = logger.get_logs()
            print_status(f"✓ Retrieved logs: {len(logs)} entries", "SUCCESS")
            
            return True
        else:
            print_status("✗ Test transaction FAILED", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"✗ Transaction test error: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        return False

def print_summary(results):
    """Print diagnostic summary."""
    print_header("DIAGNOSTIC SUMMARY")
    
    checks = {
        "Environment": results.get("env", False),
        "Web3 Connection": results.get("web3", False),
        "Account & Balance": results.get("account", False),
        "Contract Deployment": results.get("contract", False),
        "Test Transaction": results.get("test", False),
    }
    
    passed = sum(1 for v in checks.values() if v)
    total = len(checks)
    
    for check, result in checks.items():
        status = "✓ PASS" if result else "✗ FAIL"
        color = "SUCCESS" if result else "ERROR"
        print_status(f"{check}: {status}", color)
    
    print("\n" + "=" * 70)
    print(f"  Summary: {passed}/{total} checks passed")
    print("=" * 70)
    
    if passed == total:
        print_status("All checks passed! Ready for FL training.", "SUCCESS")
        return True
    else:
        print_status("Some checks failed. See errors above for details.", "ERROR")
        print_status("Common fixes:", "INFO")
        print_status("  1. Start Ganache: ganache", "INFO")
        print_status("  2. Deploy contract: truffle migrate --network development", "INFO")
        print_status("  3. Configure .env with PRIVATE_KEY and CONTRACT_ADDRESS", "INFO")
        return False

def main():
    """Run all diagnostic checks."""
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 68 + "║")
    print("║" + "  BLOCKCHAIN INTEGRATION DIAGNOSTIC".center(68) + "║")
    print("║" + "  Federated Learning Training Metadata Logging".center(68) + "║")
    print("║" + " " * 68 + "║")
    print("╚" + "═" * 68 + "╝")
    print()
    
    results = {}
    
    # Run all checks
    results["env"] = check_environment()
    results["web3"] = check_web3_connection()
    
    if results["web3"]:
        results["account"] = check_account()
        results["contract"] = check_contract()
        
        if results["contract"]:
            results["test"] = test_logging()
        else:
            results["test"] = False
    else:
        results["account"] = False
        results["contract"] = False
        results["test"] = False
    
    # Print summary
    success = print_summary(results)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
