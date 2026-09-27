import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Literal

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from pymongo import MongoClient
from pymongo.errors import PyMongoError

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8001")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://mongodb:27017")

app = FastAPI(title="Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1000)
db = client.get_database("demo_app")
history_collection = db.get_collection("history")


class FeaturePayload(BaseModel):
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


class PredictRequest(BaseModel):
    features: FeaturePayload
    model: Literal["knn", "logistic_regression", "decision_tree", "naive_bayes"] = "logistic_regression"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend",
        "ai_service_url": AI_SERVICE_URL,
        "mongodb_uri": MONGODB_URI,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/predict")
def predict(payload: PredictRequest):
    request_id = os.urandom(4).hex()
    payload_data = payload.features.model_dump()

    try:
        ai_response = requests.post(
            f"{AI_SERVICE_URL}/predict",
            json=payload_data,
            params={"model": payload.model},
            headers={"X-Request-ID": request_id},
            timeout=15,
        )
        ai_response.raise_for_status()
        result = ai_response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail={"error": "ai_service_unreachable", "message": str(exc)})

    record = {
        "request_id": request_id,
        "input": payload_data,
        "output": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        history_collection.insert_one(record)
    except PyMongoError as exc:
        logger.warning("Could not save prediction history: %s", exc)

    return {
        "prediction": result.get("prediction"),
        "probability": result.get("probability"),
        "model_name": result.get("model_name"),
        "model_version": result.get("model_version"),
        "request_id": request_id,
    }


@app.get("/api/history")
def history():
    try:
        items = list(history_collection.find({}, {"_id": 0}).limit(20))
    except PyMongoError as exc:
        logger.warning("Could not load prediction history: %s", exc)
        items = []
    return {"items": items}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
