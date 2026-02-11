from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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

# Try to import FL components, but make them optional
try:
    from fl_server.server import FederatedServer
    FL_SERVER_AVAILABLE = True
except Exception as e:
    print(f"Warning: Federated Learning Server not available: {e}")
    FL_SERVER_AVAILABLE = False
    FederatedServer = None

try:
    from blockchain.logger import BlockchainLogger
    BLOCKCHAIN_AVAILABLE = True
except Exception as e:
    print(f"Warning: Blockchain logger not available: {e}")
    BLOCKCHAIN_AVAILABLE = False
    BlockchainLogger = None

app = FastAPI(title="Federated Drug Trial Eligibility Screener API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for state management
training_logs = []
is_training = False
blockchain_logger = None
patients_data = {"hospitals": {}}
medical_data_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "medical_data.json")

# Load existing medical data if it exists
if os.path.exists(medical_data_file):
    try:
        with open(medical_data_file, 'r') as f:
            patients_data = json.load(f)
    except Exception as e:
        print(f"Failed to load medical data: {e}")

# Initialize blockchain logger with fallback
blockchain_logger = None
if BLOCKCHAIN_AVAILABLE:
    try:
        blockchain_logger = BlockchainLogger()
    except Exception as e:
        print(f"Failed to initialize blockchain logger: {e}")
        print("Continuing with mock blockchain functionality")

if blockchain_logger is None:
    # Import mock logger
    from blockchain.logger import MockBlockchainLogger
    blockchain_logger = MockBlockchainLogger()

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
    gender: Optional[str]
    blood_group: Optional[str]
    disease: str
    stage: Optional[str]
    comorbidities: List[str] = []
    bmi: Optional[float]
    diagnosis_date: Optional[str]
    drug: str
    eligible: int = 0
    drug_worked: int = 0

@app.post("/start-fl")
async def start_federated_learning(request: TrainingRequest):
    """
    Start federated learning training.
    This endpoint starts the FL server and clients in background threads.
    """
    global is_training

    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")

    is_training = True

    def run_training():
        global is_training, training_logs

        try:
            # Create server instance
            server = FederatedServer(num_rounds=request.num_rounds)

            # Start clients in separate threads
            client_threads = []
            for i in range(3):
                thread = threading.Thread(target=start_client, args=(i,))
                thread.daemon = True
                client_threads.append(thread)
                thread.start()

            # Small delay to let clients connect
            time.sleep(2)

            # Start server (this will block until training completes)
            server.start_server()

            # Update global logs
            training_logs = server.training_logs

        except Exception as e:
            print(f"Training failed: {e}")
        finally:
            is_training = False

    # Start training in background thread
    training_thread = threading.Thread(target=run_training)
    training_thread.daemon = True
    training_thread.start()

    return {"message": f"Federated learning started with {request.num_rounds} rounds"}

def start_client(client_id: int):
    """Start a client process."""
    try:
        # Run client in subprocess
        subprocess.run([
            "python", "clients/client.py", str(client_id)
        ], cwd=os.path.dirname(os.path.dirname(__file__)))
    except Exception as e:
        print(f"Client {client_id} failed: {e}")

@app.get("/training-logs", response_model=List[LogEntry])
async def get_training_logs():
    """
    Get training logs from memory.
    In production, you might want to store these in a database.
    """
    return training_logs

@app.get("/model-metrics")
async def get_model_metrics():
    """
    Get current model metrics and blockchain logs.
    """
    if not training_logs:
        return {"message": "No training data available"}

    latest_log = training_logs[-1] if training_logs else None

    # Get blockchain logs
    blockchain_logs = blockchain_logger.get_logs() if blockchain_logger else []

    return {
        "latest_metrics": latest_log,
        "blockchain_logs_count": len(blockchain_logs),
        "total_rounds": len(training_logs),
        "is_training": is_training
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "blockchain_connected": blockchain_logger.w3.is_connected() if blockchain_logger else False,
        "training_active": is_training
    }

# ==================== Patient and Trial Endpoints ====================

