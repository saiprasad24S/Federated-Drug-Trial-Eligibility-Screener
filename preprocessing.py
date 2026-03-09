"""
Preprocessing Pipeline for Federated Drug Trial Screener
=========================================================
Converts uploaded files (CSV, JSON, PDF) into a standard patient CSV format,
then generates the federated JSON structure (grouped by hospital) for the
application to consume.

Standard CSV columns:
    patient_id, age, gender, blood_group, disease, stage, comorbidities,
    bmi, diagnosis_date, drug, eligible, drug_worked, hospital

The pipeline:
    1. Detect file type → parse raw content into a pandas DataFrame.
    2. Normalise / map columns to the standard schema.
    3. Fill missing values with sensible defaults.
    4. Export a clean CSV (for audit / federated training).
    5. Convert to the JSON structure expected by the app
       ({"hospitals": {"HospitalName": [patient_dicts]}}).
"""

import os
import io
import re
import json
import uuid
import hashlib
from datetime import datetime
from typing import Tuple, Dict, Any, Optional, List

import pandas as pd
import numpy as np

# Optional PDF support
try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

# ---------------------------------------------------------------------------
# Column mapping: we try to recognise many common column name variants
# ---------------------------------------------------------------------------
COLUMN_ALIASES = {
    "patient_id": ["patient_id", "patientid", "id", "pid", "patient", "subject_id", "hadm_id", "record_id"],
    "patient_name": ["patient_name", "patientname", "name", "full_name", "fullname", "first_name"],
    "phone": ["phone", "phone_number", "mobile", "contact_number", "telephone", "cell"],
    "email": ["email", "email_address", "e_mail", "emailid"],
    "address": ["address", "residential_address", "home_address", "street_address", "location"],
    "emergency_contact": ["emergency_contact", "emergency_phone", "next_of_kin", "guardian_contact", "kin_phone"],
    "admission_date": ["admission_date", "admit_date", "admittime", "date_of_admission", "admitted_on"],
    "age": ["age", "patient_age", "age_years", "years"],
    "gender": ["gender", "sex", "gender_enc", "male", "female", "m/f"],
    "blood_group": ["blood_group", "bloodgroup", "blood_type", "bloodtype", "blood"],
    "disease": ["disease", "diagnosis", "condition", "indication", "primary_diagnosis", "icd_title"],
    "stage": ["stage", "stage_enc", "disease_stage", "cancer_stage", "severity"],
    "comorbidities": ["comorbidities", "comorbidity", "comorbid", "other_conditions", "secondary_diagnosis"],
    "bmi": ["bmi", "body_mass_index", "bodymassindex"],
    "diagnosis_date": ["diagnosis_date", "date", "dx_date"],
    "drug": ["drug", "medication", "treatment", "drug_name", "medicine", "therapy", "prescription"],
    "eligible": ["eligible", "eligibility", "is_eligible"],
    "drug_worked": ["drug_worked", "drugworked", "outcome", "response", "effective", "success"],
    "hospital": ["hospital", "hospital_name", "facility", "site", "centre", "center", "source"],
}

# Standard columns in output order
STANDARD_COLUMNS = [
    "patient_id", "patient_name", "phone", "email", "address",
    "emergency_contact", "admission_date",
    "age", "gender", "blood_group", "disease", "stage",
    "comorbidities", "bmi", "diagnosis_date", "drug", "eligible",
    "drug_worked", "hospital"
]

GENDER_MAP = {
    0: "Male", 1: "Female", "0": "Male", "1": "Female",
    "m": "Male", "f": "Female", "male": "Male", "female": "Female",
    "M": "Male", "F": "Female",
}

STAGE_MAP = {
    1: "I", 2: "II", 3: "III", 4: "IV",
    "1": "I", "2": "II", "3": "III", "4": "IV",
    "i": "I", "ii": "II", "iii": "III", "iv": "IV",
    "stage i": "I", "stage ii": "II", "stage iii": "III", "stage iv": "IV",
}

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


# ========================== PARSERS ======================================

def parse_csv(content: bytes, filename: str = "") -> pd.DataFrame:
    """Parse CSV bytes into a DataFrame."""
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        # Try different encodings / delimiters
        for enc in ("utf-8", "latin-1", "cp1252"):
            for sep in (",", ";", "\t", "|"):
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc, sep=sep)
                    if len(df.columns) > 1:
                        return df
                except Exception:
                    continue
        raise ValueError("Could not parse CSV file. Check the delimiter and encoding.")
    return df


def parse_json_file(content: bytes) -> pd.DataFrame:
    """Parse a JSON file into a DataFrame.
    Handles both:
      - {"hospitals": {"Name": [records]}}  (our app format)
      - [records]                           (flat list)
      - {"patients": [records]}
    """
    data = json.loads(content)

    if isinstance(data, list):
        return pd.DataFrame(data)

    if "hospitals" in data:
        rows = []
        for hosp, patients in data["hospitals"].items():
            for p in patients:
                p.setdefault("hospital", hosp)
                rows.append(p)
        return pd.DataFrame(rows)

    if "patients" in data:
        return pd.DataFrame(data["patients"])

    # Try to treat the whole object as a single record
    if isinstance(data, dict):
        return pd.DataFrame([data])

    raise ValueError("Unrecognised JSON structure.")


