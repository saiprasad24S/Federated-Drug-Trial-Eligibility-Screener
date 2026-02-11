from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import threading
import time
from typing import List, Dict, Any, Optional
import sys
import os
import json
from datetime import datetime

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    print("Warning: PyPDF2 not available. PDF upload will have limited functionality.")

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Try to import FL components, but make them optional
try:
    from fl_server.server import FederatedServer
    FL_SERVER_AVAILABLE = True
except Exception as e:
    print(f"Warning: Federated Learning Server not available: {e}")
    FL_SERVER_AVAILABLE = False
    FederatedServer = None

# Initialize blockchain logger in a safe, non-fatal way. The helper will
# return a `MockBlockchainLogger` when real blockchain configuration is
# missing or invalid. This ensures the API always starts.
try:
    from blockchain.logger import get_safe_blockchain_logger, MockBlockchainLogger
    blockchain_logger = get_safe_blockchain_logger(strict=False)
    # Print explicit mode for clarity
    if getattr(blockchain_logger, "is_mock", False) or isinstance(blockchain_logger, MockBlockchainLogger):
        print("[BLOCKCHAIN] Mode: MOCK (no on-chain connectivity)")
    else:
        print("[BLOCKCHAIN] Mode: REAL (connected to blockchain)")
except Exception as e:
    print(f"[BLOCKCHAIN] Logger import/init failed: {e}")
    # Ensure we still have a usable mock logger
    from blockchain.logger import MockBlockchainLogger
    blockchain_logger = MockBlockchainLogger()
    print("[BLOCKCHAIN] Mode: MOCK (fallback due to init error)")

app = FastAPI(title="Federated Drug Trial Eligibility Screener API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log application startup audit entry
@app.on_event("startup")
async def log_startup_event():
    if blockchain_logger and hasattr(blockchain_logger, 'log_event'):
        try:
            patients_count = len(_all_patients()) if patients_data.get('patients') else 0
            blockchain_logger.log_event(
                action="SYSTEM_STARTUP",
                details=f"MedFed API server started with {patients_count} patients loaded",
                actor="System",
                record_count=patients_count,
            )
        except Exception:
            pass

# Global variables for state management
training_logs = []
is_training = False
patients_data = {"patients": []}  # flat list of patient dicts
medical_data_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "medical_data.json")

# Load existing medical data if it exists
if os.path.exists(medical_data_file):
    try:
        with open(medical_data_file, 'r') as f:
            raw = json.load(f)
        # Support both legacy {"hospitals": {...}} and new flat {"patients": [...]}
        if "patients" in raw and isinstance(raw["patients"], list):
            patients_data = raw
        elif "hospitals" in raw:
            # Legacy format — flatten
            flat = []
            for hosp, plist in raw["hospitals"].items():
                for p in plist:
                    flat.append(p)
            patients_data = {"patients": flat}
        else:
            patients_data = {"patients": []}
    except Exception as e:
        print(f"Failed to load medical data: {e}")


def _all_patients():
    """Helper: return the flat list of all patients."""
    return patients_data.get("patients", [])

# Initialize blockchain logger with fallback
# `blockchain_logger` is initialized above using `get_safe_blockchain_logger`.

class TrainingRequest(BaseModel):
    num_rounds: int = 10

class LogEntry(BaseModel):
    round: int
    accuracy: float
    loss: float
    timestamp: str
    model_hash: str

class PatientData(BaseModel):
    patient_id: str
    age: int
    gender: Optional[str]
    blood_group: Optional[str]
    disease: str
    stage: Optional[str]
    comorbidities: List[str] = []
    bmi: Optional[float]
    diagnosis_date: Optional[str]
    drug: str
    eligible: int = 0
    drug_worked: int = 0

