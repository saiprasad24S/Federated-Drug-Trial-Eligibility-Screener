"""
MongoDB database layer (v2) for Federated Drug Trial Eligibility Screener.

This module is intentionally isolated from `database.py` and uses a separate
MongoDB database so v1 and v2 can run side-by-side.

Database:
  - federated_screener_v2

Collections:
  - patients
  - hospitals
  - trials
  - audit_logs
  - training_logs
  - trial_patient_mapping (optional cache of computed eligibility)
"""

import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import certifi
import dotenv
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient, ASCENDING, DESCENDING

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
dotenv.load_dotenv()
MONGO_URI = (os.getenv("MONGO_URI") or "").strip()
MONGO_DB_NAME_V2 = "federated_screener_v2"
DB_NAME = (os.getenv("MONGO_DB_NAME_V2") or MONGO_DB_NAME_V2).strip()

logger = logging.getLogger("database_v2")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[DATABASE_V2] %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Singleton clients
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
# Index creation and initialization
# ---------------------------------------------------------------------------
def ensure_indexes_v2() -> None:
    """Create indexes for v2 collections."""
    db = get_sync_db()
    try:
        db.patients.create_index([("patient_id", ASCENDING)], unique=False)
        db.patients.create_index([("disease", ASCENDING)])
        db.patients.create_index([("age", ASCENDING)])
        db.patients.create_index([("gender", ASCENDING)])
        db.patients.create_index([("hospital_name", ASCENDING)])
        db.patients.create_index(
            [("hospital_name", ASCENDING), ("patient_id", ASCENDING)],
            name="hospital_patient_lookup",
        )

        db.hospitals.create_index([("username", ASCENDING)], unique=True)

        db.trials.create_index([("trial_id", ASCENDING)], unique=True)
        db.trials.create_index([("drugName", ASCENDING)], unique=True)
        db.trials.create_index([("indication", ASCENDING)])
        db.trials.create_index([("disease", ASCENDING)])
        db.trials.create_index([("createdAt", DESCENDING)])

        db.audit_logs.create_index([("timestamp", DESCENDING)])
        db.audit_logs.create_index([("action", ASCENDING)])

        db.training_logs.create_index([("round", ASCENDING)])

        db.trial_patient_mapping.create_index(
            [("trial_id", ASCENDING), ("patient_id", ASCENDING)], unique=True
        )
        db.trial_patient_mapping.create_index([("evaluated_at", DESCENDING)])

        logger.info("MongoDB v2 indexes ensured")
    except Exception as exc:
        logger.warning(f"Index creation issue in v2 (non-fatal): {exc}")


def init_database_v2() -> None:
    """Initialize v2 database connection and indexes."""
    client = get_sync_client()
    client.admin.command("ping")
    logger.info(f"Connected to MongoDB for v2: {MONGO_URI[:40]}...")
    ensure_indexes_v2()


# ---------------------------------------------------------------------------
# Shared projections for eligibility computations
# ---------------------------------------------------------------------------
_ELIGIBILITY_PROJECTION = {
    "_id": 0,
    "patient_id": 1,
    "age": 1,
    "gender": 1,
    "blood_group": 1,
    "disease": 1,
    "stage": 1,
    "comorbidities": 1,
    "bmi": 1,
    "diagnosis_date": 1,
    "hospital_name": 1,
}

# Same projection but keeping _id so we can produce unique _oid strings
_ELIGIBILITY_PROJECTION_WITH_OID = {
    "_id": 1,
    "patient_id": 1,
    "age": 1,
    "gender": 1,
    "blood_group": 1,
    "disease": 1,
    "stage": 1,
    "comorbidities": 1,
    "bmi": 1,
    "diagnosis_date": 1,
    "hospital_name": 1,
}


def _add_oid(doc: dict) -> dict:
    """Convert MongoDB _id to string _oid and remove _id."""
    if "_id" in doc:
        doc["_oid"] = str(doc.pop("_id"))
    return doc


def _to_object_ids(oid_strings: List[str]) -> List[ObjectId]:
    """Convert string OIDs to BSON ObjectIds, skipping invalid ones."""
    result = []
    for s in oid_strings:
        try:
            result.append(ObjectId(s))
        except Exception:
            pass
    return result


# ---------------------------------------------------------------------------
# Smart disease matching
# ---------------------------------------------------------------------------
import re as _re


