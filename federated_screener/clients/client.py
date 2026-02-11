import flwr as fl
import numpy as np
from typing import Dict, List, Tuple
from model import create_model
from data_utils import load_and_preprocess_data

class MedicalClient(fl.client.NumPyClient):
    def __init__(self, client_id: int, X_train: np.ndarray, y_train: np.ndarray,
                 X_test: np.ndarray, y_test: np.ndarray, class_weights: Dict[int, float]):
        self.client_id = client_id
        self.X_train = X_train
        self.y_train = y_train
        self.X_test = X_test
        self.y_test = y_test
        self.class_weights = class_weights
        self.model = create_model(X_train.shape[1])

    def get_parameters(self, config: Dict[str, fl.common.Scalar]) -> List[np.ndarray]:
        """Return model parameters."""
        return self.model.get_weights()

    def fit(self, parameters: List[np.ndarray], config: Dict[str, fl.common.Scalar]) -> Tuple[List[np.ndarray], int, Dict[str, fl.common.Scalar]]:
        """Train the model locally."""
        self.model.set_weights(parameters)

        # Train with class weights
        self.model.fit(
            self.X_train, self.y_train,
            epochs=5,
            batch_size=16,
            verbose=0,
            class_weight=self.class_weights
        )

        return self.model.get_weights(), len(self.X_train), {}

    def evaluate(self, parameters: List[np.ndarray], config: Dict[str, fl.common.Scalar]) -> Tuple[float, int, Dict[str, fl.common.Scalar]]:
        """Evaluate the model locally."""
        self.model.set_weights(parameters)
        loss, accuracy = self.model.evaluate(self.X_test, self.y_test, verbose=0)

        return loss, len(self.X_test), {"accuracy": accuracy}

def create_clients(num_clients: int = 3) -> List[MedicalClient]:
    """
    Create simulated clients with partitioned data.

    Args:
        num_clients: Number of clients to create

    Returns:
        List of MedicalClient instances
    """
    # Load full dataset
    X_train, X_test, y_train, y_test, class_weights = load_and_preprocess_data()

    # Split training data among clients
    train_size = len(X_train) // num_clients
    clients = []

    for i in range(num_clients):
        start = i * train_size
        end = (i + 1) * train_size if i < num_clients - 1 else len(X_train)

        X_client = X_train[start:end]
        y_client = y_train[start:end]

        # Each client gets a portion of test data for local evaluation
        test_size = len(X_test) // num_clients
        test_start = i * test_size
        test_end = (i + 1) * test_size if i < num_clients - 1 else len(X_test)

        X_test_client = X_test[test_start:test_end]
        y_test_client = y_test[test_start:test_end]

        client = MedicalClient(i, X_client, y_client, X_test_client, y_test_client, class_weights)
        clients.append(client)

    return clients

def start_client(client: MedicalClient):
    """Start a Flower client."""
    fl.client.start_numpy_client(
        server_address="127.0.0.1:8080",
        client=client
    )

if __name__ == "__main__":
    # This would be run in separate processes for each client
    # For simulation, we can run multiple instances
    import sys
    if len(sys.argv) > 1:
        client_id = int(sys.argv[1])
        clients = create_clients(3)
        start_client(clients[client_id])
    else:
        print("Usage: python client.py <client_id>")