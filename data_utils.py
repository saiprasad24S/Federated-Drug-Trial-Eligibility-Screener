import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

def load_and_preprocess_data(filepath: str = "mimic_adapted.csv"):
    """
    Loads and preprocesses the medical data for training.

    Args:
        filepath: Path to the CSV file

    Returns:
        Tuple of (X_train, X_test, y_train, y_test, class_weights)
    """
    df = pd.read_csv(filepath)

    X = df[["age", "gender_enc", "num_comorbidities", "stage_enc", "bmi"]]
    y = df["eligible"]

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Compute class weights
    class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
    class_weight_dict = {0: class_weights[0], 1: class_weights[1]}

    return X_train, X_test, y_train, y_test, class_weight_dict