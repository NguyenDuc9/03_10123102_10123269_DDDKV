import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.impute import SimpleImputer
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = Path(__import__("os").getenv("MODEL_DIR", ROOT / "models"))
NUMERIC_FEATURES = [
    "applicantincome",
    "coapplicantincome",
    "loanamount",
    "loan_amount_term",
    "credit_history",
]
CATEGORICAL_FEATURES = [
    "gender",
    "married",
    "dependents",
    "education",
    "self_employed",
    "property_area",
]
MODEL_FACTORIES = {
    "knn": lambda: KNeighborsClassifier(n_neighbors=5, weights="distance"),
    "logistic_regression": lambda: LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
    "decision_tree": lambda: DecisionTreeClassifier(max_depth=5, class_weight="balanced", random_state=42),
    "naive_bayes": GaussianNB,
}


def build_pipeline(model):
    numeric_transformer = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def train_models(dataset_path=None, model_dir=None):
    dataset_path = Path(dataset_path or DATA_DIR / "dataset.csv")
    model_dir = Path(model_dir or MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    df = df.loc[df["loan_status"].isin(["y", "n"])].copy()
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df["loan_status"].map({"n": 0, "y": 1})

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = {}
    for model_name, factory in MODEL_FACTORIES.items():
        pipeline = build_pipeline(factory())
        pipeline.fit(X_train, y_train)
        predictions = pipeline.predict(X_test)
        results[model_name] = {
            "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        }
        joblib.dump(pipeline, model_dir / f"{model_name}.joblib")
        print(f"{model_name}: {results[model_name]}")

    schema = {
        "features": [
            {"name": "gender", "type": "category", "values": ["male", "female"]},
            {"name": "married", "type": "category", "values": ["yes", "no"]},
            {"name": "dependents", "type": "category", "values": ["0", "1", "2", "3+"]},
            {"name": "education", "type": "category", "values": ["graduate", "not graduate"]},
            {"name": "self_employed", "type": "category", "values": ["yes", "no"]},
            {"name": "applicantincome", "type": "number", "min": 0},
            {"name": "coapplicantincome", "type": "number", "min": 0},
            {"name": "loanamount", "type": "number", "min": 0},
            {"name": "loan_amount_term", "type": "number", "min": 0},
            {"name": "credit_history", "type": "number", "values": [0, 1]},
            {"name": "property_area", "type": "category", "values": ["urban", "semiurban", "rural"]},
        ],
        "target": "loan_status",
        "target_values": {"0": "rejected", "1": "approved"},
    }
    metadata = {
        "problem": "loan_approval",
        "model_version": "1.0.0",
        "dataset": dataset_path.name,
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "training_date": datetime.now(timezone.utc).isoformat(),
        "models": results,
    }
    (model_dir / "schema.json").write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
    (model_dir / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    return metadata


def main():
    train_models()
    print(f"Models and metadata saved to: {MODEL_DIR}")


if __name__ == "__main__":
    main()
