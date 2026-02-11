import flwr as fl
import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime
import hashlib
import json
from model import create_model
from data_utils import load_and_preprocess_data
from blockchain.logger import BlockchainLogger

class FederatedServer:
    def __init__(self, num_rounds: int = 10):
        self.num_rounds = num_rounds
        self.training_logs = []
        self.blockchain_logger = BlockchainLogger()

    def evaluate_config(self, server_round: int) -> Dict[str, fl.common.Scalar]:
        """Return evaluation configuration dict for each round."""
        return {"server_round": server_round}

    def evaluate_fn(self, server_round: int, parameters: fl.common.NDArrays,
                   config: Dict[str, fl.common.Scalar]) -> Tuple[float, Dict[str, fl.common.Scalar]]:
        """
        Evaluate global model parameters using an evaluation function.
        This function is called after each round.
        """
        # Load test data
        _, X_test, _, y_test, _ = load_and_preprocess_data()

        # Create model and set parameters
        model = create_model(X_test.shape[1])
        model.set_weights(parameters)

        # Evaluate
        loss, accuracy = model.evaluate(X_test, y_test, verbose=0)

        # Generate model hash (metadata only, not weights)
        model_hash = hashlib.sha256(str(parameters).encode()).hexdigest()

        # Log to memory
        log_entry = {
            "round": server_round,
            "accuracy": float(accuracy),
            "loss": float(loss),
            "timestamp": datetime.utcnow().isoformat(),
            "model_hash": model_hash
        }
        self.training_logs.append(log_entry)

        # Log to blockchain (metadata only)
        self.blockchain_logger.log_training_metadata(
            round_number=server_round,
            accuracy=float(accuracy),
            model_hash=model_hash
        )

        print(f"Round {server_round}: Accuracy = {accuracy:.4f}, Loss = {loss:.4f}")

        return loss, {"accuracy": accuracy}

    def get_strategy(self) -> fl.server.strategy.Strategy:
        """Return the federated learning strategy."""
        return fl.server.strategy.FedAvg(
            min_fit_clients=3,
            min_evaluate_clients=3,
            min_available_clients=3,
            evaluate_fn=self.evaluate_fn,
            on_fit_config_fn=self.evaluate_config,
        )

    def start_server(self):
        """Start the Flower server."""
        strategy = self.get_strategy()

        # Start server
        fl.server.start_server(
            server_address="0.0.0.0:8080",
            strategy=strategy,
            config=fl.server.ServerConfig(num_rounds=self.num_rounds),
        )

if __name__ == "__main__":
    server = FederatedServer(num_rounds=10)
    server.start_server()