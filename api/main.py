from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import threading
import time
from typing import List, Dict, Any, Optional
import sys
import os
import json
from datetime import datetime

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
# Server-side result caches (avoids reloading all patients on every request)
# ---------------------------------------------------------------------------
_trials_cache: Dict[str, Any] = {"data": None, "ts": 0}
_TRIALS_CACHE_TTL = 15  # seconds
_eligibility_cache: Dict[str, Any] = {}  # key = drug_name -> {data, ts}
_ELIGIBILITY_CACHE_TTL = 10  # seconds

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
# Training endpoints
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Frontend activity logging — lightweight endpoint for UI-driven events
# ---------------------------------------------------------------------------
class ActivityLog(BaseModel):
    action: str
    details: str = ""
    actor: str = "System"
    record_count: int = 0

@app.post("/log-activity")
async def log_activity(entry: ActivityLog):
    """Log a frontend-initiated activity to the blockchain audit trail."""
    _log_audit(
        action=entry.action,
        details=entry.details,
        actor=entry.actor,
        record_count=entry.record_count,
        cooldown=5,  # 5s throttle for frontend events
    )
    return {"ok": True}

@app.get("/health")
async def health_check():
    mongo_connected = False
    try:
        await db.get_async_db().command("ping")
        mongo_connected = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "blockchain_connected": False,
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
_INTERNAL_COLUMNS = {"eligible", "drug_worked", "drug", "hospital_name"}

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
]

# Columns for federated / trials view — privacy-preserving (NO personal info)
_FEDERATED_COLUMNS = [
    "patient_id", "age", "gender", "blood_group", "disease",
    "stage", "comorbidities", "bmi", "diagnosis_date",
]

