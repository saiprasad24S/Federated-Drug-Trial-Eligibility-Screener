#!/usr/bin/env python3
"""
Simple deployment script for testing the FederatedTrainingLogger contract
"""

import json
from web3 import Web3
from eth_account import Account
import os
from dotenv import load_dotenv

load_dotenv()

def deploy_contract():
    """Deploy the FederatedTrainingLogger contract to local Ganache."""

    # Connect to Ganache
    w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

    if not w3.is_connected():
        print("Cannot connect to Ganache. Make sure it's running on http://127.0.0.1:8545")
        return

    # Get the first account from Ganache
    accounts = w3.eth.accounts
    if not accounts:
        print("No accounts found in Ganache")
        return

    deployer_account = accounts[0]
    print(f"Deploying from account: {deployer_account}")

    # Read contract bytecode and ABI
    # Note: In a real scenario, you'd compile the contract first
    # For this demo, we'll use a simplified approach

    # Since we can't easily compile Solidity here, let's provide instructions
    print("\nTo deploy the contract:")
    print("1. Install Truffle: npm install -g truffle")
    print("2. Create a new directory: mkdir deployment && cd deployment")
    print("3. Run: truffle init")
    print("4. Copy FederatedTrainingLogger.sol to contracts/")
    print("5. Run: truffle compile")
    print("6. Run: truffle migrate --network development")
    print("7. Copy the deployed contract address to your .env file")

    # Alternative: Provide the expected contract address for testing
    print("\nFor testing, you can use any deployed contract address.")
    print("Update CONTRACT_ADDRESS in your .env file after deployment.")

if __name__ == "__main__":
    deploy_contract()