def parse_pdf(content: bytes) -> pd.DataFrame:
    """Extract tabular patient data from a PDF.
    Uses PyPDF2 to extract text, then tries to parse CSV-like lines.
    """
    if not PYPDF2_AVAILABLE:
        raise ValueError("PDF support requires PyPDF2. Install it with: pip install PyPDF2")

    reader = PyPDF2.PdfReader(io.BytesIO(content))
    text_lines = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text_lines.extend(page_text.splitlines())

    if not text_lines:
        raise ValueError("Could not extract any text from the PDF.")

    # Try to detect a header line (contains multiple known column names)
    header_idx = None
    for i, line in enumerate(text_lines):
        lower = line.lower()
        matches = sum(1 for alias_list in COLUMN_ALIASES.values()
                      for alias in alias_list if alias in lower)
        if matches >= 3:
            header_idx = i
            break

    if header_idx is not None:
        # Parse as delimiter-separated (try comma, tab, multiple-spaces)
        header_line = text_lines[header_idx]
        for sep in [",", "\t", "  "]:
            cols = [c.strip() for c in header_line.split(sep) if c.strip()]
            if len(cols) >= 3:
                rows = []
                for line in text_lines[header_idx + 1:]:
                    vals = [v.strip() for v in line.split(sep) if v.strip()]
                    if len(vals) == len(cols):
                        rows.append(vals)
                if rows:
                    return pd.DataFrame(rows, columns=cols)

    # Fallback: try regex for structured patient-like rows
    # Look for lines like: "SP001, 45, Male, O+, ..."
    pattern = re.compile(
        r'([A-Z]{1,5}\d{2,6})\s*[,|]\s*(\d{1,3})\s*[,|]\s*(Male|Female|M|F)\s*[,|]',
        re.IGNORECASE
    )
    rows = []
    for line in text_lines:
        m = pattern.search(line)
        if m:
            parts = re.split(r'[,|\t]+', line)
            rows.append([p.strip() for p in parts])

    if rows:
        # Try to guess columns
        max_cols = max(len(r) for r in rows)
        # Pad short rows
        rows = [r + [""] * (max_cols - len(r)) for r in rows]
        col_names = STANDARD_COLUMNS[:max_cols] if max_cols <= len(STANDARD_COLUMNS) else [f"col_{i}" for i in range(max_cols)]
        return pd.DataFrame(rows, columns=col_names)

    raise ValueError(
        "Could not extract structured patient data from PDF. "
        "Ensure the PDF contains tabular data with headers."
    )


# ========================== NORMALISATION ================================

