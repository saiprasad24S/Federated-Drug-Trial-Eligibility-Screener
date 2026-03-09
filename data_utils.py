import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

# Gender and stage encoding maps (must match preprocessing.py)
_GENDER_MAP = {"Male": 0, "Female": 1}
_STAGE_MAP = {"I": 1, "II": 2, "III": 3, "IV": 4}


def _load_patients_from_mongo() -> pd.DataFrame:
    """Load patient records from MongoDB and build a training DataFrame."""
    import os, certifi
    from pymongo import MongoClient
    from dotenv import load_dotenv

    load_dotenv()
    client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
    db = client[os.getenv("MONGO_DB_NAME")]

    patients = list(db.patients.find({}, {
        "_id": 0, "age": 1, "gender": 1, "comorbidities": 1,
        "stage": 1, "bmi": 1, "eligible": 1,
    }))

    if not patients:
        raise ValueError("No patient records found in MongoDB")

    df = pd.DataFrame(patients)

    # Encode columns for training
    df["gender_enc"] = df["gender"].map(_GENDER_MAP).fillna(0).astype(int)
    df["num_comorbidities"] = df["comorbidities"].apply(
        lambda x: len(x) if isinstance(x, list) else 0
    )
    df["stage_enc"] = df["stage"].map(_STAGE_MAP).fillna(2).astype(int)
    df["bmi"] = df["bmi"].astype(float)
    df["age"] = df["age"].astype(float)

    # Default eligible to 0 if missing, then assign synthetic labels
    # for training (real eligibility is computed per-trial at inference time)
    if "eligible" not in df.columns or df["eligible"].isna().all():
        # Generate synthetic training labels based on patient features
        # Patients with lower stage, younger age, and fewer comorbidities
        # are more likely to be eligible
        np.random.seed(42)
        score = (
            (df["age"] < 65).astype(float) * 0.3
            + (df["stage_enc"] <= 2).astype(float) * 0.3
            + (df["num_comorbidities"] <= 2).astype(float) * 0.2
            + (df["bmi"].between(18.5, 30)).astype(float) * 0.2
        )
        noise = np.random.uniform(0, 0.3, len(df))
        df["eligible"] = ((score + noise) > 0.5).astype(int)
    else:
        df["eligible"] = df["eligible"].fillna(0).astype(int)

    return df


def load_and_preprocess_data():
    """
    Loads patient data from MongoDB and preprocesses it for training.

    Returns:
        Tuple of (X_train, X_test, y_train, y_test, class_weights)
    """
    df = _load_patients_from_mongo()

    X = df[["age", "gender_enc", "num_comorbidities", "stage_enc", "bmi"]]
    y = df["eligible"]

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Compute class weights (handle single-class edge case)
    unique_classes = np.unique(y_train)
    if len(unique_classes) < 2:
        class_weight_dict = {0: 1.0, 1: 1.0}
    else:
        class_weights = compute_class_weight('balanced', classes=unique_classes, y=y_train)
        class_weight_dict = {int(c): float(w) for c, w in zip(unique_classes, class_weights)}

    return X_train, X_test, y_train, y_test, class_weight_dict