@app.get("/patients")
async def get_patients():
    """Get all patients from all hospitals."""
    try:
        all_patients = []
        for hospital, patients_list in patients_data.get("hospitals", {}).items():
            for patient in patients_list:
                if "hospital" not in patient:
                    patient["hospital"] = hospital
                all_patients.append(patient)
        return {"patients": all_patients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trials")
async def get_trials():
    """Get all drug trials and their statistics."""
    try:
        trials_stats = {}

        for hospital, patients_list in patients_data.get("hospitals", {}).items():
            for patient in patients_list:
                drug = patient.get("drug", "Unknown")
                disease = patient.get("disease", "Unknown Disease")
                eligible = patient.get("eligible", 0)
                drug_worked = patient.get("drug_worked", 0)

                if drug not in trials_stats:
                    trials_stats[drug] = {
                        "drugName": drug,
                        "indication": disease,
                        "phase": "Phase III",
                        "status": "Active",
                        "patientsEnrolled": 0,
                        "eligiblePatients": 0,
                        "successCount": 0,
                        "successRate": 0,
                        "startDate": "2024-01-01",
                        "lastUpdate": datetime.now().strftime("%Y-%m-%d")
                    }

                trials_stats[drug]["patientsEnrolled"] += 1
                if eligible:
                    trials_stats[drug]["eligiblePatients"] += 1
                if drug_worked:
                    trials_stats[drug]["successCount"] += 1

        trials = []
        for idx, (drug, stats) in enumerate(trials_stats.items()):
            if stats["patientsEnrolled"] > 0:
                stats["successRate"] = round((stats["successCount"] / stats["patientsEnrolled"]) * 100, 1)
            trials.append({"id": idx + 1, **stats})

        return {"trials": trials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-json")
async def upload_json(file: UploadFile = File(...)):
    """Upload JSON file with patient data."""
    try:
        global patients_data

        if not file.filename.endswith(".json"):
            raise HTTPException(status_code=400, detail="File must be a JSON file")

        # Read file content
        content = await file.read()
        uploaded_data = json.loads(content)

        if "hospitals" not in uploaded_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid JSON structure. Must contain 'hospitals' key"
            )

        # Merge with existing data
        for hospital, patients_list in uploaded_data["hospitals"].items():
            if hospital in patients_data["hospitals"]:
                patients_data["hospitals"][hospital].extend(patients_list)
            else:
                patients_data["hospitals"][hospital] = patients_list

        # Save to file
        with open(medical_data_file, "w") as f:
            json.dump(patients_data, f, indent=2)

        total_patients = sum(
            len(p) for p in patients_data["hospitals"].values()
        )

        # Log to blockchain
        if blockchain_logger:
            try:
                num_patients = sum(len(p) for p in uploaded_data["hospitals"].values())
                blockchain_logger.log_data_upload(
                    data_type="JSON",
                    source="File Upload",
                    record_count=num_patients,
                    hospitals=list(uploaded_data["hospitals"].keys())
                )
            except Exception as e:
                print(f"Failed to log to blockchain: {e}")

        return {
            "message": "JSON file uploaded successfully",
            "hospitals_added": len(uploaded_data["hospitals"]),
            "total_patients": total_patients
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF file with patient data."""
    try:
        global patients_data

        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File must be a PDF file")

        # Read PDF content (simple extraction)
        content = await file.read()
        
        # Save temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        # Extract text from PDF
        extracted_text = ""
        if PYPDF2_AVAILABLE:
            try:
                with open(temp_path, "rb") as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text()
            except Exception as e:
                extracted_text = f"Error extracting PDF: {str(e)}"
        else:
            extracted_text = "PDF extraction not available. Install PyPDF2 for full PDF support."
        
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {
            "message": "PDF file uploaded successfully",
            "extracted_text_preview": extracted_text[:500],
            "note": "PDF processing requires manual data entry or PyPDF2 installation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload CSV file with patient data."""
    try:
        global patients_data
        import csv

        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="File must be a CSV file")

        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Parse CSV
        lines = text_content.strip().split('\n')
        reader = csv.DictReader(lines)
        
        patients_list = []
        hospital_name = "CSV_Upload"
        
        for row in reader:
            patient = {
                "patient_id": row.get("patient_id", f"csv_{len(patients_list)}"),
                "age": int(row.get("age", 0)) if row.get("age") else None,
                "gender": row.get("gender"),
                "blood_group": row.get("blood_group"),
                "disease": row.get("disease", "Unknown"),
                "stage": row.get("stage"),
                "comorbidities": row.get("comorbidities", "").split(";") if row.get("comorbidities") else [],
                "bmi": float(row.get("bmi", 0)) if row.get("bmi") else None,
                "diagnosis_date": row.get("diagnosis_date"),
                "drug": row.get("drug", "Unknown"),
                "eligible": int(row.get("eligible", 0)),
                "drug_worked": int(row.get("drug_worked", 0)),
            }
            patients_list.append(patient)
        
        # Add to existing data
        if hospital_name not in patients_data["hospitals"]:
            patients_data["hospitals"][hospital_name] = []
        patients_data["hospitals"][hospital_name].extend(patients_list)

        # Save to file
        with open(medical_data_file, "w") as f:
            json.dump(patients_data, f, indent=2)

        total_patients = sum(
            len(p) for p in patients_data["hospitals"].values()
        )

        # Log to blockchain
        if blockchain_logger:
            try:
                blockchain_logger.log_data_upload(
                    data_type="CSV",
                    source="File Upload",
                    record_count=len(patients_list),
                    hospitals=[hospital_name]
                )
            except Exception as e:
                print(f"Failed to log to blockchain: {e}")

        return {
            "message": "CSV file uploaded successfully",
            "records_added": len(patients_list),
            "total_patients": total_patients
        }
    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict_eligibility(patient: PatientData):
    """Predict patient eligibility for a trial."""
    try:
        # Simple eligibility prediction based on rules
        score = 0
        reasons = []

        # Age scoring
        if 18 <= patient.age <= 65:
            score += 30
            reasons.append("Age within optimal range")
        elif patient.age > 65:
            score += 15
            reasons.append("Age above 65, reduced eligibility")
        else:
            reasons.append("Age below 18, ineligible")

        # BMI scoring
        if patient.bmi and 18.5 <= patient.bmi <= 30:
            score += 25
            reasons.append("BMI within healthy range")
        elif patient.bmi:
            score += 10
            reasons.append("BMI outside healthy range")

        # Disease stage scoring
        if patient.stage in ["I", "II"]:
            score += 25
            reasons.append("Early stage disease, good for trial")
        elif patient.stage == "III":
            score += 15
            reasons.append("Advanced stage disease")

        # Comorbidities
        if len(patient.comorbidities) <= 1:
            score += 20
            reasons.append("Few comorbidities")
        else:
            score += 5
            reasons.append("Multiple comorbidities present")

        eligible = 1 if score >= 60 else 0

        return {
            "eligible": eligible,
            "score": score,
            "reasons": reasons,
            "recommendation": "Eligible for trial" if eligible else "Not eligible for trial"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/training-status")
async def get_training_status():
    """Get current training status."""
    return {
        "is_training": is_training,
        "total_rounds": len(training_logs),
        "rounds_completed": len(training_logs),
        "latest_metrics": training_logs[-1] if training_logs else None
    }

@app.post("/start-training")
async def start_training(request: Dict[str, Any] = None):
    """Start training with optional configuration."""
    global is_training, training_logs
    
    if is_training:
        raise HTTPException(status_code=400, detail="Training already in progress")
    
    is_training = True
    num_rounds = request.get("num_rounds", 10) if request else 10
    
    def run_training_simulation():
        global is_training, training_logs
        import random
        try:
            # Simulate training rounds
            training_logs = []
            for round_num in range(1, num_rounds + 1):
                # Simulate metrics that improve over time
                accuracy = 0.65 + (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                accuracy = min(0.95, max(0.6, accuracy))  # Clamp between 0.6 and 0.95
                
                loss = 0.5 - (round_num / num_rounds) * 0.3 + random.uniform(-0.05, 0.05)
                loss = max(0.1, loss)  # Keep loss positive
                
                log_entry = {
                    "round": round_num,
                    "accuracy": round(accuracy, 4),
                    "loss": round(loss, 4),
                    "timestamp": datetime.now().isoformat(),
                    "model_hash": f"model_r{round_num}_h{hash(str(round_num)) % 10000}",
                }
                training_logs.append(log_entry)
                
                # Simulate training time (0.5 seconds per round)
                time.sleep(0.5)
                
                if not is_training:
                    break
            
        except Exception as e:
            print(f"Training simulation error: {e}")
        finally:
            is_training = False
    
    # Start training in background thread
    training_thread = threading.Thread(target=run_training_simulation, daemon=True)
    training_thread.start()
    
    return {"message": f"Training started with {num_rounds} rounds"}

@app.post("/stop-training")
async def stop_training():
    """Stop ongoing training."""
    global is_training
    is_training = False
    return {"message": "Training stopped"}

@app.post("/reset-training")
async def reset_training():
    """Reset training logs and state."""
    global is_training, training_logs
    is_training = False
    training_logs = []
    return {"message": "Training state reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)