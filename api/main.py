from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

# ---------------------------------------------------------------------------
# MongoDB setup
# ---------------------------------------------------------------------------
import database as db

# Initialize database (sync — runs during import/startup)
try:
    db.init_database()
    print("[DATABASE] MongoDB initialized successfully")
except Exception as e:
    print(f"[DATABASE] MongoDB initialization failed: {e}")
    import traceback
    traceback.print_exc()

# ---------------------------------------------------------------------------
# FL Components (optional)
# ---------------------------------------------------------------------------
try:
    from fl_server.server import FederatedServer
    FL_SERVER_AVAILABLE = True
except Exception as e:
    print(f"Warning: Federated Learning Server not available: {e}")
    FL_SERVER_AVAILABLE = False
    FederatedServer = None

# ---------------------------------------------------------------------------
# Blockchain logger
# ---------------------------------------------------------------------------
try:
    from blockchain.logger import get_safe_blockchain_logger, MockBlockchainLogger
    blockchain_logger = get_safe_blockchain_logger(strict=False)
    if getattr(blockchain_logger, "is_mock", False) or isinstance(blockchain_logger, MockBlockchainLogger):
        print("[BLOCKCHAIN] Mode: MOCK (no on-chain connectivity)")
    else:
        print("[BLOCKCHAIN] Mode: REAL (connected to blockchain)")
except Exception as e:
    print(f"[BLOCKCHAIN] Logger import/init failed: {e}")
    from blockchain.logger import MockBlockchainLogger
    blockchain_logger = MockBlockchainLogger()
    print("[BLOCKCHAIN] Mode: MOCK (fallback due to init error)")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Federated Drug Trial Eligibility Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global in-memory state (training only — ephemeral)
# ---------------------------------------------------------------------------
training_logs: list = []
is_training: bool = False

# ---------------------------------------------------------------------------
# Blockchain audit-log throttle  (prevents spamming on repeated page views)
# ---------------------------------------------------------------------------
_audit_last_logged: Dict[str, float] = {}   # action -> last epoch
_AUDIT_COOLDOWN = 10  # seconds between duplicate action logs

def _should_log_action(action: str, cooldown: float = _AUDIT_COOLDOWN) -> bool:
    """Return True if enough time has passed since the last log of this action."""
    now = time.time()
    last = _audit_last_logged.get(action, 0)
    if now - last >= cooldown:
        _audit_last_logged[action] = now
        return True
    return False

def _log_audit(action: str, details: str = "", actor: str = "System",
               record_count: int = 0, metadata: dict = None,
               cooldown: float = _AUDIT_COOLDOWN) -> None:
    """Convenience: throttle + fire-and-forget blockchain audit log."""
    if not blockchain_logger or not hasattr(blockchain_logger, 'log_event'):
        return
    if not _should_log_action(action, cooldown):
        return
    try:
        blockchain_logger.log_event(
            action=action, details=details, actor=actor,
            record_count=record_count, metadata=metadata,
        )
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def log_startup_event():
    """Log startup to blockchain audit trail and persist in MongoDB."""
    try:
        stats = await db.get_patient_stats()
        patients_count = stats.get("total_patients", 0)
    except Exception:
        patients_count = 0

    _log_audit(
        action="SYSTEM_STARTUP",
        details=f"FDTES API server started with {patients_count} patients loaded",
        actor="System",
        record_count=patients_count,
        cooldown=0,  # always log startup
    )

    # Also load training logs from MongoDB into memory
    global training_logs
    try:
        training_logs = await db.get_training_logs()
    except Exception:
        training_logs = []

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
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
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    disease: str
    stage: Optional[str] = None
    comorbidities: List[str] = []
    bmi: Optional[float] = None
    diagnosis_date: Optional[str] = None
    drug: str
    eligible: int = 0
    drug_worked: int = 0

class LoginRequest(BaseModel):
    username: str
    password: str

