from __future__ import annotations

import math
import os
import datetime as dt
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sklearn.linear_model import LinearRegression


def parse_allowed_origins() -> List[str]:
    raw = os.getenv(
        "AI_ALLOWED_ORIGINS",
        "https://capstone-gchealthlink-git-main-francisemilrosetes-projects.vercel.app,https://gc-healthlink-backend.onrender.com",
    )
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or [
        "https://capstone-gchealthlink-git-main-francisemilrosetes-projects.vercel.app",
        "https://gc-healthlink-backend.onrender.com",
    ]


app = FastAPI(
    title="GCHealthLink AI Service",
    version="1.0.0",
    description="Predictive analytics microservice for outbreak forecasting and resource depletion.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoricalHealthRecord(BaseModel):
    # Use dt.date to avoid annotation name clashes with the `date` field name in Pydantic v2.
    date: dt.date = Field(..., description="Record date in YYYY-MM-DD format")
    illness_category: str = Field(..., min_length=1, max_length=120)
    cases: int = Field(..., ge=0, description="Number of cases for the date/category")

    @field_validator("illness_category", mode="before")
    @classmethod
    def normalize_category(cls, value: object) -> str:
        if not isinstance(value, str):
            raise TypeError("illness_category must be a string")

        normalized = value.strip()
        if not normalized:
            raise ValueError("illness_category cannot be empty")

        return normalized


class OutbreakPredictionRequest(BaseModel):
    historical_data: List[HistoricalHealthRecord] = Field(..., min_length=1)
    forecast_months: int = Field(default=3, ge=1, le=12)


class ResourceInventoryRecord(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=120)
    current_stock: float = Field(..., ge=0)
    daily_usage_rate: float = Field(..., ge=0)
    unit: Optional[str] = Field(default=None, max_length=40)
    reorder_threshold: Optional[float] = Field(default=0, ge=0)

    @field_validator("item_name")
    @classmethod
    def normalize_item_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("unit")
    @classmethod
    def normalize_unit(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ResourcePredictionRequest(BaseModel):
    inventory_data: List[ResourceInventoryRecord] = Field(..., min_length=1)
    horizon_days: int = Field(default=30, ge=1, le=365)


def month_floor(value: pd.Timestamp) -> pd.Timestamp:
    return value.to_period("M").to_timestamp()


def month_key(value: pd.Timestamp) -> str:
    return value.strftime("%Y-%m")


def build_monthly_frame(records: List[HistoricalHealthRecord]) -> pd.DataFrame:
    frame = pd.DataFrame([record.model_dump() for record in records])
    if frame.empty:
        return frame

    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame = frame.dropna(subset=["date", "illness_category", "cases"])
    if frame.empty:
        return frame

    frame["month"] = frame["date"].map(month_floor)

    grouped = (
        frame.groupby(["month", "illness_category"], as_index=False)["cases"]
        .sum()
        .sort_values(["illness_category", "month"])
    )
    return grouped


def forecast_category(monthly_category_frame: pd.DataFrame, forecast_months: int) -> List[Dict[str, Any]]:
    ordered = monthly_category_frame.sort_values("month").reset_index(drop=True)
    y = ordered["cases"].astype(float).to_numpy()

    # Use month index as the time feature for a stable linear trend model.
    x = [[index] for index in range(len(ordered))]

    if len(ordered) >= 2:
        model = LinearRegression()
        model.fit(x, y)
        future_x = [[len(ordered) + offset] for offset in range(forecast_months)]
        predictions = model.predict(future_x)
    else:
        baseline = float(y[-1]) if len(y) else 0.0
        predictions = [baseline for _ in range(forecast_months)]

    last_month = ordered["month"].iloc[-1]
    output: List[Dict[str, Any]] = []

    for offset, predicted in enumerate(predictions, start=1):
        target_month = (last_month + pd.DateOffset(months=offset)).to_period("M").to_timestamp()
        value = max(0, int(round(float(predicted))))
        output.append(
            {
                "month": month_key(target_month),
                "predicted_cases": value,
            }
        )

    return output


def calculate_status(days_to_depletion: Optional[float], horizon_days: int) -> str:
    if days_to_depletion is None:
        return "stable"
    if days_to_depletion <= 7:
        return "critical"
    if days_to_depletion <= horizon_days:
        return "warning"
    return "stable"


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/outbreak")
def predict_outbreak(payload: OutbreakPredictionRequest) -> Dict[str, Any]:
    monthly = build_monthly_frame(payload.historical_data)

    if monthly.empty:
        raise HTTPException(status_code=400, detail="No valid historical_data records were provided.")

    categories = sorted(monthly["illness_category"].unique().tolist())

    category_forecasts: Dict[str, List[Dict[str, Any]]] = {}
    for category in categories:
        category_frame = monthly[monthly["illness_category"] == category]
        category_forecasts[category] = forecast_category(category_frame, payload.forecast_months)

    aggregate: Dict[str, Dict[str, Any]] = {}
    for category, predictions in category_forecasts.items():
        for row in predictions:
            month = row["month"]
            if month not in aggregate:
                aggregate[month] = {
                    "month": month,
                    "total_predicted_cases": 0,
                    "categories": [],
                }

            aggregate[month]["categories"].append(
                {
                    "illness_category": category,
                    "predicted_cases": row["predicted_cases"],
                }
            )
            aggregate[month]["total_predicted_cases"] += row["predicted_cases"]

    forecast = [aggregate[key] for key in sorted(aggregate.keys())]

    min_month = month_key(monthly["month"].min())
    max_month = month_key(monthly["month"].max())

    return {
        "success": True,
        "message": "Outbreak forecast generated successfully.",
        "model": "linear_regression_monthly_trend_v1",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "input_summary": {
            "records_received": len(payload.historical_data),
            "usable_records": int(len(monthly)),
            "historical_total_cases": int(monthly["cases"].sum()),
            "categories": categories,
            "historical_range": {
                "from_month": min_month,
                "to_month": max_month,
            },
            "forecast_months": payload.forecast_months,
        },
        "forecast": forecast,
    }


@app.post("/predict/resources")
def predict_resources(payload: ResourcePredictionRequest) -> Dict[str, Any]:
    at_risk_items: List[Dict[str, Any]] = []
    stable_items: List[Dict[str, Any]] = []

    for item in payload.inventory_data:
        usage = float(item.daily_usage_rate)
        stock = float(item.current_stock)

        days_to_depletion: Optional[float]
        depletion_date: Optional[str]

        if usage <= 0:
            days_to_depletion = None
            depletion_date = None
        else:
            days_to_depletion = stock / usage
            depletion_date = (dt.date.today() + timedelta(days=int(math.floor(days_to_depletion)))).isoformat()

        status = calculate_status(days_to_depletion, payload.horizon_days)

        reorder_target_days = 60
        recommended_restock = 0.0
        if usage > 0:
            recommended_restock = max(0.0, (usage * reorder_target_days) - stock)

        item_result = {
            "item_name": item.item_name,
            "unit": item.unit,
            "current_stock": stock,
            "daily_usage_rate": usage,
            "reorder_threshold": float(item.reorder_threshold or 0),
            "days_to_depletion": None if days_to_depletion is None else round(days_to_depletion, 2),
            "predicted_depletion_date": depletion_date,
            "at_risk_within_horizon": bool(days_to_depletion is not None and days_to_depletion <= payload.horizon_days),
            "recommended_restock_qty": round(recommended_restock, 2),
            "status": status,
        }

        if item_result["at_risk_within_horizon"]:
            at_risk_items.append(item_result)
        else:
            stable_items.append(item_result)

    at_risk_items.sort(
        key=lambda row: float("inf") if row["days_to_depletion"] is None else float(row["days_to_depletion"])
    )

    return {
        "success": True,
        "message": "Resource prediction generated successfully.",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "horizon_days": payload.horizon_days,
        "summary": {
            "total_items": len(payload.inventory_data),
            "at_risk_items": len(at_risk_items),
            "stable_items": len(stable_items),
        },
        "at_risk": at_risk_items,
        "stable": stable_items,
    }