@app.get("/stats")
async def get_stats(hospital: Optional[str] = None):
    """Fast lightweight stats from MongoDB aggregation.

    If *hospital* is provided, patient counts are scoped to that hospital.
    Global (federated) totals are always included for context.
    """
    try:
        stats = await db.get_patient_stats(hospital_name=hospital)
        trials = await db.get_trials_from_db()
        hospital_counts = await db.get_hospital_patient_counts()

        _log_audit(
            action="DASHBOARD_VIEWED",
            details=f"Dashboard stats accessed by {hospital or 'System'} ({stats.get('total_patients', 0)} own patients, {stats.get('global_total_patients', 0)} global)",
            actor=hospital or "System",
            record_count=stats.get("total_patients", 0),
        )

        return {
            "total_patients": stats.get("total_patients", 0),
            "global_total_patients": stats.get("global_total_patients", 0),
            "total_trials": len(trials),
            "total_hospitals": len(hospital_counts) or 3,
            "unique_diseases": stats.get("unique_diseases", 0),
            "drug_trials": len(trials),
            "avg_success_rate": 65.7,
            "is_training": is_training,
            "rounds_completed": len(training_logs),
            "latest_accuracy": round(training_logs[-1]["accuracy"] * 100, 1) if training_logs else None,
            "hospital_patient_counts": hospital_counts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/hospitals")
async def get_stats_hospitals():
    """Return list of hospitals with patient counts."""
    try:
        hospitals = await db.get_hospitals()
        hospital_counts = await db.get_hospital_patient_counts()
        result = []
        for h in hospitals:
            hname = h.get("hospital_name", h.get("username", "Unknown"))
            result.append({
                "name": hname,
                "location": h.get("location", "India"),
                "status": "Active",
                "patient_count": hospital_counts.get(hname, 0),
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
    """Paginated patients from MongoDB — scoped to the requesting hospital.

    Only patients whose *hospital_name* matches the supplied *hospital*
    parameter are returned, ensuring each hospital sees only its own data.
    """
    try:
        # Log the patient view to audit trail (throttled — max once per 10s)
        if _should_log_action("PATIENTS_VIEWED"):
            try:
                if hospital:
                    hosp_count = await db.count_patients_for_hospital(hospital)
                else:
                    hosp_count = await db.count_patients()
                blockchain_logger.log_event(
                    action="PATIENTS_VIEWED",
                    details=f"Patient records accessed by {hospital or 'System'} — {hosp_count} hospital records (page {page})",
                    actor=hospital or "System",
                    record_count=hosp_count,
                )
            except Exception:
                pass

        result = await db.get_patients_paginated(
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
            hospital_name=hospital,   # <-- scope to this hospital
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
def _invalidate_trials_cache():
    """Call after data changes (upload) to force re-computation."""
    _trials_cache["data"] = None
    _trials_cache["ts"] = 0
    _eligibility_cache.clear()

# Trials endpoints — definitions from MongoDB
# ---------------------------------------------------------------------------
@app.get("/trials")
async def get_trials():
    """Return drug trials from MongoDB with eligibility estimates (cached)."""
    import random as _rand

    now = time.time()
    if _trials_cache["data"] and (now - _trials_cache["ts"]) < _TRIALS_CACHE_TTL:
        return _trials_cache["data"]

    try:
        total_patients = await db.count_patients()
        disease_counts = await db.get_disease_counts()
        trial_defs = await db.get_trials_from_db()

        # Use a small sample for estimated eligibility (avoids loading ALL patients)
        SAMPLE_SIZE = 2000
        sample = await db.get_patient_sample(SAMPLE_SIZE)
        sample_len = len(sample)

        trials = []
        for idx, tdef in enumerate(trial_defs):
            disease = tdef["indication"]
            enrolled = disease_counts.get(disease, 0)

            elig_params = _build_trial_params_for_disease(sample, disease)

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

        result = {"trials": trials}
        _trials_cache["data"] = result
        _trials_cache["ts"] = now
        return result
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

        # Only fetch the fields needed for eligibility computation
        all_p = await db.get_all_patients_for_eligibility()

        # Build trial disease map from DB
        trial_defs = await db.get_trials_from_db()
        trial_disease_map = {t["drugName"]: t["indication"] for t in trial_defs}
        disease = trial_disease_map.get(drug_name, drug_name)
        trial_params = _build_trial_params_for_disease(all_p, disease)

        eligible_ids = []
        not_eligible_ids = []
        # Also track hospital-specific eligibility
        hospital_eligible_count = 0
        hospital_not_eligible_count = 0
        hospital_total = 0
        for i, patient in enumerate(all_p):
            is_elig = _compute_eligibility(patient, trial_params)
            if is_elig:
                eligible_ids.append(i)
            else:
                not_eligible_ids.append(i)
            # Count hospital-specific numbers
            if hospital and patient.get("hospital_name") == hospital:
                hospital_total += 1
                if is_elig:
                    hospital_eligible_count += 1
                else:
                    hospital_not_eligible_count += 1

        eligible_count = len(eligible_ids)
        not_eligible_count = len(not_eligible_ids)

        # Log eligibility check (throttled per drug)
        elig_action_key = f"ELIGIBILITY_SCREEN_{drug_name}"
        if _should_log_action(elig_action_key):
            try:
                hosp_detail = f" | {hospital}: {hospital_eligible_count} eligible out of {hospital_total}" if hospital else ""
                blockchain_logger.log_event(
                    action="ELIGIBILITY_SCREEN",
                    details=f"{drug_name}: {eligible_count} eligible, {not_eligible_count} not eligible out of {len(all_p)} patients (federated){hosp_detail}",
                    actor=hospital or "System",
                    record_count=eligible_count + not_eligible_count,
                    metadata={"drug": drug_name, "eligible": eligible_count, "not_eligible": not_eligible_count,
                              "hospital_eligible": hospital_eligible_count, "hospital_not_eligible": hospital_not_eligible_count,
                              "hospital_total": hospital_total},
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
            "hospital_eligible_count": hospital_eligible_count,
            "hospital_not_eligible_count": hospital_not_eligible_count,
            "hospital_total": hospital_total,
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

        inserted_count = await db.insert_patients(new_patients_list, hospital_name=default_hospital)

        # Invalidate server-side caches so new data is reflected
        _invalidate_trials_cache()

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