# ---------------------------------------------------------------------------
# Auth endpoint (replaces hardcoded frontend credentials)
# ---------------------------------------------------------------------------
@app.post("/auth/login")
async def login(request: LoginRequest):
    """Authenticate a hospital user against MongoDB."""
    hospital = await db.authenticate_hospital(request.username, request.password)
    if not hospital:
        _log_audit(
            action="LOGIN_FAILED",
            details=f"Failed login attempt for user '{request.username}'",
            actor=request.username,
            cooldown=2,
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    _log_audit(
        action="USER_LOGIN",
        details=f"User '{hospital['username']}' logged in from {hospital['hospital_name']}",
        actor=hospital["username"],
        cooldown=0,  # always log logins
    )

    return {
        "user": {
            "username": hospital["username"],
            "hospital_name": hospital["hospital_name"],
            "email": hospital.get("email", ""),
            "role": "admin",
        }
    }

# ---------------------------------------------------------------------------
# FL Training endpoints
# ---------------------------------------------------------------------------
@app.post("/start-fl")
async def start_federated_learning(request: TrainingRequest):
    global is_training
    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")

    is_training = True

    def run_training():
        global is_training, training_logs
        try:
            server = FederatedServer(num_rounds=request.num_rounds)
            client_threads = []
            for i in range(3):
                thread = threading.Thread(target=start_client, args=(i,))
                thread.daemon = True
                client_threads.append(thread)
                thread.start()
            time.sleep(2)
            server.start_server()
            training_logs = server.training_logs
        except Exception as e:
            print(f"Training failed: {e}")
        finally:
            is_training = False

    training_thread = threading.Thread(target=run_training)
    training_thread.daemon = True
    training_thread.start()
    return {"message": f"Federated learning started with {request.num_rounds} rounds"}

def start_client(client_id: int):
    try:
        subprocess.run([
            "python", "clients/client.py", str(client_id)
        ], cwd=os.path.dirname(os.path.dirname(__file__)))
    except Exception as e:
        print(f"Client {client_id} failed: {e}")

@app.get("/training-logs")
async def get_training_logs_endpoint():
    """Get training logs from MongoDB (falls back to in-memory)."""
    try:
        logs = await db.get_training_logs()
        if logs:
            # Normalize field names for frontend compatibility
            normalized = []
            for log in logs:
                normalized.append({
                    "round": log.get("round", log.get("round_number", 0)),
                    "accuracy": log.get("accuracy", 0),
                    "loss": log.get("loss", 0),
                    "timestamp": str(log.get("timestamp", "")),
                    "model_hash": log.get("model_hash", ""),
                })
            return normalized
    except Exception as e:
        print(f"[TRAINING] Error getting logs from MongoDB: {e}")
    return training_logs

@app.get("/model-metrics")
async def get_model_metrics():
    if not training_logs:
        return {"message": "No training data available"}

    latest_log = training_logs[-1] if training_logs else None
    blockchain_logs_list = blockchain_logger.get_logs() if blockchain_logger else []

    formatted_logs = []
    for log in blockchain_logs_list:
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

# ---------------------------------------------------------------------------
# Frontend activity logging — lightweight endpoint for UI-driven events
# ---------------------------------------------------------------------------
class ActivityLog(BaseModel):
    action: str
    details: str = ""
    actor: str = "System"

@app.post("/log-activity")
async def log_activity(entry: ActivityLog):
    """Log a frontend-initiated activity to the blockchain audit trail."""
    _log_audit(
        action=entry.action,
        details=entry.details,
        actor=entry.actor,
        cooldown=5,  # 5s throttle for frontend events
    )
    return {"ok": True}

@app.get("/health")
async def health_check():
    mongo_connected = False
    try:
        client = db.get_sync_client()
        client.admin.command("ping")
        mongo_connected = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "blockchain_connected": blockchain_logger.w3.is_connected() if blockchain_logger else False,
        "mongodb_connected": mongo_connected,
        "training_active": is_training
    }

# ---------------------------------------------------------------------------
# Blockchain audit logs — served from MongoDB (with response caching)
# ---------------------------------------------------------------------------
_blockchain_logs_cache: Dict[str, Any] = {"data": None, "ts": 0}
_BLOCKCHAIN_CACHE_TTL = 2  # seconds — avoids hitting MongoDB on every poll

