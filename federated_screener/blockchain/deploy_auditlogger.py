#!/usr/bin/env python3
"""
Compile and deploy the AuditLogger contract to a local RPC (Anvil/Ganache).

This script attempts to use `solcx` to compile the Solidity contract. If `solcx`
is not available, it prints manual instructions to deploy with Truffle/Hardhat.

On success it prints the deployed contract address and suggests updating `.env`.
"""
import os
import json
from dotenv import load_dotenv

load_dotenv()

RPC = os.getenv("BLOCKCHAIN_RPC", "http://127.0.0.1:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

def main():
    print(f"Connecting to RPC at {RPC}")
    try:
        from web3 import Web3
    except Exception as e:
        print("web3.py is required to deploy contracts. Install with `pip install web3`.")
        return

    w3 = Web3(Web3.HTTPProvider(RPC))
    if not w3.is_connected():
        print("Cannot connect to RPC. Ensure Anvil/Ganache is running at", RPC)
        return

    # Locate contract source
    src = os.path.join(os.path.dirname(__file__), "AuditLogger.sol")
    if not os.path.exists(src):
        print("AuditLogger.sol not found in blockchain/ folder")
        return

    try:
        import solcx
    except Exception:
        print("solcx not installed. To deploy automatically, install it: pip install py-solc-x")
        print("Alternatively use Truffle/Hardhat to compile and deploy the contract. See README.")
        return

    # Install solc version if needed
    try:
        solcx.install_solc('0.8.19')
    except Exception:
        pass
    solc_version = '0.8.19'
    solcx.set_solc_version(solc_version)

    with open(src, 'r', encoding='utf-8') as f:
        src_code = f.read()

    compiled = solcx.compile_standard({
        'language': 'Solidity',
        'sources': {'AuditLogger.sol': {'content': src_code}},
        'settings': {'outputSelection': {'*': {'*': ['abi', 'evm.bytecode']}}}
    }, allow_paths='.')

    contract_data = compiled['contracts']['AuditLogger.sol']
    # Attempt to find a contract within file
    contract_name = next(iter(contract_data.keys()))
    abi = contract_data[contract_name]['abi']
    bytecode = contract_data[contract_name]['evm']['bytecode']['object']

    acct = None
    if PRIVATE_KEY:
        acct = w3.eth.account.from_key(PRIVATE_KEY)
        deployer = acct.address
        print(f"Using PRIVATE_KEY deployer: {deployer}")
    else:
        # fallback to first node account
        accounts = w3.eth.accounts
        if not accounts:
            print("No accounts available on the node and PRIVATE_KEY not set.")
            return
        deployer = accounts[0]
        print(f"Using node account: {deployer}")

    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(deployer)
    tx = Contract.constructor().build_transaction({
        'from': deployer,
        'nonce': nonce,
        'gas': 4000000,
    })

    if acct:
        signed = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    else:
        tx_hash = w3.eth.send_transaction(tx)

    print('Deploy tx sent, waiting for receipt...')
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    address = receipt.contractAddress
    print(f"Contract deployed at: {address}")
    print("Update your .env with: CONTRACT_ADDRESS=", address)

if __name__ == '__main__':
    main()