def _disease_filter(disease: str) -> dict:
    """Build a MongoDB filter that does smart disease matching.

    Rules:
      - Trial disease 'Cancer'      → matches any disease *containing* 'Cancer'
        e.g. 'Breast Cancer', 'Lung Cancer', 'Colon Cancer'
      - Trial disease 'Breast Cancer' → matches ONLY 'Breast Cancer'
        because 'Lung Cancer' does NOT contain 'Breast Cancer'
      - Trial disease 'Diabetes'    → matches 'Diabetes' AND 'Type 2 Diabetes'
      - Trial disease 'Arthritis'   → matches 'Rheumatoid Arthritis'

    Implementation: case-insensitive regex substring search.
    """
    if not disease:
        return {}
    escaped = _re.escape(disease.strip())
    return {"disease": {"$regex": escaped, "$options": "i"}}


def _disease_matches_python(patient_disease: str, trial_disease: str) -> bool:
    """Python-side equivalent of _disease_filter for in-memory checks."""
    if not trial_disease:
        return True
    return trial_disease.strip().lower() in (patient_disease or "").lower()


# ---------------------------------------------------------------------------
# v2 disease-scoped patient queries
# ---------------------------------------------------------------------------
async def get_patients_by_disease(disease: str) -> List[dict]:
    """Return patients for a specific disease with eligibility-only fields."""
    db = get_async_db()
    cursor = db.patients.find(_disease_filter(disease), _ELIGIBILITY_PROJECTION)
    return await cursor.to_list(length=None)


async def get_patient_sample_by_disease(disease: str, size: int = 2000) -> List[dict]:
    """Return a random sample of patients for one disease using aggregation."""
    db = get_async_db()
    safe_size = max(1, int(size))
    pipeline = [
        {"$match": _disease_filter(disease)},
        {"$sample": {"size": safe_size}},
        {"$project": _ELIGIBILITY_PROJECTION},
    ]
    return [doc async for doc in db.patients.aggregate(pipeline)]


async def count_patients_by_disease(disease: str) -> int:
    """Count patients that match a specific disease (smart substring match)."""
    db = get_async_db()
    return await db.patients.count_documents(_disease_filter(disease))


async def get_patients_by_ids(oid_strings: List[str]) -> List[dict]:
    """Return patients by _id (ObjectId strings) for trial enrollment flow.

    Each enrolled_patient_ids entry is now a string representation of the
    MongoDB ObjectId, guaranteeing uniqueness across the entire collection.
    """
    if not oid_strings:
        return []
    db = get_async_db()
    object_ids = _to_object_ids(oid_strings)
    if not object_ids:
        return []
    cursor = db.patients.find({"_id": {"$in": object_ids}}, _ELIGIBILITY_PROJECTION_WITH_OID)
    docs = await cursor.to_list(length=None)
    return [_add_oid(d) for d in docs]


async def get_disease_counts() -> Dict[str, int]:
    """Aggregate patient counts by disease."""
    db = get_async_db()
    pipeline = [{"$group": {"_id": "$disease", "count": {"$sum": 1}}}]
    result: Dict[str, int] = {}
    async for doc in db.patients.aggregate(pipeline):
        if doc.get("_id"):
            result[doc["_id"]] = int(doc.get("count", 0))
    return result


# ---------------------------------------------------------------------------
# v2 trials helpers
# ---------------------------------------------------------------------------
async def get_trials_from_db() -> List[dict]:
    """Return all v2 trial definitions."""
    db = get_async_db()
    cursor = db.trials.find({}, {"_id": 0}).sort("createdAt", DESCENDING)
    return await cursor.to_list(length=None)


async def get_trial_by_drug_name(drug_name: str) -> Optional[dict]:
    """Fetch one trial by drug name."""
    db = get_async_db()
    return await db.trials.find_one({"drugName": drug_name}, {"_id": 0})


