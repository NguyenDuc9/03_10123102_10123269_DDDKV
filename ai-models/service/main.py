import json
import os
from pathlib import Path
import sys

import joblib
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

MODEL_NAMES = ("knn", "logistic_regression", "decision_tree", "naive_bayes")
MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(os.getenv("MODEL_PATH", "/app/models/model.joblib")).parent))
MODELS = {}

app = FastAPI(title="Loan Approval AI Service")


class LoanApplication(BaseModel):
    gender: str
    married: str
    dependents: str
    education: str
    self_employed: str
    applicantincome: float
    coapplicantincome: float
    loanamount: float | None = None
    loan_amount_term: float | None = None
    credit_history: float | None = None
    property_area: str


class PredictionResponse(BaseModel):
    prediction: int
    probability: float
    model_name: str
    model_version: str = "1.0.0"
    request_id: str


@app.on_event("startup")
def load_model():
    global MODELS
    model_paths = {name: MODEL_DIR / f"{name}.joblib" for name in MODEL_NAMES}
    if not all(path.exists() for path in model_paths.values()):
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from src.train_model import train_models

        train_models(model_dir=MODEL_DIR)
    MODELS = {name: joblib.load(path) for name, path in model_paths.items()}
    print(f"Loaded {len(MODELS)} models into memory from {MODEL_DIR}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "model_loaded": len(MODELS) == len(MODEL_NAMES),
        "loaded_models": list(MODELS),
        "model_dir": str(MODEL_DIR),
    }


@app.get("/model-info")
def model_info():
    metadata_path = MODEL_DIR / "metadata.json"
    schema_path = MODEL_DIR / "schema.json"
    payload = {"model_loaded": len(MODELS) == len(MODEL_NAMES)}
    if metadata_path.exists():
        payload["metadata"] = json.loads(metadata_path.read_text(encoding="utf-8"))
    if schema_path.exists():
        payload["schema"] = json.loads(schema_path.read_text(encoding="utf-8"))
    return payload


@app.post("/predict", response_model=PredictionResponse)
def predict(
    payload: LoanApplication,
    model: str = "logistic_regression",
    request_id: str | None = Header(default=None, alias="X-Request-ID"),
):
    if not MODELS:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if model not in MODELS:
        raise HTTPException(status_code=422, detail={"error": "unknown_model", "available_models": MODEL_NAMES})

    record = pd.DataFrame([payload.model_dump()])
    selected_model = MODELS[model]
    prediction = selected_model.predict(record)[0]
    probability = float(selected_model.predict_proba(record)[0][1])
    return PredictionResponse(
        prediction=int(prediction),
        probability=probability,
        model_name=model,
        request_id=request_id or "req-demo",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
