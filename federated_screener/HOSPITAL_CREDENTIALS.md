# Federated Screener - Hospital Login Credentials

## Overview
The system has been updated with 4 hospital accounts and enhanced patient management features.

## Hospital Login Credentials

### 1. Sai Prasad Medical Center
- **Username:** `sai_prasad`
- **Password:** `password123`
- **Email:** admin@saiprasad.com
- **Patients:** 5 patients with various conditions

### 2. Apollo Hospitals
- **Username:** `apollo`
- **Password:** `apollo@123`
- **Email:** admin@apollo.com
- **Patients:** 5 patients with various conditions

### 3. Fortis Healthcare
- **Username:** `fortis`
- **Password:** `fortis@123`
- **Email:** admin@fortis.com
- **Patients:** 5 patients with various conditions

### 4. Max Super Specialty Hospital
- **Username:** `max`
- **Password:** `max@123`
- **Email:** admin@maxhealthcare.com
- **Patients:** 5 patients with various conditions

## New Features

### 1. Hospital-Specific Login
- Each hospital has unique credentials
- Credentials are validated on login
- Hospital name is automatically associated with user sessions

### 2. Enhanced Patient Management
- **Hospital Filter:** Filter patients by hospital (or view all)
- **Patient Count:** See number of patients per hospital
- **Hospital Badges:** Hospital names displayed as badges in the patient table (purple color)
- **Better UI:** Improved layout with hospital filter buttons

### 3. Removed CSV Upload
- CSV upload has been removed from the UI and backend
- Only JSON and PDF formats are now supported
- Use the sample_hospital_data.json file as a reference for JSON format

## Sample Data

The `sample_hospital_data.json` file contains:
- **20 total patients** (5 per hospital)
- **Real medical conditions** (Diabetes, Cancer, Arthritis, etc.)
- **Hospital information** properly structured
- **Patient eligibility data** based on predefined criteria

### To Load Sample Data:
1. Go to the application
2. Click "Upload Data" button
3. Select `sample_hospital_data.json`
4. Click "Upload"
5. All 20 patients will be loaded with their hospital associations

## Patient Data Structure (JSON Format)

Each hospital's patients follow this structure:

```json
{
  "hospitals": {
    "Hospital Name": [
      {
        "patient_id": "UNIQUE_ID",
        "age": 45,
        "gender": "Male/Female",
        "blood_group": "O+/A+/B+/AB+/O-/A-/B-/AB-",
        "disease": "Disease Name",
        "stage": "I/II/III",
        "comorbidities": ["Disease1", "Disease2"],
        "bmi": 25.5,
        "diagnosis_date": "YYYY-MM-DD",
        "drug": "Drug Name",
        "eligible": 0 or 1,
        "drug_worked": 0 or 1
      }
    ]
  }
}
```

## Features by Hospital View

When logged in, users can:

1. **View All Patients**
   - See all patients across the federated network
   - Understand total patient cohort

2. **Filter by Hospital**
   - Click hospital buttons to filter
   - See hospital-specific patient data
   - Hospital-specific statistics

3. **Monitor Patient Data**
   - Patient ID, Age, Disease, Drug Trial, Hospital, Eligibility
   - Easy identification by hospital badges
   - Color-coded eligibility status (Green = Yes, Red = No)

## Architecture Impact

### Frontend Changes:
- `LoginPage.jsx`: Added hospital credentials database
- `PatientsManager.jsx`: Added hospital filter UI
- Hospital names displayed in patient table

### Backend Changes:
- Removed CSV upload endpoint
- JSON upload still supports multiple hospitals
- Patient data structure maintains hospital associations

## Testing Instructions

### Test 1: Login with Different Hospitals
1. Logout
2. Login with `apollo` / `apollo@123`
3. Verify hospital name appears in dashboard
4. Login with different hospital and repeat

### Test 2: Patient Filtering
1. Upload `sample_hospital_data.json`
2. Click "All Hospitals" - see all 20 patients
3. Click individual hospital buttons
4. Verify patient counts match (5 per hospital)

### Test 3: Hospital Identification
1. View patient table
2. Verify each patient has their hospital name displayed
3. Verify hospital names match the login hospital

## Notes

- All 4 hospitals share the same federated learning system
- Patient data is persisted in `medical_data.json`
- Hospital association is maintained throughout the system
- The system is privacy-preserving - each hospital can see all patient data but knows which hospital each patient is from