async def create_trial(trial: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a v2 trial document with disease-specific schema."""
    db = get_async_db()
    existing = await db.trials.find_one({"drugName": trial["drugName"]})
    if existing:
        raise ValueError(f"Trial with drug name '{trial['drugName']}' already exists")

    doc = dict(trial)
    if "createdAt" not in doc:
        doc["createdAt"] = datetime.now(timezone.utc)
    if "enrolled_patient_ids" not in doc:
        doc["enrolled_patient_ids"] = []

    await db.trials.insert_one(doc)

    # Normalize datetime to ISO string for API responses
    out = dict(doc)
    created_at = out.get("createdAt")
    if isinstance(created_at, datetime):
        out["createdAt"] = created_at.isoformat()
    out.pop("_id", None)
    return out


# ---------------------------------------------------------------------------
# Optional mapping cache: trial -> patient eligibility
# ---------------------------------------------------------------------------
async def upsert_trial_patient_mappings(
    trial_id: str,
    rows: List[Dict[str, Any]],
) -> int:
    """Store eligibility results in trial_patient_mapping collection.

    Expected row shape:
      {
        "patient_id": str,
        "eligibility_status": bool,
        "evaluated_at": datetime/iso-string (optional)
      }
    """
    if not rows:
        return 0

    db = get_async_db()
    written = 0
    for row in rows:
        patient_id = row.get("patient_id")
        if not patient_id:
            continue
        evaluated_at = row.get("evaluated_at") or datetime.now(timezone.utc)
        await db.trial_patient_mapping.update_one(
            {"trial_id": trial_id, "patient_id": patient_id},
            {
                "$set": {
                    "eligibility_status": bool(row.get("eligibility_status", False)),
                    "evaluated_at": evaluated_at,
                },
                "$setOnInsert": {
                    "trial_id": trial_id,
                    "patient_id": patient_id,
                },
            },
            upsert=True,
        )
        written += 1
    return written


async def add_patients_to_trial(drug_name: str, oid_strings: List[str]) -> dict:
    """Add patient OID strings to a trial's enrollment list using set semantics."""
    db = get_async_db()
    # Validate that these are real ObjectId strings and deduplicate
    valid_ids = sorted({s for s in oid_strings if s and ObjectId.is_valid(s)})
    if not valid_ids:
        return {"matched": 0, "modified": 0}

    result = await db.trials.update_one(
        {"drugName": drug_name},
        {"$addToSet": {"enrolled_patient_ids": {"$each": valid_ids}}},
    )
    return {"matched": result.matched_count, "modified": result.modified_count}


async def remove_patients_from_trial(drug_name: str, oid_strings: List[str]) -> dict:
    """Remove patient OID strings from a trial enrollment list."""
    db = get_async_db()
    valid_ids = sorted({s for s in oid_strings if s and ObjectId.is_valid(s)})
    if not valid_ids:
        return {"matched": 0, "modified": 0}

    result = await db.trials.update_one(
        {"drugName": drug_name},
        {"$pull": {"enrolled_patient_ids": {"$in": valid_ids}}},
    )
    return {"matched": result.matched_count, "modified": result.modified_count}


async def auto_enroll_patients_by_disease(drug_name: str, disease: str) -> dict:
    """Automatically enroll all patients with matching disease into a trial.

    Uses smart disease matching:
      trial disease 'Cancer' → all *Cancer patients
      trial disease 'Breast Cancer' → only 'Breast Cancer' patients

    Stores ObjectId strings (not patient_id) for uniqueness.
    """
    db = get_async_db()

    # Find _id of all patients with smart disease matching
    cursor = db.patients.find(_disease_filter(disease), {"_id": 1})
    oid_strings = [str(doc["_id"]) async for doc in cursor]

    if not oid_strings:
        return {"matched": 0, "modified": 0, "enrolled_count": 0}

    # Add all matching patients to trial enrollment
    result = await db.trials.update_one(
        {"drugName": drug_name},
        {"$addToSet": {"enrolled_patient_ids": {"$each": oid_strings}}},
    )

    # Get final enrollment count
    trial = await db.trials.find_one({"drugName": drug_name}, {"enrolled_patient_ids": 1})
    enrolled_count = len(trial.get("enrolled_patient_ids", [])) if trial else 0

    return {
        "matched": result.matched_count,
        "modified": result.modified_count,
        "enrolled_count": enrolled_count,
        "patients_found": len(oid_strings),
    }


async def get_available_patients_for_trial(
    drug_name: str,
    hospital: Optional[str] = None,
    disease: Optional[str] = None,
) -> List[dict]:
    """
    Get patients that are NOT enrolled in the specified trial.
    
    Optionally filter by hospital and/or disease.
    Returns full patient details for UI display.
    """
    db = get_async_db()
    
    # Get trial to check enrolled patients and disease
    trial = await db.trials.find_one({"drugName": drug_name})
    if not trial:
        return []
    
    enrolled_ids = trial.get("enrolled_patient_ids", [])

    # Convert stored OID strings to ObjectIds for exclusion
    enrolled_oids = _to_object_ids(enrolled_ids)

    # Build query filter — show ALL patients (no disease filter)
    query_filter: dict = {}
    if hospital:
        query_filter["hospital_name"] = hospital
    if enrolled_oids:
        query_filter["_id"] = {"$nin": enrolled_oids}

    # Fetch patients not enrolled in this trial
    projection = {
        "_id": 1,
        "patient_id": 1,
        "patient_name": 1,
        "age": 1,
        "gender": 1,
        "blood_group": 1,
        "disease": 1,
        "stage": 1,
        "hospital_name": 1,
        "bmi": 1,
        "comorbidities": 1,
    }

    cursor = db.patients.find(query_filter, projection).sort("patient_id", 1)
    docs = await cursor.to_list(length=None)
    return [_add_oid(d) for d in docs]
