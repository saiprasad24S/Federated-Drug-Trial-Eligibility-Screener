#!/usr/bin/env python3
"""
Run script for Federated Drug Trial Eligibility Screener
"""

import subprocess
import threading
import time
import os
import sys

def start_ganache():
    """Start local Ganache blockchain."""
    print("Starting Ganache...")
    try:
        subprocess.run(["ganache"], check=True)
    except subprocess.CalledProcessError:
        print("Ganache not found. Please install with: npm install -g ganache")
        sys.exit(1)

def start_api():
    """Start FastAPI server."""
    print("Starting API server...")
    os.chdir("api")
    subprocess.run([sys.executable, "main.py"])

def start_fl_server():
    """Start Flower FL server."""
    print("Starting FL server...")
    os.chdir("fl_server")
    subprocess.run([sys.executable, "server.py"])

def start_clients():
    """Start FL clients."""
    print("Starting FL clients...")
    time.sleep(3)  # Wait for server to start

    clients = []
    for i in range(3):
        client_thread = threading.Thread(
            target=lambda cid=i: subprocess.run([
                sys.executable, "clients/client.py", str(cid)
            ])
        )
        client_thread.daemon = True
        clients.append(client_thread)
        client_thread.start()

    # Wait for clients
    for client in clients:
        client.join()

if __name__ == "__main__":
    print("Federated Drug Trial Eligibility Screener")
    print("=" * 50)

    # Check if .env exists
    if not os.path.exists(".env"):
        print("Please copy .env.example to .env and configure your settings")
        sys.exit(1)

    # Start components
    try:
        # Option 1: Start everything together (requires manual Ganache start)
        print("Starting API server...")
        start_api()

    except KeyboardInterrupt:
        print("\nShutting down...")

    print("\nTo run individual components:")
    print("1. Start Ganache: ganache")
    print("2. Start API: python api/main.py")
    print("3. Start FL Server: python fl_server/server.py")
    print("4. Start Clients: python clients/client.py <client_id>")