"""
V2 trials API.

Architecture notes:
- Uses `database_v2.py` only (Mongo DB: federated_screener_v2)
- Never scans all patients for eligibility
- Every eligibility computation is disease-scoped:
    trial.disease -> patients where patients.disease == trial.disease
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

import database_v2 as db_v2
from database_v2 import _disease_matches_python
from models.trial_model_v2 import CreateTrialRequestV2, AddPatientsRequestV2


def _get_audit_logger():
    """Lazily fetch the blockchain audit helper from main to avoid circular imports."""
    try:
        from api.main import _log_audit, blockchain_logger
        return _log_audit
    except Exception:
        return None

router = APIRouter(tags=["Trials V2"])

_FEDERATED_COLUMNS = [
    "patient_id", "age", "gender", "blood_group", "disease",
    "stage", "comorbidities", "bmi", "diagnosis_date",
]


# Initialize v2 database on module import so router is self-contained
try:
    db_v2.init_database_v2()
except Exception as exc:
    print(f"[DATABASE_V2] initialization warning: {exc}")


def _compute_eligibility(patient: dict, criteria: Dict[str, Any]) -> bool:
    """Evaluate one patient against trial eligibility criteria."""
    age = patient.get("age")
    if age is not None and criteria.get("ageRange"):
        lo, hi = criteria["ageRange"]
        if not (lo <= age <= hi):
            return False

    gender = patient.get("gender", "")
    allowed_genders = criteria.get("genders", [])
    if allowed_genders and gender and gender not in allowed_genders:
        return False

    blood_group = patient.get("blood_group", "")
    allowed_bg = criteria.get("bloodGroups", [])
    if allowed_bg and blood_group and blood_group not in allowed_bg:
        return False

    bmi = patient.get("bmi")
    if bmi is not None and criteria.get("bmiRange"):
        lo, hi = criteria["bmiRange"]
        if not (lo <= bmi <= hi):
            return False

    stage = patient.get("stage", "")
    allowed_stages = criteria.get("stages", [])
    if allowed_stages and stage and stage not in allowed_stages:
        return False

    return True


def _build_criteria_from_patients(patients: List[dict]) -> Dict[str, Any]:
    """Build default criteria from a disease-scoped patient set."""
    ages, bmis = [], []
    genders, blood_groups, stages = set(), set(), set()

    for patient in patients:
        age = patient.get("age")
        if age is not None:
            ages.append(age)

        gender = patient.get("gender")
        if gender:
            genders.add(gender)

        blood_group = patient.get("blood_group")
        if blood_group:
            blood_groups.add(blood_group)

        bmi = patient.get("bmi")
        if bmi is not None:
            bmis.append(bmi)

        stage = patient.get("stage")
        if stage:
            stages.add(stage)

    return {
        "ageRange": [min(ages), max(ages)] if ages else [18, 85],
        "genders": sorted(genders) if genders else ["Male", "Female"],
        "bloodGroups": sorted(blood_groups) if blood_groups else [],
        "bmiRange": [round(min(bmis), 1), round(max(bmis), 1)] if bmis else [15.0, 40.0],
        "stages": sorted(stages) if stages else [],
    }


def _normalize_stage(value: Any) -> str:
    txt = str(value or "").strip().upper()
    if txt.startswith("STAGE "):
        txt = txt.replace("STAGE ", "", 1).strip()
    return txt


def _matches_search(patient: dict, search_term: str) -> bool:
    stage_query = _normalize_stage(search_term)
    is_stage_exact_query = stage_query in {"I", "II", "III", "IV", "V"}
    if is_stage_exact_query:
        return _normalize_stage(patient.get("stage")) == stage_query

    fields = [
        str(patient.get("patient_id", "")),
        str(patient.get("patient_name", "")),
        str(patient.get("name", "")),
        str(patient.get("disease", "")),
        str(patient.get("stage", "")),
        str(patient.get("blood_group", "")),
        str(patient.get("gender", "")),
        str(patient.get("age", "")),
        str(patient.get("bmi", "")),
    ]
    comorb = patient.get("comorbidities", [])
    if isinstance(comorb, list):
        fields.extend(str(x) for x in comorb)
    else:
        fields.append(str(comorb))
    blob = " ".join(fields).lower()
    return search_term in blob


@router.get("/v2/trials")
async def get_trials_v2():
    """List v2 trials with disease-specific eligibility estimates.

    Uses MongoDB aggregation for fast counts instead of loading all patients.
    """
    try:
        trial_defs = await db_v2.get_trials_from_db()
        trials = []
        for trial in trial_defs:
            disease = trial.get("disease") or trial.get("indication")
            if not disease:
                continue

            enrolled_ids = trial.get("enrolled_patient_ids") or []
            criteria = trial.get("eligibilityCriteria") or {}

            # Use aggregation for fast counts — disease-based
            if disease and criteria:
                summary = await db_v2.get_global_eligibility_summary(disease, criteria)
                eligible_count = summary["eligible_count"]
            else:
                eligible_count = 0

            trials.append(
                {
                    "trial_id": trial.get("trial_id"),
                    "drugName": trial.get("drugName"),
                    "indication": trial.get("indication"),
                    "disease": disease,
                    "phase": trial.get("phase", "Phase III"),
                    "status": trial.get("status", "Active"),
                    "successRate": trial.get("successRate", 0.0),
                    "eligibilityCriteria": criteria,
                    "patientsEnrolled": len(enrolled_ids),
                    "eligibleFromCurrent": eligible_count,
                    "createdAt": trial.get("createdAt"),
                    "createdByHospital": trial.get("createdByHospital", "Unknown Hospital"),
                }
            )

        return {"trials": trials}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/v2/trials")
async def create_trial_v2(
    req: CreateTrialRequestV2,
    hospital: Optional[str] = Query(default=None),
    auto_enroll: bool = Query(default=True, description="Auto-enroll patients with matching disease"),
):
    """Create a v2 trial using the disease-aware schema with optional auto-enrollment."""
    try:
        disease = (req.disease or req.indication).strip()
        if not disease:
            raise HTTPException(status_code=422, detail="disease/indication is required")

        # Build criteria only from matching disease patients when not provided.
        if req.eligibilityCriteria:
            criteria = req.eligibilityCriteria.model_dump()
        else:
            disease_sample = await db_v2.get_patient_sample_by_disease(disease, 2000)
            criteria = _build_criteria_from_patients(disease_sample)

        trial_doc = {
            "trial_id": f"trial_{uuid4().hex[:12]}",
            "drugName": req.drugName,
            "indication": req.indication,
            "disease": disease,
            "phase": req.phase,
            "status": req.status,
            "successRate": req.successRate,
            "eligibilityCriteria": criteria,
            "createdAt": datetime.now(timezone.utc),
            "createdByHospital": hospital or req.createdByHospital or "Unknown Hospital",
            "enrolled_patient_ids": [],
        }

        created = await db_v2.create_trial(trial_doc)
        
        # Auto-enroll patients with matching disease if enabled
        enrollment_result = None
        if auto_enroll:
            enrollment_result = await db_v2.auto_enroll_patients_by_disease(req.drugName, disease)

        # Audit log: trial created
        _audit = _get_audit_logger()
        if _audit:
            _audit(
                action="TRIAL_CREATED",
                details=f"Trial '{req.drugName}' created for {disease} (phase: {req.phase})",
                actor=hospital or req.createdByHospital or "Unknown Hospital",
                metadata={"drugName": req.drugName, "disease": disease, "phase": req.phase},
                cooldown=0,
            )

        return {
            "message": f"Trial '{req.drugName}' created successfully in v2",
            "trial": created,
            "auto_enrollment": enrollment_result,
        }
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/v2/trials/{drug_name}/eligible")
async def get_eligible_patients_for_drug_v2(
    drug_name: str,
    hospital: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    tab: str = "eligible",
    scope: str = "global",
    search: str = "",
):
    """Return eligibility results for enrolled trial patients.

    - scope=global  → hospital breakdown only (no patient rows)
    - scope=hospital → full patient details with pagination
    """
    try:
        page_size = min(max(page_size, 10), 200)
        page = max(page, 1)

        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")

        enrolled_ids = trial.get("enrolled_patient_ids") or []
        criteria = trial.get("eligibilityCriteria") or {}
        disease = trial.get("disease") or trial.get("indication") or ""

        # Fast aggregation for global summary — disease-based
        summary = await db_v2.get_global_eligibility_summary(disease, criteria)
        breakdown = summary["hospital_breakdown"]

        # Audit log: trial eligibility viewed
        _audit = _get_audit_logger()
        if _audit:
            _audit(
                action="TRIAL_VIEWED",
                details=f"Viewed eligibility for trial '{drug_name}' ({summary['eligible_count']} eligible, {summary['not_eligible_count']} not eligible)",
                actor=hospital or "Unknown Hospital",
                record_count=summary["eligible_count"] + summary["not_eligible_count"],
                metadata={"drugName": drug_name, "scope": scope, "tab": tab},
                cooldown=15,
            )

        requested_scope = (scope or "global").strip().lower()

        if requested_scope == "hospital" and hospital:
            # Hospital scope: paginated full patient details
            hospital_data = await db_v2.get_hospital_patients_paginated(
                disease, criteria, hospital, tab, page, page_size, search,
            )
            hospital_cols = [
                "patient_id", "patient_name", "age", "gender", "blood_group",
                "disease", "stage", "comorbidities", "bmi", "diagnosis_date",
                "phone", "email",
            ]
            return {
                "drug": drug_name,
                "hospital": hospital,
                "tab": tab,
                "scope": "hospital",
                "patients": hospital_data["patients"],
                "columns": hospital_cols,
                "eligible_count": summary["eligible_count"],
                "not_eligible_count": summary["not_eligible_count"],
                "hospital_eligible_count": hospital_data["eligible_count"],
                "hospital_not_eligible_count": hospital_data["not_eligible_count"],
                "hospital_total": hospital_data["eligible_count"] + hospital_data["not_eligible_count"],
                "hospital_breakdown": breakdown,
                "scope_total": hospital_data["total"],
                "page": hospital_data["page"],
                "page_size": page_size,
                "total_pages": hospital_data["total_pages"],
                "search": search,
                "trial_params": criteria,
                "enrolled_count": len(enrolled_ids),
            }
        else:
            # Global scope: summary only, no patient rows
            h_info = breakdown.get(hospital, {}) if hospital else {}
            return {
                "drug": drug_name,
                "hospital": hospital,
                "tab": tab,
                "scope": "global",
                "patients": [],
                "columns": [],
                "eligible_count": summary["eligible_count"],
                "not_eligible_count": summary["not_eligible_count"],
                "hospital_eligible_count": h_info.get("eligible", 0),
                "hospital_not_eligible_count": h_info.get("not_eligible", 0),
                "hospital_total": h_info.get("total", 0),
                "hospital_breakdown": breakdown,
                "scope_total": summary["eligible_count"] if tab == "eligible" else summary["not_eligible_count"],
                "page": 1,
                "page_size": page_size,
                "total_pages": 1,
                "search": "",
                "trial_params": criteria,
                "enrolled_count": len(enrolled_ids),
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/v2/trials/{drug_name}/check-patient")
async def check_patient_eligibility_v2(drug_name: str, body: dict):
    """Check a single patient's eligibility against this trial's criteria."""
    try:
        patient_id = str(body.get("patient_id") or "").strip()
        if not patient_id:
            raise HTTPException(status_code=422, detail="patient_id is required")

        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found")

        criteria = trial.get("eligibilityCriteria") or {}
        result = await db_v2.check_patient_eligibility(patient_id, criteria)
        if not result:
            raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")

        # Audit log: manual patient check
        _audit = _get_audit_logger()
        if _audit:
            _audit(
                action="PATIENT_CHECK",
                details=f"Manual eligibility check: patient '{patient_id}' for trial '{drug_name}' — {'ELIGIBLE' if result.get('is_eligible') else 'NOT ELIGIBLE'}",
                actor="Hospital User",
                metadata={"drugName": drug_name, "patient_id": patient_id, "is_eligible": result.get("is_eligible")},
                cooldown=2,
            )

        return {"patient": result, "trial": drug_name, "criteria": criteria}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/v2/trials/{drug_name}")
async def delete_trial_v2(drug_name: str, hospital: Optional[str] = Query(default=None)):
    """Delete a trial by drug name."""
    try:
        db = db_v2.get_async_db()
        result = await db.trials.delete_one({"drugName": drug_name})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found")

        # Audit log: trial deleted
        _audit = _get_audit_logger()
        if _audit:
            _audit(
                action="TRIAL_DELETED",
                details=f"Trial '{drug_name}' was deleted",
                actor=hospital or "Unknown Hospital",
                metadata={"drugName": drug_name},
                cooldown=0,
            )

        return {"message": f"Trial '{drug_name}' deleted successfully", "deleted": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/v2/trials/{drug_name}/patients")
async def add_patients_to_trial_v2(drug_name: str, req: AddPatientsRequestV2):
    """Manually enroll patients into a trial.

    req.patient_ids should contain _oid strings (MongoDB ObjectId hex strings).
    This enforces explicit membership: eligibility runs only for enrolled IDs.
    """
    try:
        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")

        disease = trial.get("disease") or trial.get("indication")
        # req.patient_ids are now _oid strings (ObjectId hex)
        result = await db_v2.add_patients_to_trial(drug_name, req.patient_ids)
        updated_trial = await db_v2.get_trial_by_drug_name(drug_name)
        enrolled = updated_trial.get("enrolled_patient_ids") or []

        return {
            "message": f"Added {len(req.patient_ids)} patients to trial '{drug_name}'",
            "trial_id": updated_trial.get("trial_id"),
            "disease": disease,
            "added_count": len(req.patient_ids),
            "requested_count": len(req.patient_ids),
            "enrolled_count": len(enrolled),
            "db_matched": result.get("matched", 0),
            "db_modified": result.get("modified", 0),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/v2/trials/{drug_name}/patients")
async def remove_patients_from_trial_v2(drug_name: str, req: AddPatientsRequestV2):
    """Remove enrolled patients from a trial."""
    try:
        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")

        result = await db_v2.remove_patients_from_trial(drug_name, req.patient_ids)
        updated_trial = await db_v2.get_trial_by_drug_name(drug_name)
        enrolled = updated_trial.get("enrolled_patient_ids") or []

        return {
            "message": f"Removed patients from trial '{drug_name}'",
            "trial_id": updated_trial.get("trial_id"),
            "removed_requested": len(req.patient_ids),
            "enrolled_count": len(enrolled),
            "db_matched": result.get("matched", 0),
            "db_modified": result.get("modified", 0),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/v2/trials/{drug_name}/patients")
async def get_trial_patients_v2(drug_name: str):
    """Return currently enrolled patients for a trial (manual enrollment set)."""
    try:
        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")
        patient_ids = trial.get("enrolled_patient_ids") or []
        patients = await db_v2.get_patients_by_ids(patient_ids)
        return {
            "trial_id": trial.get("trial_id"),
            "drugName": trial.get("drugName"),
            "disease": trial.get("disease") or trial.get("indication"),
            "enrolled_count": len(patient_ids),
            "patients": patients,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/v2/trials/{drug_name}/available-patients")
async def get_available_patients_for_trial_v2(
    drug_name: str,
    hospital: Optional[str] = Query(default=None, description="Filter by hospital name"),
):
    """
    Get patients NOT enrolled in this trial, filtered by disease match.
    
    Useful for showing a checklist of patients that can be added to the trial.
    """
    try:
        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")
        
        disease = trial.get("disease") or trial.get("indication")
        patients = await db_v2.get_available_patients_for_trial(drug_name, hospital, disease)
        
        return {
            "trial_id": trial.get("trial_id"),
            "drugName": drug_name,
            "disease": disease,
            "hospital_filter": hospital,
            "available_count": len(patients),
            "patients": patients,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/v2/trials/{drug_name}/auto-enroll")
async def auto_enroll_patients_v2(drug_name: str):
    """
    Auto-enroll ALL disease-matching patients into this trial.
    Uses smart substring matching (trial 'Cancer' → all cancer types).
    """
    try:
        trial = await db_v2.get_trial_by_drug_name(drug_name)
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial '{drug_name}' not found in v2")

        disease = trial.get("disease") or trial.get("indication")
        if not disease:
            raise HTTPException(status_code=400, detail="Trial has no disease set")

        result = await db_v2.auto_enroll_patients_by_disease(drug_name, disease)
        total_enrolled = result.get("enrolled_count", 0)
        patients_found = result.get("patients_found", 0)

        return {
            "message": f"Auto-enrolled {patients_found} matching patients into trial '{drug_name}' (disease: '{disease}'). Total enrolled: {total_enrolled}",
            "enrolled_count": total_enrolled,
            "patients_found": patients_found,
            "drugName": drug_name,
            "disease": disease,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
