"""
MongoDB database layer for Federated Drug Trial Eligibility Screener.

Collections:
  - patients        : patient medical records
  - audit_logs      : blockchain audit trail entries
  - training_logs   : federated learning training round logs
  - hospitals       : hospital login credentials
  - trials          : drug trial definitions

Uses Motor (async MongoDB driver) for FastAPI compatibility and
PyMongo (sync) for startup seeding and blockchain logger.
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import dotenv
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import BulkWriteError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
dotenv.load_dotenv()  # Load from .env if available
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME")

logger = logging.getLogger("database")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[DATABASE] %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Singleton clients (created once at module import)
# ---------------------------------------------------------------------------
_async_client: Optional[AsyncIOMotorClient] = None
_sync_client: Optional[MongoClient] = None


def get_async_client() -> AsyncIOMotorClient:
    global _async_client
    if _async_client is None:
        _async_client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
    return _async_client


def get_sync_client() -> MongoClient:
    global _sync_client
    if _sync_client is None:
        _sync_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    return _sync_client


def get_async_db():
    return get_async_client()[DB_NAME]


def get_sync_db():
    return get_sync_client()[DB_NAME]


# ---------------------------------------------------------------------------
# Index creation (called once at startup)
# ---------------------------------------------------------------------------
def ensure_indexes():
    """Create indexes for fast queries."""
    db = get_sync_db()
    try:
        db.patients.create_index([("patient_id", ASCENDING)], unique=False)
        db.patients.create_index([("disease", ASCENDING)])
        db.patients.create_index([("age", ASCENDING)])
        db.patients.create_index([("gender", ASCENDING)])
        db.patients.create_index([
            ("patient_id", ASCENDING),
            ("patient_name", ASCENDING),
            ("disease", ASCENDING),
        ], name="text_search_fields")

        db.audit_logs.create_index([("timestamp", DESCENDING)])
        db.audit_logs.create_index([("action", ASCENDING)])

        db.training_logs.create_index([("round", ASCENDING)])

        db.hospitals.create_index([("username", ASCENDING)], unique=True)

        db.trials.create_index([("drugName", ASCENDING)], unique=True)

        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning(f"Index creation issue (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Seed helpers — migrate existing JSON data to MongoDB (runs once)
# ---------------------------------------------------------------------------

# Default hospital credentials
DEFAULT_HOSPITALS = [
    {
        "username": "SaiPrasad24S",
        "password": "2724",
        "hospital_name": "Sai Prasad Medical Center",
        "email": "admin@saiprasad.com",
    },
    {
        "username": "apollo",
        "password": "apollo@123",
        "hospital_name": "Apollo Hospitals",
        "email": "admin@apollo.com",
    },
    {
        "username": "fortis",
        "password": "fortis@123",
        "hospital_name": "Fortis Healthcare",
        "email": "admin@fortis.com",
    },
    {
        "username": "max",
        "password": "max@123",
        "hospital_name": "Max Super Specialty Hospital",
        "email": "admin@maxhealthcare.com",
    },
]

# Default trial definitions
DEFAULT_TRIALS = [
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


def seed_hospitals():
    """Insert default hospital credentials if collection is empty."""
    db = get_sync_db()
    if db.hospitals.count_documents({}) == 0:
        for h in DEFAULT_HOSPITALS:
            try:
                db.hospitals.update_one(
                    {"username": h["username"]},
                    {"$set": h},
                    upsert=True,
                )
            except Exception:
                pass
        logger.info(f"Seeded {len(DEFAULT_HOSPITALS)} hospital credentials")
    else:
        logger.info(f"Hospitals collection already has {db.hospitals.count_documents({})} records")


def seed_trials():
    """Insert default trial definitions if collection is empty."""
    db = get_sync_db()
    if db.trials.count_documents({}) == 0:
        for t in DEFAULT_TRIALS:
            try:
                db.trials.update_one(
                    {"drugName": t["drugName"]},
                    {"$set": t},
                    upsert=True,
                )
            except Exception:
                pass
        logger.info(f"Seeded {len(DEFAULT_TRIALS)} trial definitions")
    else:
        logger.info(f"Trials collection already has {db.trials.count_documents({})} records")


def seed_patients_from_json(json_path: str, batch_size: int = 5000):
    """Load patients from medical_data.json into MongoDB if collection is empty."""
    db = get_sync_db()
    existing = db.patients.count_documents({})
    if existing > 0:
        logger.info(f"Patients collection already has {existing} records — skipping JSON seed")
        return existing

    if not os.path.exists(json_path):
        logger.warning(f"JSON file not found: {json_path}")
        return 0

    logger.info(f"Loading patients from {json_path} ...")
    with open(json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    patients = []
    if "patients" in raw and isinstance(raw["patients"], list):
        patients = raw["patients"]
    elif "hospitals" in raw:
        for hosp, plist in raw["hospitals"].items():
            patients.extend(plist)

    if not patients:
        logger.warning("No patients found in JSON file")
        return 0

    # Bulk insert in batches
    total_inserted = 0
    for i in range(0, len(patients), batch_size):
        batch = patients[i : i + batch_size]
        # Remove _id if present to avoid conflicts
        for p in batch:
            p.pop("_id", None)
        try:
            result = db.patients.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
        except BulkWriteError as bwe:
            total_inserted += bwe.details.get("nInserted", 0)
        except Exception as e:
            err_msg = str(e)
            if "space quota" in err_msg or "AtlasError" in err_msg:
                logger.warning(f"Atlas storage quota reached after {total_inserted} patients — stopping seed")
                break
            raise
        if (i // batch_size) % 10 == 0:
            logger.info(f"  ... inserted {total_inserted}/{len(patients)} patients")

    logger.info(f"Seeded {total_inserted} patients into MongoDB")
    return total_inserted


def seed_audit_logs_from_json(json_path: str):
    """Migrate existing audit_logs.json into MongoDB."""
    db = get_sync_db()
    if db.audit_logs.count_documents({}) > 0:
        logger.info(f"Audit logs collection already has {db.audit_logs.count_documents({})} records — skipping")
        return

    if not os.path.exists(json_path):
        return

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        logs = data.get("audit_logs", [])
        if logs:
            for log in logs:
                log.pop("_id", None)
            db.audit_logs.insert_many(logs, ordered=False)
            logger.info(f"Migrated {len(logs)} audit logs from JSON to MongoDB")
    except Exception as e:
        logger.warning(f"Failed to migrate audit logs: {e}")


# ---------------------------------------------------------------------------
# Full seed/init (called once at server startup)
# ---------------------------------------------------------------------------
def init_database():
    """Initialize MongoDB: connect, create indexes, seed hospital & trial config.

    Patient data and audit logs are managed exclusively through MongoDB —
    no local JSON files are read or written.
    """
    try:
        # Quick connection test
        client = get_sync_client()
        client.admin.command("ping")
        logger.info(f"Connected to MongoDB: {MONGO_URI[:40]}...")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

    ensure_indexes()
    seed_hospitals()
    seed_trials()

    # Report current collection sizes
    db = get_sync_db()
    logger.info(
        f"Collections — patients: {db.patients.estimated_document_count()}, "
        f"audit_logs: {db.audit_logs.estimated_document_count()}, "
        f"training_logs: {db.training_logs.estimated_document_count()}"
    )
    logger.info("Database initialization complete")


# ---------------------------------------------------------------------------
# Async helpers used by FastAPI endpoints
# ---------------------------------------------------------------------------

async def count_patients(filter_query: dict = None) -> int:
    db = get_async_db()
    return await db.patients.count_documents(filter_query or {})


async def get_patients_paginated(
    page: int = 1,
    page_size: int = 50,
    search: str = None,
    sort_by: str = None,
    sort_dir: str = "asc",
) -> Dict[str, Any]:
    """Return paginated patients with server-side search & sort."""
    db = get_async_db()

    query = {}
    if search:
        # Text search across key fields
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"patient_id": regex},
            {"patient_name": regex},
            {"disease": regex},
            {"gender": regex},
            {"blood_group": regex},
            {"stage": regex},
            {"phone": regex},
            {"email": regex},
            {"address": regex},
        ]

    total = await db.patients.count_documents(query)

    # Sort
    sort_spec = None
    if sort_by:
        direction = DESCENDING if sort_dir == "desc" else ASCENDING
        sort_spec = [(sort_by, direction)]

    # Pagination
    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    skip = (page - 1) * page_size
    total_pages = max(1, -(-total // page_size))

    cursor = db.patients.find(query, {"_id": 0})
    if sort_spec:
        cursor = cursor.sort(sort_spec)
    cursor = cursor.skip(skip).limit(page_size)

    patients = await cursor.to_list(length=page_size)

    # Detect columns from first batch — enforce preferred order
    columns = []
    hidden = {"eligible", "drug_worked", "drug"}
    # Preferred column order: personal details first, then medical
    PREFERRED_ORDER = [
        "patient_id", "patient_name", "age", "gender", "phone", "email",
        "address", "blood_group", "disease", "stage", "comorbidities",
        "bmi", "diagnosis_date", "admission_date", "emergency_contact",
        "hospital",
    ]
    if patients:
        all_keys = set()
        for p in patients[:20]:
            all_keys.update(k for k in p.keys() if k not in hidden)
        # Add columns in preferred order first, then any remaining
        for col in PREFERRED_ORDER:
            if col in all_keys:
                columns.append(col)
                all_keys.discard(col)
        # Append any extra columns not in the preferred list
        columns.extend(sorted(all_keys))

    return {
        "patients": patients,
        "columns": columns,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def get_all_patients_list() -> List[dict]:
    """Return ALL patients as a list (for trial eligibility computation)."""
    db = get_async_db()
    cursor = db.patients.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


async def get_disease_counts() -> Dict[str, int]:
    """Aggregate patient counts by disease."""
    db = get_async_db()
    pipeline = [
        {"$group": {"_id": "$disease", "count": {"$sum": 1}}},
    ]
    result = {}
    async for doc in db.patients.aggregate(pipeline):
        if doc["_id"]:
            result[doc["_id"]] = doc["count"]
    return result


async def get_patients_for_disease(disease: str) -> List[dict]:
    """Return patients with a specific disease."""
    db = get_async_db()
    cursor = db.patients.find({"disease": disease}, {"_id": 0})
    return await cursor.to_list(length=None)


async def insert_patients(patients: List[dict]) -> int:
    """Insert new patient records. Returns count inserted."""
    if not patients:
        return 0
    db = get_async_db()
    for p in patients:
        p.pop("_id", None)
    result = await db.patients.insert_many(patients, ordered=False)
    return len(result.inserted_ids)


async def get_patient_stats() -> Dict[str, Any]:
    """Get fast aggregate stats."""
    db = get_async_db()
    total = await db.patients.count_documents({})
    pipeline = [
        {"$group": {"_id": "$disease"}},
        {"$count": "unique_diseases"},
    ]
    disease_count = 0
    async for doc in db.patients.aggregate(pipeline):
        disease_count = doc.get("unique_diseases", 0)
    return {
        "total_patients": total,
        "unique_diseases": disease_count,
    }


# ---------------------------------------------------------------------------
# Audit log helpers
# ---------------------------------------------------------------------------

async def insert_audit_log(entry: dict):
    """Insert a single audit log entry."""
    db = get_async_db()
    entry.pop("_id", None)
    await db.audit_logs.insert_one(entry)


def insert_audit_log_sync(entry: dict):
    """Insert a single audit log entry (synchronous — for blockchain logger)."""
    db = get_sync_db()
    entry_copy = dict(entry)
    entry_copy.pop("_id", None)
    db.audit_logs.insert_one(entry_copy)


async def get_audit_logs(limit: int = 500) -> List[dict]:
    """Return audit logs, newest first."""
    db = get_async_db()
    cursor = db.audit_logs.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(limit)
    return await cursor.to_list(length=limit)


async def get_audit_log_count() -> int:
    db = get_async_db()
    return await db.audit_logs.count_documents({})


# ---------------------------------------------------------------------------
# Training log helpers
# ---------------------------------------------------------------------------

async def insert_training_log(entry: dict):
    """Insert a training round log."""
    db = get_async_db()
    entry.pop("_id", None)
    await db.training_logs.insert_one(entry)


def insert_training_log_sync(entry: dict):
    """Insert a training round log (synchronous)."""
    db = get_sync_db()
    entry_copy = dict(entry)
    entry_copy.pop("_id", None)
    db.training_logs.insert_one(entry_copy)


async def get_training_logs() -> List[dict]:
    """Return all training logs ordered by round."""
    db = get_async_db()
    cursor = db.training_logs.find({}, {"_id": 0}).sort("round", ASCENDING)
    return await cursor.to_list(length=None)


async def clear_training_logs():
    """Clear all training logs."""
    db = get_async_db()
    await db.training_logs.delete_many({})


# ---------------------------------------------------------------------------
# Hospital/auth helpers
# ---------------------------------------------------------------------------

async def get_hospitals() -> List[dict]:
    """Return all hospital credentials."""
    db = get_async_db()
    cursor = db.hospitals.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


async def authenticate_hospital(username: str, password: str) -> Optional[dict]:
    """Authenticate a hospital user. Returns user dict or None."""
    db = get_async_db()
    hospital = await db.hospitals.find_one(
        {"username": username, "password": password},
        {"_id": 0},
    )
    return hospital


# ---------------------------------------------------------------------------
# Trial helpers
# ---------------------------------------------------------------------------

async def get_trials_from_db() -> List[dict]:
    """Return all trial definitions."""
    db = get_async_db()
    cursor = db.trials.find({}, {"_id": 0})
    return await cursor.to_list(length=None)