@app.get("/blockchain-logs")
async def get_blockchain_logs():
    """Return audit trail — merge MongoDB and in-memory mock logger."""
    now = time.time()
    if _blockchain_logs_cache["data"] and (now - _blockchain_logs_cache["ts"]) < _BLOCKCHAIN_CACHE_TTL:
        return JSONResponse(
            content=_blockchain_logs_cache["data"],
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )

    all_logs = []

    # 1) Try MongoDB
    try:
        mongo_logs = await db.get_audit_logs(limit=500)
        all_logs.extend(mongo_logs)
    except Exception as e:
        print(f"[BLOCKCHAIN] Error getting audit logs from MongoDB: {e}")

    # 2) Also grab from in-memory mock logger (may have entries that failed MongoDB write)
    if blockchain_logger and hasattr(blockchain_logger, 'get_audit_logs'):
        try:
            mock_logs = blockchain_logger.get_audit_logs()
            existing_hashes = {l.get("txHash") for l in all_logs if l.get("txHash")}
            for log in mock_logs:
                if log.get("txHash") not in existing_hashes:
                    all_logs.append(log)
                    existing_hashes.add(log.get("txHash"))
        except Exception:
            pass

    # Sort newest first
    all_logs.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

    payload = {"logs": all_logs[:500], "total": len(all_logs)}
    _blockchain_logs_cache["data"] = payload
    _blockchain_logs_cache["ts"] = now

    return JSONResponse(
        content=payload,
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )

# ---------------------------------------------------------------------------
# Patient endpoints — powered by MongoDB
# ---------------------------------------------------------------------------
# Internal/ML fields hidden from ALL views
_INTERNAL_COLUMNS = {"eligible", "drug_worked", "drug"}

# Personal / identifying fields — shown only in the Patients tab (own hospital)
_PERSONAL_COLUMNS = [
    "patient_name", "phone", "email", "address",
    "emergency_contact", "admission_date",
]

# Columns shown in the Patients tab (own hospital) — ALL details
_PATIENT_VIEW_COLUMNS = [
    "patient_id", "patient_name", "age", "gender", "phone", "email",
    "address", "blood_group", "disease", "stage", "comorbidities",
    "bmi", "diagnosis_date", "admission_date", "emergency_contact",
    "hospital",
]

# Columns for federated / trials view — privacy-preserving (NO personal info)
_FEDERATED_COLUMNS = [
    "patient_id", "age", "gender", "blood_group", "disease",
    "stage", "comorbidities", "bmi", "diagnosis_date",
]

