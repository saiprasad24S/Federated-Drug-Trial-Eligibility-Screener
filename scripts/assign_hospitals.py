"""
Assign existing patients to hospitals.

Each patient gets a `hospital_name` field matching one of the registered
hospital accounts.  The distribution is roughly:

  - Sai Prasad Medical Center   ~40 %
  - Apollo Hospitals             ~25 %
  - Fortis Healthcare            ~20 %
  - Max Super Specialty Hospital ~15 %

Patients that already have a `hospital_name` are skipped.
"""

import os
import sys
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME")

HOSPITALS = [
    ("Sai Prasad Medical Center", 40),
    ("Apollo Hospitals", 25),
    ("Fortis Healthcare", 20),
    ("Max Super Specialty Hospital", 15),
]


def _weighted_choice():
    """Return a hospital name based on configured weights."""
    names, weights = zip(*HOSPITALS)
    return random.choices(names, weights=weights, k=1)[0]


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db.patients

    # Find patients without hospital_name
    patients = list(col.find(
        {"$or": [
            {"hospital_name": {"$exists": False}},
            {"hospital_name": None},
            {"hospital_name": ""},
        ]},
        {"_id": 1},
    ))

    total = len(patients)
    if total == 0:
        # Check current distribution
        pipeline = [
            {"$group": {"_id": "$hospital_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        print("All patients already have a hospital_name assigned.")
        print("\nCurrent distribution:")
        for doc in col.aggregate(pipeline):
            print(f"  {doc['_id']}: {doc['count']} patients")
        return

    print(f"Assigning hospital_name to {total} patients...")

    ops = []
    counts = {h: 0 for h, _ in HOSPITALS}

    for i, p in enumerate(patients):
        hosp = _weighted_choice()
        counts[hosp] += 1
        ops.append(UpdateOne({"_id": p["_id"]}, {"$set": {"hospital_name": hosp}}))

        if len(ops) >= 500:
            col.bulk_write(ops)
            print(f"  ... assigned {i + 1}/{total}")
            ops = []

    if ops:
        col.bulk_write(ops)

    print(f"\nDone! Assigned {total} patients:")
    for hosp, cnt in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {hosp}: {cnt} patients ({cnt * 100 // total}%)")

    # Verify with aggregation
    print("\nVerification (from MongoDB):")
    pipeline = [
        {"$group": {"_id": "$hospital_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    for doc in col.aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['count']} patients")


if __name__ == "__main__":
    main()