@app.post("/start-fl")
async def start_federated_learning(request: TrainingRequest):
    """
    Start federated learning training.
    This endpoint starts the FL server and clients in background threads.
    """
    global is_training

    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")

    is_training = True

    def run_training():
        global is_training, training_logs

        try:
            # Create server instance
            server = FederatedServer(num_rounds=request.num_rounds)

            # Start clients in separate threads
            client_threads = []
            for i in range(3):
                thread = threading.Thread(target=start_client, args=(i,))
                thread.daemon = True
                client_threads.append(thread)
                thread.start()

            # Small delay to let clients connect
            time.sleep(2)

            # Start server (this will block until training completes)
            server.start_server()

            # Update global logs
            training_logs = server.training_logs

        except Exception as e:
            print(f"Training failed: {e}")
        finally:
            is_training = False

    # Start training in background thread
    training_thread = threading.Thread(target=run_training)
    training_thread.daemon = True
    training_thread.start()

    return {"message": f"Federated learning started with {request.num_rounds} rounds"}

def start_client(client_id: int):
    """Start a client process."""
    try:
        # Run client in subprocess
        subprocess.run([
            "python", "clients/client.py", str(client_id)
        ], cwd=os.path.dirname(os.path.dirname(__file__)))
    except Exception as e:
        print(f"Client {client_id} failed: {e}")

@app.get("/training-logs", response_model=List[LogEntry])
async def get_training_logs():
    """
    Get training logs from memory.
    In production, you might want to store these in a database.
    """
    return training_logs

@app.get("/model-metrics")
async def get_model_metrics():
    """
    Get current model metrics and blockchain logs.
    """
    if not training_logs:
        return {"message": "No training data available"}

    latest_log = training_logs[-1] if training_logs else None

    # Get blockchain logs (mock or real)
    blockchain_logs = blockchain_logger.get_logs() if blockchain_logger else []
    
    print(f"[DEBUG] /model-metrics: got {len(blockchain_logs)} blockchain logs from logger")
    print(f"[DEBUG] /model-metrics: training_logs count = {len(training_logs)}")
    if blockchain_logs:
        print(f"[DEBUG] /model-metrics: first log = {blockchain_logs[0]}")

    # Format blockchain logs for frontend (ensure required fields)
    formatted_logs = []
    for log in blockchain_logs:
        formatted_logs.append({
            "round": log.get("round_number", 0),
            "accuracy": log.get("accuracy", 0),
            "loss": log.get("loss", 0),
            "timestamp": log.get("timestamp", 0),
            "txHash": log.get("metadata_hash", "0x0000000000000000")
        })

    return {
        "latest_metrics": latest_log,
        "blockchain_logs": formatted_logs,
        "blockchain_logs_count": len(formatted_logs),
        "total_rounds": len(training_logs),
        "is_training": is_training
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "blockchain_connected": blockchain_logger.w3.is_connected() if blockchain_logger else False,
        "training_active": is_training
    }


@app.get("/blockchain-logs")
async def get_blockchain_logs():
    """Return all blockchain audit trail entries (patient uploads, training, eligibility, etc.)."""
    if not blockchain_logger:
        return {"logs": [], "total": 0}

    try:
        if hasattr(blockchain_logger, 'get_audit_logs'):
            audit_logs = blockchain_logger.get_audit_logs()
        else:
            # Fallback: format training logs as audit entries
            raw = blockchain_logger.get_logs() if blockchain_logger else []
            audit_logs = []
            for log in raw:
                audit_logs.append({
                    "action": "TRAINING_ROUND",
                    "details": f"Round {log.get('round_number', '?')} — accuracy {log.get('accuracy', 0):.4f}",
                    "actor": "FL Server",
                    "record_count": 1,
                    "timestamp": log.get("timestamp", 0),
                    "txHash": log.get("metadata_hash", "0x" + "0" * 40),
                    "metadata": log,
                })

        return {"logs": audit_logs, "total": len(audit_logs)}
    except Exception as e:
        print(f"[BLOCKCHAIN] Error getting audit logs: {e}")
        return {"logs": [], "total": 0}

# Hidden internal columns that shouldn't show in the patients table
_HIDDEN_COLUMNS = {"hospital", "eligible", "drug_worked", "drug"}