def _resolve_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Map actual DataFrame column names → standard names."""
    mapping = {}
    used = set()
    df_cols_lower = {c: c.lower().strip().replace(" ", "_") for c in df.columns}

    for std_name, aliases in COLUMN_ALIASES.items():
        for actual_col, lower_col in df_cols_lower.items():
            if actual_col in used:
                continue
            if lower_col in aliases:
                mapping[actual_col] = std_name
                used.add(actual_col)
                break
    return mapping


def _generate_patient_id(row_idx: int, hospital: str = "") -> str:
    seed = f"{hospital}_{row_idx}_{uuid.uuid4().hex[:6]}"
    return "P" + hashlib.md5(seed.encode()).hexdigest()[:7].upper()


def normalise(df: pd.DataFrame, default_hospital: str = "Unknown Hospital") -> pd.DataFrame:
    """Normalise a raw DataFrame into the standard patient schema."""

    # 1. Resolve column names
    col_map = _resolve_columns(df)
    df = df.rename(columns=col_map)

    # 2. Ensure every standard column exists
    for col in STANDARD_COLUMNS:
        if col not in df.columns:
            df[col] = None

    # 3. Keep only standard columns (+ any extras silently dropped)
    df = df[STANDARD_COLUMNS].copy()

    # 4. Type conversions and cleaning
    # Age
    df["age"] = pd.to_numeric(df["age"], errors="coerce")
    df["age"] = df["age"].fillna(df["age"].median() if df["age"].notna().any() else 50)
    df["age"] = df["age"].clip(0, 120).round(0).astype(int)

    # Gender
    df["gender"] = df["gender"].apply(
        lambda x: GENDER_MAP.get(str(x).strip().lower(), GENDER_MAP.get(x, str(x) if pd.notna(x) else "Unknown"))
    )

    # Blood group
    df["blood_group"] = df["blood_group"].apply(
        lambda x: x if (pd.notna(x) and str(x).strip() in BLOOD_GROUPS) else
        np.random.choice(BLOOD_GROUPS) if pd.isna(x) else str(x).strip()
    )

    # Disease
    df["disease"] = df["disease"].fillna("Unknown Disease").astype(str)

    # Stage
    df["stage"] = df["stage"].apply(
        lambda x: STAGE_MAP.get(str(x).strip().lower(), str(x).strip() if pd.notna(x) else
        np.random.choice(["I", "II", "III", "IV"]))
    )

    # Comorbidities (convert from string if needed)
    def _parse_comorbidities(val):
        if isinstance(val, list):
            return val
        if pd.isna(val) or val is None or str(val).strip() in ("", "None", "nan", "[]"):
            return []
        s = str(val).strip()
        if s.startswith("["):
            try:
                return json.loads(s.replace("'", '"'))
            except Exception:
                pass
        return [c.strip() for c in s.split(",") if c.strip()]

    df["comorbidities"] = df["comorbidities"].apply(_parse_comorbidities)

    # If comorbidities came as a count (numeric), expand to placeholder list
    if df["comorbidities"].apply(lambda x: isinstance(x, (int, float))).any():
        df["comorbidities"] = df["comorbidities"].apply(
            lambda x: [f"Condition_{i+1}" for i in range(int(x))] if isinstance(x, (int, float)) and not np.isnan(x) else x
        )

    # BMI
    df["bmi"] = pd.to_numeric(df["bmi"], errors="coerce")
    df["bmi"] = df["bmi"].fillna(df["bmi"].median() if df["bmi"].notna().any() else 25.0).round(1)

    # Diagnosis date
    df["diagnosis_date"] = df["diagnosis_date"].fillna(datetime.now().strftime("%Y-%m-%d"))

    # Drug
    df["drug"] = df["drug"].fillna("Unknown Drug").astype(str)

    # Eligible / drug_worked (binary)
    for col in ("eligible", "drug_worked"):
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int).clip(0, 1)

    # Hospital
    df["hospital"] = df["hospital"].fillna(default_hospital).astype(str)

    # Patient ID — generate if missing
    mask = df["patient_id"].isna() | (df["patient_id"].astype(str).str.strip() == "")
    if mask.any():
        df.loc[mask, "patient_id"] = [
            _generate_patient_id(i, str(df.loc[i, "hospital"]))
            for i in df.index[mask]
        ]

    return df


# ========================== PIPELINE =====================================

def preprocess_upload(
    content: bytes,
    filename: str,
    default_hospital: str = "Unknown Hospital"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Full preprocessing pipeline.

    Args:
        content: Raw bytes of the uploaded file.
        filename: Original filename (used to detect type).
        default_hospital: Hospital name to assign when not present in data.

    Returns:
        (normalised_df, json_structure)
        - normalised_df: clean pandas DataFrame with standard columns
        - json_structure: {"hospitals": {"Name": [patient_dicts]}} ready to merge
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".csv":
        raw_df = parse_csv(content, filename)
    elif ext == ".json":
        raw_df = parse_json_file(content)
    elif ext == ".pdf":
        raw_df = parse_pdf(content)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use CSV, JSON, or PDF.")

    if raw_df.empty:
        raise ValueError("The uploaded file contains no data rows.")

    # Normalise
    df = normalise(raw_df, default_hospital=default_hospital)

    # Build JSON structure grouped by hospital
    json_structure: Dict[str, Any] = {"hospitals": {}}
    for hospital, group in df.groupby("hospital"):
        records = group.to_dict(orient="records")
        # Ensure comorbidities stays as list (json-safe)
        for r in records:
            if not isinstance(r.get("comorbidities"), list):
                r["comorbidities"] = []
        json_structure["hospitals"][hospital] = records

    return df, json_structure


def save_standard_csv(df: pd.DataFrame, output_dir: str, filename_prefix: str = "patients") -> str:
    """Save the normalised DataFrame as a standard CSV for audit / training."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = os.path.join(output_dir, f"{filename_prefix}_{timestamp}.csv")
    df.to_csv(csv_path, index=False)
    return csv_path


def generate_federated_training_csv(df: pd.DataFrame, output_path: str) -> str:
    """
    Convert the standard patient DataFrame into the numeric format expected
    by the federated training pipeline (mimic_adapted.csv compatible).

    Columns: age, gender_enc, num_comorbidities, stage_enc, bmi, eligible
    """
    train_df = pd.DataFrame()
    train_df["age"] = df["age"].astype(float)
    train_df["gender_enc"] = df["gender"].map({"Male": 0, "Female": 1}).fillna(0).astype(int)
    train_df["num_comorbidities"] = df["comorbidities"].apply(lambda x: len(x) if isinstance(x, list) else 0)

    stage_enc_map = {"I": 1, "II": 2, "III": 3, "IV": 4}
    train_df["stage_enc"] = df["stage"].map(stage_enc_map).fillna(2).astype(int)
    train_df["bmi"] = df["bmi"].astype(float)
    train_df["eligible"] = df["eligible"].astype(int)

    train_df.to_csv(output_path, index=False)
    return output_path
