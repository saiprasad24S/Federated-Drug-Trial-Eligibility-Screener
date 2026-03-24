"""Quick diagnostic: check MongoDB collection counts."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = (os.getenv("MONGO_URI") or "").strip()
DB_NAME = (os.getenv("MONGO_DB_NAME") or "").strip()

if not MONGO_URI:
    # Fallback from seed script
    MONGO_URI = "mongodb+srv://yb15313037_db_user:D09J5gpczE2QAAD8@cluster0.oxujjgd.mongodb.net/"
    DB_NAME = DB_NAME or "federated_screener"

print(f"URI: {MONGO_URI[:50]}...")
print(f"DB:  {DB_NAME}")

client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client[DB_NAME]

for col_name in ["patients", "hospitals", "trials", "audit_logs", "training_logs"]:
    count = db[col_name].count_documents({})
    print(f"  {col_name}: {count} documents")

# Show a sample patient if any
sample = db.patients.find_one({}, {"_id": 0})
if sample:
    print(f"\nSample patient keys: {list(sample.keys())}")
else:
    print("\nNo patients found!")

# Check all collection names in the DB
print(f"\nAll collections in {DB_NAME}: {db.list_collection_names()}")