# Federated-safe columns: only these are shown in the Trials eligibility tables
# (no patient_name, no vitals, no lifestyle — privacy preserving)
_FEDERATED_COLUMNS = [
    "patient_id", "age", "gender", "blood_group", "disease",
    "stage", "comorbidities", "bmi", "diagnosis_date",
]

def _detect_columns(patients_list):
    """Detect all unique keys from patient records, preserving order."""
    seen = dict()  # preserves insertion order in Python 3.7+
    for p in patients_list:
        for k in p.keys():
            if k not in seen and k not in _HIDDEN_COLUMNS:
                seen[k] = True
    return list(seen.keys())

# Track to avoid flooding the audit log with repeated views
_patients_view_logged = False

# ==================== Patient and Trial Endpoints ====================

@app.get("/stats")
async def get_stats():
    """Fast lightweight stats endpoint for the Overview page."""
    try:
        all_p = _all_patients()
        diseases = set()

        for p in all_p:
            diseases.add(p.get("disease", ""))

        return {
            "total_patients": len(all_p),
            "total_trials": 15,  # pre-defined trials
            "total_hospitals": 3,
            "unique_diseases": len(diseases),
            "drug_trials": 15,
            "avg_success_rate": 65.7,
            "is_training": is_training,
            "rounds_completed": len(training_logs),
            "latest_accuracy": round(training_logs[-1]["accuracy"] * 100, 1) if training_logs else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients")
async def get_patients(
    hospital: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc",
):
    """Paginated patients endpoint with server-side search & sort.
    Returns a page of patients + metadata for the frontend table."""
    try:
        all_p = _all_patients()

        # Log the patient view to blockchain audit trail (once per session to avoid flooding)
        global _patients_view_logged
        if not _patients_view_logged and blockchain_logger and hasattr(blockchain_logger, 'log_event'):
            try:
                blockchain_logger.log_event(
                    action="PATIENTS_VIEWED",
                    details=f"Patient data accessed ({len(all_p)} total records in store)",
                    actor=hospital or "System",
                    record_count=len(all_p),
                )
                _patients_view_logged = True
            except Exception:
                pass

        # --- server-side search ---
        if search:
            term = search.lower()
            def matches(p):
                for v in p.values():
                    if v is None:
                        continue
                    if isinstance(v, list):
                        if any(term in str(x).lower() for x in v):
                            return True
                    elif term in str(v).lower():
                        return True
                return False
            all_p = [p for p in all_p if matches(p)]

        total = len(all_p)

        # --- server-side sort ---
        if sort_by:
            reverse = sort_dir == "desc"
            def sort_key(p):
                v = p.get(sort_by)
                if v is None:
                    return (1, "")
                if isinstance(v, (int, float)):
                    return (0, v)
                return (0, str(v).lower())
            all_p = sorted(all_p, key=sort_key, reverse=reverse)

        # --- pagination ---
        page = max(1, page)
        page_size = min(max(1, page_size), 200)  # cap at 200
        total_pages = max(1, -(-total // page_size))  # ceil division
        start = (page - 1) * page_size
        end = start + page_size
        page_data = all_p[start:end]

        columns = _detect_columns(_all_patients()[:100]) if _all_patients() else []

        return {
            "patients": page_data,
            "columns": columns,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _compute_eligibility(patient: dict, trial_params: dict) -> bool:
    """Dynamically check if a patient meets a trial's eligibility criteria.
    trial_params has keys: ageRange, genders, bloodGroups, bmiRange, stages.
    A patient is eligible if they satisfy ALL present criteria."""
    age = patient.get("age")
    if age is not None and trial_params.get("ageRange"):
        lo, hi = trial_params["ageRange"]
        if not (lo <= age <= hi):
            return False

    gender = patient.get("gender", "")
    allowed_genders = trial_params.get("genders", [])
    if allowed_genders and gender and gender not in allowed_genders:
        return False

    bg = patient.get("blood_group", "")
    allowed_bg = trial_params.get("bloodGroups", [])
    if allowed_bg and bg and bg not in allowed_bg:
        return False

    bmi = patient.get("bmi")
    if bmi is not None and trial_params.get("bmiRange"):
        lo, hi = trial_params["bmiRange"]
        if not (lo <= bmi <= hi):
            return False

    stage = patient.get("stage", "")
    allowed_stages = trial_params.get("stages", [])
    if allowed_stages and stage and stage not in allowed_stages:
        return False

    return True


@app.get("/trials")
async def get_trials():
    """Return pre-defined drug trials with eligibility criteria.
    Each trial targets a specific disease/condition. Eligible counts are estimated
    by sampling the current patient pool."""
    import random as _rand
    try:
        all_p = _all_patients()
        total_patients = len(all_p)

        # Discover diseases and their patient counts
        disease_counts = {}
        for p in all_p:
            dis = p.get("disease", "")
            if dis:
                disease_counts[dis] = disease_counts.get(dis, 0) + 1

        # Pre-defined drug trials mapped to diseases
        TRIAL_DEFS = [
            {"drugName": "Metformin-XL",     "indication": "Diabetes",           "phase": "Phase III", "status": "Active",    "successRate": 72.4},
            {"drugName": "Cardiozen-B",      "indication": "Heart Disease",      "phase": "Phase III", "status": "Active",    "successRate": 65.8},
            {"drugName": "Oncoguard-7",      "indication": "Cancer",             "phase": "Phase II",  "status": "Active",    "successRate": 48.2},
            {"drugName": "Pneumofix-R",      "indication": "Pneumonia",          "phase": "Phase III", "status": "Active",    "successRate": 81.3},
            {"drugName": "Nephrostat-C",     "indication": "Kidney Disease",     "phase": "Phase II",  "status": "Active",    "successRate": 59.7},
            {"drugName": "Hepatocure-D",     "indication": "Liver Disease",      "phase": "Phase III", "status": "Active",    "successRate": 63.1},
            {"drugName": "NeuroShield-X",    "indication": "Stroke",             "phase": "Phase II",  "status": "Active",    "successRate": 55.9},
            {"drugName": "Arthroven-P",      "indication": "Arthritis",          "phase": "Phase III", "status": "Active",    "successRate": 70.2},
            {"drugName": "Pulmoclear-S",     "indication": "Asthma",             "phase": "Phase III", "status": "Completed", "successRate": 76.5},
            {"drugName": "HyperNorm-T",      "indication": "Hypertension",       "phase": "Phase III", "status": "Active",    "successRate": 68.9},
            {"drugName": "ThyroBalance-F",   "indication": "Thyroid Disorder",   "phase": "Phase II",  "status": "Active",    "successRate": 61.4},
            {"drugName": "Bortezomib",       "indication": "Multiple Myeloma",   "phase": "Phase III", "status": "Active",    "successRate": 52.0},
            {"drugName": "Anemiron-G",       "indication": "Anemia",             "phase": "Phase III", "status": "Active",    "successRate": 74.1},
            {"drugName": "DermaHeal-V",      "indication": "Skin Disease",       "phase": "Phase II",  "status": "Active",    "successRate": 66.3},
            {"drugName": "GastroEase-M",     "indication": "Gastrointestinal",   "phase": "Phase III", "status": "Active",    "successRate": 71.0},
        ]

        # Sample for fast eligibility estimation
        SAMPLE_SIZE = 2000
        sample = _rand.sample(all_p, min(SAMPLE_SIZE, total_patients)) if total_patients > SAMPLE_SIZE else all_p
        sample_len = len(sample)

        trials = []
        for idx, tdef in enumerate(TRIAL_DEFS):
            disease = tdef["indication"]
            enrolled = disease_counts.get(disease, 0)

            # Build eligibility criteria from patients with this disease
            elig_params = _build_trial_params_for_disease(all_p, disease)

            # Estimate eligible count from sample
            sample_eligible = sum(1 for p in sample if _compute_eligibility(p, elig_params))
            estimated_eligible = round(sample_eligible * total_patients / sample_len) if sample_len > 0 else 0

            trials.append({
                "id": idx + 1,
                "drugName": tdef["drugName"],
                "indication": disease,
                "phase": tdef["phase"],
                "status": tdef["status"],
                "patientsEnrolled": enrolled,
                "successRate": tdef["successRate"],
                "startDate": "2025-01-15",
                "lastUpdate": datetime.now().strftime("%Y-%m-%d"),
                "eligibilityParams": elig_params,
                "eligibleFromCurrent": estimated_eligible,
                "sourceHospitalCount": 3,
            })

        return {"trials": trials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _build_trial_params_for_disease(all_patients, disease):
    """Build eligibility parameters from patients with the given disease."""
    ages, bmis, genders, blood_groups, stages, comorbidities = [], [], set(), set(), set(), []
    for p in all_patients:
        if p.get("disease", "") == disease:
            a = p.get("age")
            if a is not None: ages.append(a)
            g = p.get("gender")
            if g: genders.add(g)
            bg = p.get("blood_group")
            if bg: blood_groups.add(bg)
            b = p.get("bmi")
            if b is not None: bmis.append(b)
            s = p.get("stage")
            if s: stages.add(s)
            c = p.get("comorbidities", [])
            if isinstance(c, list):
                comorbidities.extend(c)
    comorbidity_counts = {}
    for c in comorbidities:
        comorbidity_counts[c] = comorbidity_counts.get(c, 0) + 1
    top_comorbidities = sorted(comorbidity_counts, key=comorbidity_counts.get, reverse=True)[:5]
    return {
        "ageRange": [min(ages), max(ages)] if ages else [18, 85],
        "genders": sorted(genders) if genders else ["Male", "Female"],
        "bloodGroups": sorted(blood_groups) if blood_groups else [],
        "bmiRange": [round(min(bmis), 1), round(max(bmis), 1)] if bmis else [15.0, 40.0],
        "stages": sorted(stages) if stages else [],
        "commonComorbidities": top_comorbidities,
    }


@app.get("/trials/{drug_name}/eligible")
async def get_eligible_patients_for_drug(
    drug_name: str,
    hospital: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    tab: str = "eligible",
):
    """Check current patients against the trial's eligibility criteria.
    Returns COUNTS for both groups but only the PAGINATED list for the active tab."""
    try:
        page_size = min(max(page_size, 10), 200)
        page = max(page, 1)

        all_p = _all_patients()

        # Look up the trial definition to find its disease
        TRIAL_DISEASE_MAP = {
            "Metformin-XL": "Diabetes", "Cardiozen-B": "Heart Disease",
            "Oncoguard-7": "Cancer", "Pneumofix-R": "Pneumonia",
            "Nephrostat-C": "Kidney Disease", "Hepatocure-D": "Liver Disease",
            "NeuroShield-X": "Stroke", "Arthroven-P": "Arthritis",
            "Pulmoclear-S": "Asthma", "HyperNorm-T": "Hypertension",
            "ThyroBalance-F": "Thyroid Disorder", "Bortezomib": "Multiple Myeloma",
            "Anemiron-G": "Anemia", "DermaHeal-V": "Skin Disease",
            "GastroEase-M": "Gastrointestinal",
        }
        disease = TRIAL_DISEASE_MAP.get(drug_name, drug_name)
        trial_params = _build_trial_params_for_disease(all_p, disease)

        # Split into eligible / not-eligible (collect IDs only first for speed)
        eligible_ids = []
        not_eligible_ids = []
        for i, patient in enumerate(all_p):
            if _compute_eligibility(patient, trial_params):
                eligible_ids.append(i)
            else:
                not_eligible_ids.append(i)

        eligible_count = len(eligible_ids)
        not_eligible_count = len(not_eligible_ids)

        # Log the eligibility check to blockchain audit trail
        if blockchain_logger and hasattr(blockchain_logger, 'log_event'):
            try:
                blockchain_logger.log_event(
                    action="ELIGIBILITY_SCREEN",
                    details=f"{drug_name}: {eligible_count} eligible, {not_eligible_count} not eligible out of {len(all_p)} patients",
                    actor=hospital or "System",
                    record_count=eligible_count + not_eligible_count,
                    metadata={"drug": drug_name, "eligible": eligible_count, "not_eligible": not_eligible_count},
                )
            except Exception:
                pass

        # Paginate only the requested tab
        if tab == "eligible":
            start = (page - 1) * page_size
            end = start + page_size
            page_ids = eligible_ids[start:end]
            total_for_tab = eligible_count
        else:
            start = (page - 1) * page_size
            end = start + page_size
            page_ids = not_eligible_ids[start:end]
            total_for_tab = not_eligible_count

        page_patients_raw = [all_p[i] for i in page_ids]
        total_pages = max(1, -(-total_for_tab // page_size))  # ceil div

        # Return only federated-safe columns (privacy preserving)
        cols = [c for c in _FEDERATED_COLUMNS if any(c in p for p in page_patients_raw[:5])]
        page_patients = [
            {k: p.get(k) for k in cols}
            for p in page_patients_raw
        ]

        return {
            "drug": drug_name,
            "hospital": hospital,
            "tab": tab,
            "patients": page_patients,
            "columns": cols,
            "eligible_count": eligible_count,
            "not_eligible_count": not_eligible_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "trial_params": trial_params,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Unified Upload Endpoint ====================
# Import preprocessing pipeline
try:
    from preprocessing import preprocess_upload, save_standard_csv, generate_federated_training_csv
    PREPROCESSING_AVAILABLE = True
except ImportError:
    PREPROCESSING_AVAILABLE = False
    print("Warning: preprocessing module not found.")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
CSV_ARCHIVE_DIR = os.path.join(UPLOAD_DIR, "csv_archive")
TRAINING_CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "federated_screener", "mimic_adapted.csv")
# Fallback path if the nested one doesn't exist
TRAINING_CSV_FALLBACK = os.path.join(os.path.dirname(__file__), "..", "mimic_adapted.csv")


# ---- In-memory preprocessing progress store ----
_upload_progress: Dict[str, Dict] = {}

@app.get("/upload-progress/{upload_id}")
async def get_upload_progress(upload_id: str):
    """Poll preprocessing progress for a given upload_id."""
    return _upload_progress.get(upload_id, {"percent": 0, "stage": "waiting"})


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), hospital: Optional[str] = None):
    """Unified upload endpoint.
    Accepts CSV, JSON, or PDF files.  All are preprocessed into a standard
    patient CSV, merged into the app's JSON store, and a federated-training-
    compatible CSV is regenerated.
    """
    global patients_data

    if not PREPROCESSING_AVAILABLE:
        raise HTTPException(status_code=500, detail="Preprocessing module not available")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".csv", ".json", ".pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload CSV, JSON, or PDF.")

    content = await file.read()
    default_hospital = hospital or "Unknown Hospital"

    # Generate upload_id for progress tracking
    import uuid as _uuid
    upload_id = _uuid.uuid4().hex[:12]
    _upload_progress[upload_id] = {"percent": 5, "stage": "Reading file..."}

    try:
        # 1. Preprocess into standard DataFrame + JSON structure
        _upload_progress[upload_id] = {"percent": 15, "stage": "Parsing file..."}
        df, json_structure = preprocess_upload(content, file.filename, default_hospital)
        _upload_progress[upload_id] = {"percent": 40, "stage": "Normalising columns..."}

        # 2. Save a timestamped CSV archive copy
        _upload_progress[upload_id] = {"percent": 50, "stage": "Saving standard CSV..."}
        csv_path = save_standard_csv(df, CSV_ARCHIVE_DIR, filename_prefix="patients")

        # 3. Merge into in-memory patient store (flat list)
        _upload_progress[upload_id] = {"percent": 60, "stage": "Merging into patient store..."}
        new_patients_list = []
        for hosp, plist in json_structure["hospitals"].items():
            for p in plist:
                p.pop("hospital", None)
                p.pop("eligible", None)
                p.pop("drug", None)
                p.pop("drug_worked", None)
                new_patients_list.append(p)
        patients_data["patients"].extend(new_patients_list)

        # 4. Persist the merged JSON
        _upload_progress[upload_id] = {"percent": 70, "stage": "Persisting JSON..."}
        with open(medical_data_file, "w") as f:
            json.dump(patients_data, f, indent=2)

        # 5. Regenerate federated training CSV (mimic_adapted.csv)
        _upload_progress[upload_id] = {"percent": 80, "stage": "Generating training CSV..."}
        all_p = _all_patients()
        if all_p:
            from preprocessing import normalise
            import pandas as _pd
            full_df = _pd.DataFrame(all_p)
            if "comorbidities" not in full_df.columns:
                full_df["comorbidities"] = [[] for _ in range(len(full_df))]
            training_path = TRAINING_CSV_FALLBACK
            generate_federated_training_csv(
                normalise(full_df, default_hospital="All"),
                training_path
            )
            print(f"[PREPROCESS] Regenerated training CSV at {training_path} ({len(full_df)} rows)")

        total_patients = len(patients_data["patients"])
        new_patients = len(new_patients_list)
        hospitals_in_file = list(json_structure["hospitals"].keys())

        # 6. Log to blockchain
        _upload_progress[upload_id] = {"percent": 90, "stage": "Logging to blockchain..."}
        if blockchain_logger:
            try:
                blockchain_logger.log_data_upload(
                    data_type=ext.replace(".", "").upper(),
                    source="File Upload",
                    record_count=new_patients,
                    hospitals=hospitals_in_file
                )
            except Exception as e:
                print(f"Failed to log to blockchain: {e}")

        # Detect columns from the uploaded data for dynamic table
        detected_columns = _detect_columns(patients_data["patients"]) if patients_data["patients"] else []

        _upload_progress[upload_id] = {"percent": 100, "stage": "Complete"}

        return {
            "message": f"File processed successfully ({ext.upper().replace('.', '')} → standard CSV → federated store)",
            "file_type": ext.replace(".", ""),
            "new_patients": new_patients,
            "hospitals_in_file": hospitals_in_file,
            "total_patients": total_patients,
            "csv_archive": csv_path,
            "columns": detected_columns,
            "upload_id": upload_id,
        }

    except ValueError as ve:
        _upload_progress[upload_id] = {"percent": -1, "stage": f"Error: {ve}"}
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        _upload_progress[upload_id] = {"percent": -1, "stage": f"Error: {e}"}
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Keep legacy endpoints as aliases so existing frontend calls still work
@app.post("/upload-json")
async def upload_json(file: UploadFile = File(...), hospital: Optional[str] = None):
    """Legacy JSON upload – delegates to unified /upload."""
    return await upload_file(file, hospital)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), hospital: Optional[str] = None):
    """Legacy PDF upload – delegates to unified /upload."""
    return await upload_file(file, hospital)

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), hospital: Optional[str] = None):
    """Legacy CSV upload – delegates to unified /upload."""
    return await upload_file(file, hospital)