@app.get("/stats")
async def get_stats():
    """Fast lightweight stats from MongoDB aggregation."""
    try:
        stats = await db.get_patient_stats()
        trials = await db.get_trials_from_db()

        _log_audit(
            action="DASHBOARD_VIEWED",
            details=f"Dashboard stats accessed ({stats.get('total_patients', 0)} patients, {len(trials)} trials)",
            actor="System",
            record_count=stats.get("total_patients", 0),
        )

        return {
            "total_patients": stats.get("total_patients", 0),
            "total_trials": len(trials),
            "total_hospitals": 3,
            "unique_diseases": stats.get("unique_diseases", 0),
            "drug_trials": len(trials),
            "avg_success_rate": 65.7,
            "is_training": is_training,
            "rounds_completed": len(training_logs),
            "latest_accuracy": round(training_logs[-1]["accuracy"] * 100, 1) if training_logs else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/hospitals")
async def get_stats_hospitals():
    """Return list of hospitals with basic info."""
    try:
        hospitals = await db.get_hospitals()
        result = []
        for h in hospitals:
            patient_count = await db.count_patients()
            result.append({
                "name": h.get("hospital_name", h.get("username", "Unknown")),
                "location": h.get("location", "India"),
                "status": "Active",
            })
        return {"hospitals": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/diseases")
async def get_stats_diseases():
    """Return disease breakdown with patient counts."""
    try:
        disease_counts = await db.get_disease_counts()
        diseases = [
            {"name": name, "count": count}
            for name, count in sorted(disease_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        return {"diseases": diseases, "total": sum(d["count"] for d in diseases)}
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
    """Paginated patients from MongoDB with server-side search & sort."""
    try:
        # Log the patient view to audit trail (throttled — max once per 10s)
        if _should_log_action("PATIENTS_VIEWED"):
            try:
                total_count = await db.count_patients()
                blockchain_logger.log_event(
                    action="PATIENTS_VIEWED",
                    details=f"Patient records accessed (page {page}, {total_count} total)",
                    actor=hospital or "System",
                    record_count=total_count,
                )
            except Exception:
                pass

        result = await db.get_patients_paginated(
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Eligibility helpers
# ---------------------------------------------------------------------------
def _compute_eligibility(patient: dict, trial_params: dict) -> bool:
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


def _build_trial_params_for_disease(all_patients, disease):
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

# ---------------------------------------------------------------------------
# Trials endpoints — definitions from MongoDB
# ---------------------------------------------------------------------------
@app.get("/trials")
async def get_trials():
    """Return drug trials from MongoDB with eligibility estimates."""
    import random as _rand
    try:
        all_p = await db.get_all_patients_list()
        total_patients = len(all_p)

        disease_counts = await db.get_disease_counts()
        trial_defs = await db.get_trials_from_db()

        SAMPLE_SIZE = 2000
        sample = _rand.sample(all_p, min(SAMPLE_SIZE, total_patients)) if total_patients > SAMPLE_SIZE else all_p
        sample_len = len(sample)

        trials = []
        for idx, tdef in enumerate(trial_defs):
            disease = tdef["indication"]
            enrolled = disease_counts.get(disease, 0)

            elig_params = _build_trial_params_for_disease(all_p, disease)

            sample_eligible = sum(1 for p in sample if _compute_eligibility(p, elig_params))
            estimated_eligible = round(sample_eligible * total_patients / sample_len) if sample_len > 0 else 0

            trials.append({
                "id": idx + 1,
                "drugName": tdef["drugName"],
                "indication": disease,
                "phase": tdef.get("phase", "Phase III"),
                "status": tdef.get("status", "Active"),
                "patientsEnrolled": enrolled,
                "successRate": tdef.get("successRate", 0),
                "startDate": "2025-01-15",
                "lastUpdate": datetime.now().strftime("%Y-%m-%d"),
                "eligibilityParams": elig_params,
                "eligibleFromCurrent": estimated_eligible,
                "sourceHospitalCount": 3,
            })

        # Log trials view to blockchain audit trail (throttled)
        _log_audit(
            action="TRIALS_VIEWED",
            details=f"Clinical trials accessed ({len(trials)} trials listed)",
            actor="System",
            record_count=len(trials),
        )

        return {"trials": trials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/trials/{drug_name}/eligible")
async def get_eligible_patients_for_drug(
    drug_name: str,
    hospital: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    tab: str = "eligible",
):
    """Check patients against trial eligibility from MongoDB."""
    try:
        page_size = min(max(page_size, 10), 200)
        page = max(page, 1)

        all_p = await db.get_all_patients_list()

        # Build trial disease map from DB
        trial_defs = await db.get_trials_from_db()
        trial_disease_map = {t["drugName"]: t["indication"] for t in trial_defs}
        disease = trial_disease_map.get(drug_name, drug_name)
        trial_params = _build_trial_params_for_disease(all_p, disease)

        eligible_ids = []
        not_eligible_ids = []
        for i, patient in enumerate(all_p):
            if _compute_eligibility(patient, trial_params):
                eligible_ids.append(i)
            else:
                not_eligible_ids.append(i)

        eligible_count = len(eligible_ids)
        not_eligible_count = len(not_eligible_ids)

        # Log eligibility check (throttled per drug)
        elig_action_key = f"ELIGIBILITY_SCREEN_{drug_name}"
        if _should_log_action(elig_action_key):
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
        total_pages = max(1, -(-total_for_tab // page_size))

        cols = [c for c in _FEDERATED_COLUMNS if any(c in p for p in page_patients_raw[:5])]
        # Privacy-preserving: only medical/demographic fields, anonymize patient IDs
        page_patients = []
        for idx, p in enumerate(page_patients_raw):
            row = {k: p.get(k) for k in cols if k != "patient_id"}
            # Replace real patient_id with anonymous identifier
            row["patient_id"] = f"ANON-{start + idx + 1:05d}"
            page_patients.append(row)

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
            "privacy_mode": True,
            "privacy_notice": "Patient identities are anonymized. Only medical and demographic data is shared for trial eligibility screening.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Upload endpoints
# ---------------------------------------------------------------------------
try:
    from preprocessing import preprocess_upload, save_standard_csv, generate_federated_training_csv
    PREPROCESSING_AVAILABLE = True
except ImportError:
    PREPROCESSING_AVAILABLE = False
    print("Warning: preprocessing module not found.")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
CSV_ARCHIVE_DIR = os.path.join(UPLOAD_DIR, "csv_archive")
TRAINING_CSV_FALLBACK = os.path.join(os.path.dirname(__file__), "..", "mimic_adapted.csv")

_upload_progress: Dict[str, Dict] = {}

@app.get("/upload-progress/{upload_id}")
async def get_upload_progress(upload_id: str):
    return _upload_progress.get(upload_id, {"percent": 0, "stage": "waiting"})


@app.post("/upload")
async def upload_file(file: UploadFile = File(...), hospital: Optional[str] = None):
    """Unified upload — preprocess, store in MongoDB, regenerate training CSV."""
    if not PREPROCESSING_AVAILABLE:
        raise HTTPException(status_code=500, detail="Preprocessing module not available")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".csv", ".json", ".pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload CSV, JSON, or PDF.")

    content = await file.read()
    default_hospital = hospital or "Unknown Hospital"

    import uuid as _uuid
    upload_id = _uuid.uuid4().hex[:12]
    _upload_progress[upload_id] = {"percent": 5, "stage": "Reading file..."}

    try:
        _upload_progress[upload_id] = {"percent": 15, "stage": "Parsing file..."}
        df, json_structure = preprocess_upload(content, file.filename, default_hospital)
        _upload_progress[upload_id] = {"percent": 40, "stage": "Normalising columns..."}

        _upload_progress[upload_id] = {"percent": 50, "stage": "Saving standard CSV..."}
        csv_path = save_standard_csv(df, CSV_ARCHIVE_DIR, filename_prefix="patients")

        # Insert new patients into MongoDB
        _upload_progress[upload_id] = {"percent": 60, "stage": "Saving to MongoDB..."}
        new_patients_list = []
        for hosp, plist in json_structure["hospitals"].items():
            for p in plist:
                p.pop("hospital", None)
                p.pop("eligible", None)
                p.pop("drug", None)
                p.pop("drug_worked", None)
                new_patients_list.append(p)

        inserted_count = await db.insert_patients(new_patients_list)

        # Regenerate federated training CSV
        _upload_progress[upload_id] = {"percent": 80, "stage": "Generating training CSV..."}
        if new_patients_list:
            try:
                from preprocessing import normalise
                import pandas as _pd
                full_df = _pd.DataFrame(new_patients_list)
                if "comorbidities" not in full_df.columns:
                    full_df["comorbidities"] = [[] for _ in range(len(full_df))]
                generate_federated_training_csv(
                    normalise(full_df, default_hospital="All"),
                    TRAINING_CSV_FALLBACK,
                )
            except Exception as e:
                print(f"[PREPROCESS] CSV generation error (non-fatal): {e}")

        total_patients = await db.count_patients()
        new_patients = len(new_patients_list)
        hospitals_in_file = list(json_structure["hospitals"].keys())

        _upload_progress[upload_id] = {"percent": 90, "stage": "Logging to blockchain..."}
        if blockchain_logger:
            try:
                blockchain_logger.log_data_upload(
                    data_type=ext.replace(".", "").upper(),
                    source="File Upload",
                    record_count=new_patients,
                    hospitals=hospitals_in_file,
                )
            except Exception as e:
                print(f"Failed to log to blockchain: {e}")

        _upload_progress[upload_id] = {"percent": 100, "stage": "Complete"}

        return {
            "message": f"File processed successfully ({ext.upper().replace('.', '')} → MongoDB)",
            "file_type": ext.replace(".", ""),
            "new_patients": new_patients,
            "hospitals_in_file": hospitals_in_file,
            "total_patients": total_patients,
            "csv_archive": csv_path,
            "columns": [],
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


@app.post("/upload-json")
async def upload_json(file: UploadFile = File(...), hospital: Optional[str] = None):
    return await upload_file(file, hospital)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), hospital: Optional[str] = None):
    return await upload_file(file, hospital)

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), hospital: Optional[str] = None):
    return await upload_file(file, hospital)

# ---------------------------------------------------------------------------
# Predict endpoint
# ---------------------------------------------------------------------------
@app.post("/predict")
async def predict_eligibility(patient: PatientData):
    try:
        score = 0
        reasons = []

        if 18 <= patient.age <= 65:
            score += 30
            reasons.append("Age within optimal range")
        elif patient.age > 65:
            score += 15
            reasons.append("Age above 65, reduced eligibility")
        else:
            reasons.append("Age below 18, ineligible")

        if patient.bmi and 18.5 <= patient.bmi <= 30:
            score += 25
            reasons.append("BMI within healthy range")
        elif patient.bmi:
            score += 10
            reasons.append("BMI outside healthy range")

        if patient.stage in ["I", "II"]:
            score += 25
            reasons.append("Early stage disease, good for trial")
        elif patient.stage == "III":
            score += 15
            reasons.append("Advanced stage disease")

        if len(patient.comorbidities) <= 1:
            score += 20
            reasons.append("Few comorbidities")
        else:
            score += 5
            reasons.append("Multiple comorbidities present")

        eligible = 1 if score >= 60 else 0

        _log_audit(
            action="ELIGIBILITY_PREDICTION",
            details=f"Patient {patient.patient_id} scored {score}/100 — {'Eligible' if eligible else 'Not Eligible'} for {patient.disease}/{patient.drug}",
            actor="Prediction Engine",
            record_count=1,
            metadata={"patient_id": patient.patient_id, "score": score, "eligible": eligible},
            cooldown=2,  # predictions can be rapid
        )

        return {
            "eligible": eligible,
            "score": score,
            "reasons": reasons,
            "recommendation": "Eligible for trial" if eligible else "Not eligible for trial"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Training Management
# ---------------------------------------------------------------------------
@app.get("/training-status")
async def get_training_status():
    return {
        "is_training": is_training,
        "total_rounds": len(training_logs),
        "rounds_completed": len(training_logs),
        "latest_metrics": training_logs[-1] if training_logs else None
    }

@app.post("/start-training")
async def start_training(request: Dict[str, Any] = None):
    global is_training, training_logs

    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")

    is_training = True
    num_rounds = request.get("num_rounds", 10) if request else 10

    _log_audit(
        action="TRAINING_STARTED",
        details=f"Federated learning training started with {num_rounds} rounds",
        actor="Training Controller",
        record_count=num_rounds,
        cooldown=0,  # always log training start
    )

    def run_training_simulation():
        global is_training, training_logs
        import random

        # Clear previous training logs in MongoDB
        try:
            sync_db = db.get_sync_db()
            sync_db.training_logs.delete_many({})
        except Exception:
            pass

        try:
            training_logs = []
            for round_num in range(1, num_rounds + 1):
                accuracy = 0.65 + (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                accuracy = min(0.95, max(0.6, accuracy))

                loss = 0.5 - (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                loss = max(0.1, loss)

                model_hash = f"model_r{round_num}_h{hash(str(round_num)) % 10000}"

                log_entry = {
                    "round": round_num,
                    "accuracy": round(accuracy, 4),
                    "loss": round(loss, 4),
                    "timestamp": datetime.now().isoformat(),
                    "model_hash": model_hash,
                }
                training_logs.append(log_entry)

                # Persist training log to MongoDB (sync)
                try:
                    db.insert_training_log_sync(dict(log_entry))
                except Exception as e:
                    print(f"[TRAINING] Failed to persist round {round_num} to MongoDB: {e}")

                # Enqueue to blockchain logger
                if blockchain_logger:
                    try:
                        ok, tx = blockchain_logger.enqueue_training_metadata(
                            round_number=round_num,
                            accuracy=float(accuracy),
                            model_hash=model_hash,
                        )
                    except Exception as e:
                        print(f"[TRAINING] Failed to enqueue round {round_num}: {e}")

                time.sleep(0.5)

                if not is_training:
                    break

        except Exception as e:
            print(f"Training simulation error: {e}")
        finally:
            is_training = False

    training_thread = threading.Thread(target=run_training_simulation, daemon=True)
    training_thread.start()

    return {"message": f"Training started with {num_rounds} rounds"}

@app.post("/stop-training")
async def stop_training():
    global is_training
    is_training = False
    return {"message": "Training stopped"}

@app.post("/reset-training")
async def reset_training():
    global is_training, training_logs
    is_training = False
    training_logs = []
    try:
        await db.clear_training_logs()
    except Exception:
        pass
    return {"message": "Training state reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
