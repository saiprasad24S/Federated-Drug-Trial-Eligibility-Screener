"""
Seed personal details (name, phone, email, address, emergency_contact, admission_date)
into existing patients in MongoDB that don't already have them.
"""
import os, sys, random, hashlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = "mongodb+srv://yb15313037_db_user:D09J5gpczE2QAAD8@cluster0.oxujjgd.mongodb.net/"
DB_NAME = "federated_screener"

# ---------- Realistic Indian name pools ----------
FIRST_NAMES_MALE = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Shaurya", "Atharva", "Advait", "Dhruv", "Kabir",
    "Ritvik", "Aarush", "Kian", "Darsh", "Veer", "Yash", "Rohan", "Arnav",
    "Laksh", "Pranav", "Rudra", "Aadit", "Kiaan", "Sahil", "Ravi",
    "Suresh", "Mahesh", "Rajesh", "Ganesh", "Dinesh", "Ramesh", "Naresh",
    "Mukesh", "Prakash", "Vikram", "Amit", "Sumit", "Ankit", "Nikhil",
    "Rahul", "Deepak", "Manoj", "Sanjay", "Ajay", "Vijay", "Karthik",
    "Harish", "Pradeep", "Mohan", "Gopal", "Venkat", "Srikanth", "Naveen",
]

FIRST_NAMES_FEMALE = [
    "Saanvi", "Aanya", "Aadhya", "Aaradhya", "Ananya", "Pari", "Anika",
    "Navya", "Diya", "Myra", "Ira", "Sara", "Ahana", "Kiara", "Prisha",
    "Avni", "Meera", "Riya", "Sneha", "Pooja", "Neha", "Priya", "Swati",
    "Kavya", "Tanvi", "Divya", "Shreya", "Aishwarya", "Lakshmi", "Sita",
    "Radha", "Geeta", "Anjali", "Sunita", "Rekha", "Padma", "Savitri",
    "Kamala", "Indira", "Nandini", "Deepika", "Rani", "Lata", "Usha",
    "Shalini", "Bhavana", "Madhuri", "Pallavi", "Rashmi", "Vaishali",
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy",
    "Rao", "Nair", "Menon", "Iyer", "Shah", "Joshi", "Desai", "Mehta",
    "Chopra", "Malhotra", "Kapoor", "Bhat", "Pillai", "Das", "Ghosh",
    "Mukherjee", "Chatterjee", "Banerjee", "Sen", "Bose", "Dutta",
    "Agarwal", "Mishra", "Pandey", "Tiwari", "Dubey", "Srivastava",
    "Saxena", "Rastogi", "Chauhan", "Yadav", "Thakur", "Rajput",
    "Naidu", "Kulkarni", "Patil", "Shinde", "Jadhav", "Pawar",
    "Kaur", "Gill", "Sidhu", "Dhillon", "Bedi", "Walia", "Bajwa",
]

CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
    ("Hyderabad", "Telangana"), ("Chennai", "Tamil Nadu"), ("Kolkata", "West Bengal"),
    ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"), ("Chandigarh", "Punjab"), ("Kochi", "Kerala"),
    ("Bhopal", "Madhya Pradesh"), ("Indore", "Madhya Pradesh"),
    ("Visakhapatnam", "Andhra Pradesh"), ("Nagpur", "Maharashtra"),
    ("Coimbatore", "Tamil Nadu"), ("Thiruvananthapuram", "Kerala"),
    ("Patna", "Bihar"), ("Guwahati", "Assam"), ("Mysore", "Karnataka"),
    ("Varanasi", "Uttar Pradesh"), ("Surat", "Gujarat"), ("Vadodara", "Gujarat"),
]

STREETS = [
    "MG Road", "Gandhi Nagar", "Nehru Street", "Station Road", "Park Avenue",
    "Main Street", "Civil Lines", "Rajaji Nagar", "Anna Salai", "Brigade Road",
    "Linking Road", "Hill Road", "Ring Road", "Church Street", "Temple Street",
    "Market Road", "Lake Road", "Residency Road", "Cantonment Area",
    "Jubilee Hills", "Banjara Hills", "Koramangala", "Indiranagar",
    "Sector 17", "Sector 22", "Phase 5", "Block C", "Green Park",
]

EMAIL_DOMAINS = [
    "gmail.com", "yahoo.co.in", "outlook.com", "rediffmail.com",
    "hotmail.com", "protonmail.com", "icloud.com",
]


def _random_phone():
    """Indian mobile: +91 followed by 10 digits starting with 6-9."""
    prefix = random.choice(["6", "7", "8", "9"])
    return f"+91 {prefix}{random.randint(100000000, 999999999)}"


def _random_email(name: str, pid: str):
    """Generate a plausible email from the patient name."""
    base = name.lower().replace(" ", ".").replace("..", ".")
    suffix = pid[-4:]  # last 4 chars of patient_id for uniqueness
    domain = random.choice(EMAIL_DOMAINS)
    return f"{base}{suffix}@{domain}"


def _random_address():
    house = f"{random.randint(1, 999)}/{random.choice('ABCDEFGH')}"
    street = random.choice(STREETS)
    city, state = random.choice(CITIES)
    pin = random.randint(100000, 999999)
    return f"{house}, {street}, {city}, {state} - {pin}"


def _random_admission_date():
    """Random date between 2022-01-01 and 2026-02-01."""
    start = datetime(2022, 1, 1)
    end = datetime(2026, 2, 1)
    delta = (end - start).days
    d = start + timedelta(days=random.randint(0, delta))
    return d.strftime("%Y-%m-%d")


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    col = db.patients

    # Get all patients without patient_name
    patients = list(col.find(
        {"$or": [{"patient_name": {"$exists": False}}, {"patient_name": None}]},
        {"_id": 1, "patient_id": 1, "gender": 1}
    ))
    total = len(patients)
    if total == 0:
        print("All patients already have personal details. Nothing to do.")
        return

    print(f"Seeding personal details for {total} patients...")

    ops = []
    for i, p in enumerate(patients):
        gender = p.get("gender", "Male")
        pid = p.get("patient_id", f"P{i}")

        if gender == "Female":
            first = random.choice(FIRST_NAMES_FEMALE)
        else:
            first = random.choice(FIRST_NAMES_MALE)
        last = random.choice(LAST_NAMES)
        full_name = f"{first} {last}"

        phone = _random_phone()
        email = _random_email(full_name, pid)
        address = _random_address()
        emergency_contact = f"{random.choice(FIRST_NAMES_MALE + FIRST_NAMES_FEMALE)} {random.choice(LAST_NAMES)} — {_random_phone()}"
        admission_date = _random_admission_date()

        ops.append(UpdateOne(
            {"_id": p["_id"]},
            {"$set": {
                "patient_name": full_name,
                "phone": phone,
                "email": email,
                "address": address,
                "emergency_contact": emergency_contact,
                "admission_date": admission_date,
            }}
        ))

        if len(ops) >= 200:
            result = col.bulk_write(ops)
            print(f"  Updated {i + 1}/{total} patients ({result.modified_count} modified)")
            ops = []

    if ops:
        result = col.bulk_write(ops)
        print(f"  Updated {total}/{total} patients ({result.modified_count} modified)")

    # Verify
    sample = col.find_one({"patient_name": {"$exists": True}}, {"_id": 0})
    print(f"\nDone! Sample patient:\n{sample}")


if __name__ == "__main__":
    main()
