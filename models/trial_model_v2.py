"""Pydantic models for v2 trial API schema."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class EligibilityCriteriaV2(BaseModel):
    """Eligibility rule set stored per trial in v2."""

    ageRange: List[float] = Field(default_factory=lambda: [18, 85], min_length=2, max_length=2)
    genders: List[str] = Field(default_factory=lambda: ["Male", "Female"])
    bloodGroups: List[str] = Field(default_factory=list)
    bmiRange: List[float] = Field(default_factory=lambda: [15.0, 40.0], min_length=2, max_length=2)
    stages: List[str] = Field(default_factory=list)


class CreateTrialRequestV2(BaseModel):
    """Request payload for creating a v2 trial."""

    drugName: str
    indication: str
    disease: Optional[str] = None
    phase: str = "Phase III"
    status: str = "Active"
    successRate: float = 0.0
    eligibilityCriteria: Optional[EligibilityCriteriaV2] = None
    createdByHospital: str = "Unknown Hospital"


class AddPatientsRequestV2(BaseModel):
    """Request payload for manually adding patients to a trial."""

    patient_ids: List[str]


class TrialV2(BaseModel):
    """Stored and returned v2 trial model."""

    trial_id: str
    drugName: str
    indication: str
    disease: str
    phase: str
    status: str
    successRate: float
    eligibilityCriteria: EligibilityCriteriaV2
    createdAt: datetime
    createdByHospital: str
    enrolled_patient_ids: List[str] = Field(default_factory=list)