@app.post("/predict")
async def predict_eligibility(patient: PatientData):
    """Predict patient eligibility for a trial."""
    try:
        # Simple eligibility prediction based on rules
        score = 0
        reasons = []

        # Age scoring
        if 18 <= patient.age <= 65:
            score += 30
            reasons.append("Age within optimal range")
        elif patient.age > 65:
            score += 15
            reasons.append("Age above 65, reduced eligibility")
        else:
            reasons.append("Age below 18, ineligible")

        # BMI scoring
        if patient.bmi and 18.5 <= patient.bmi <= 30:
            score += 25
            reasons.append("BMI within healthy range")
        elif patient.bmi:
            score += 10
            reasons.append("BMI outside healthy range")

        # Disease stage scoring
        if patient.stage in ["I", "II"]:
            score += 25
            reasons.append("Early stage disease, good for trial")
        elif patient.stage == "III":
            score += 15
            reasons.append("Advanced stage disease")

        # Comorbidities
        if len(patient.comorbidities) <= 1:
            score += 20
            reasons.append("Few comorbidities")
        else:
            score += 5
            reasons.append("Multiple comorbidities present")

        eligible = 1 if score >= 60 else 0

        # Log prediction to blockchain audit trail
        if blockchain_logger and hasattr(blockchain_logger, 'log_event'):
            try:
                blockchain_logger.log_event(
                    action="ELIGIBILITY_PREDICTION",
                    details=f"Patient {patient.patient_id} scored {score}/100 — {'Eligible' if eligible else 'Not Eligible'} for {patient.disease}/{patient.drug}",
                    actor="Prediction Engine",
                    record_count=1,
                    metadata={"patient_id": patient.patient_id, "score": score, "eligible": eligible},
                )
            except Exception:
                pass

        return {
            "eligible": eligible,
            "score": score,
            "reasons": reasons,
            "recommendation": "Eligible for trial" if eligible else "Not eligible for trial"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training-status")
async def get_training_status():
    """Get current training status."""
    return {
        "is_training": is_training,
        "total_rounds": len(training_logs),
        "rounds_completed": len(training_logs),
        "latest_metrics": training_logs[-1] if training_logs else None
    }

@app.post("/start-training")
async def start_training(request: Dict[str, Any] = None):
    """Start training with optional configuration."""
    global is_training, training_logs
    
    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")
    
    is_training = True
    num_rounds = request.get("num_rounds", 10) if request else 10

    # Log training start to audit trail
    if blockchain_logger and hasattr(blockchain_logger, 'log_event'):
        try:
            blockchain_logger.log_event(
                action="TRAINING_STARTED",
                details=f"Federated learning training started with {num_rounds} rounds",
                actor="Training Controller",
                record_count=num_rounds,
            )
        except Exception:
            pass

    def run_training_simulation():
        global is_training, training_logs
        import random
        try:
            # Simulate training rounds
            training_logs = []
            for round_num in range(1, num_rounds + 1):
                # Simulate metrics that improve over time
                accuracy = 0.65 + (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                accuracy = min(0.95, max(0.6, accuracy))  # Clamp between 0.6 and 0.95
                
                loss = 0.5 - (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                loss = max(0.1, loss)  # Keep loss positive
                
                model_hash = f"model_r{round_num}_h{hash(str(round_num)) % 10000}"
                
                log_entry = {
                    "round": round_num,
                    "accuracy": round(accuracy, 4),
                    "loss": round(loss, 4),
                    "timestamp": datetime.now().isoformat(),
                    "model_hash": model_hash,
                }
                training_logs.append(log_entry)
                
                # Enqueue to blockchain logger (non-blocking)
                if blockchain_logger:
                    try:
                        ok, tx = blockchain_logger.enqueue_training_metadata(
                            round_number=round_num,
                            accuracy=float(accuracy),
                            model_hash=model_hash
                        )
                        print(f"[TRAINING] Round {round_num} enqueued to blockchain: success={ok}, tx={tx}")
                    except Exception as e:
                        print(f"[TRAINING] Failed to enqueue round {round_num}: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"[TRAINING] blockchain_logger is None, cannot enqueue round {round_num}")
                
                # Simulate training time (0.5 seconds per round)
                time.sleep(0.5)
                
                if not is_training:
                    break
            
        except Exception as e:
            print(f"Training simulation error: {e}")
        finally:
            is_training = False
    
    # Start training in background thread
    training_thread = threading.Thread(target=run_training_simulation, daemon=True)
    training_thread.start()
    
    return {"message": f"Training started with {num_rounds} rounds"}

@app.post("/stop-training")
async def stop_training():
    """Stop ongoing training."""
    global is_training
    is_training = False
    return {"message": "Training stopped"}

@app.post("/reset-training")
async def reset_training():
    """Reset training logs and state."""
    global is_training, training_logs
    is_training = False
    training_logs = []
    return {"message": "Training state reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)