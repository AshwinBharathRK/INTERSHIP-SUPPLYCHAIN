"""Supplier risk scoring and shipment delay prediction (explainable)."""
import math

import numpy as np

RISK_WEIGHTS = {
    "on_time": 0.34,
    "defects": 0.22,
    "lead_variance": 0.18,
    "geo": 0.16,
    "concentration": 0.10,
}


def supplier_risk(metrics: dict) -> dict:
    """Compute 0-100 risk score from computed supplier performance metrics.

    metrics: {on_time_rate, defect_rate, lead_time_cv, geo_risk, single_source_skus, total_skus}
    """
    otd_risk = max(0.0, min(1.0, (1.0 - metrics["on_time_rate"]) / 0.30))
    defect_risk = max(0.0, min(1.0, metrics["defect_rate"] / 0.04))
    lt_risk = max(0.0, min(1.0, metrics["lead_time_cv"] / 0.35))
    geo = max(0.0, min(1.0, metrics.get("geo_risk", 0.3)))
    conc = max(0.0, min(1.0, metrics.get("single_source_skus", 0) / max(metrics.get("total_skus", 1), 1)))

    factors = {
        "on_time": round(otd_risk * 100, 1),
        "defects": round(defect_risk * 100, 1),
        "lead_variance": round(lt_risk * 100, 1),
        "geo": round(geo * 100, 1),
        "concentration": round(conc * 100, 1),
    }
    score = sum(factors[k] * RISK_WEIGHTS[k] for k in RISK_WEIGHTS)
    level = "low" if score < 30 else ("medium" if score < 55 else "high")
    contributions = {k: round(factors[k] * RISK_WEIGHTS[k], 1) for k in RISK_WEIGHTS}
    top = max(contributions, key=contributions.get)
    labels = {
        "on_time": "on-time delivery performance",
        "defects": "quality defect rate",
        "lead_variance": "lead time variability",
        "geo": "geopolitical exposure",
        "concentration": "single-source dependency",
    }
    return {
        "score": round(score, 1),
        "level": level,
        "factors": factors,
        "weights": RISK_WEIGHTS,
        "contributions": contributions,
        "primary_driver": labels[top],
    }


def compute_supplier_metrics(shipments: list[dict], pos: list[dict], geo_risk: float,
                             single_source_skus: int, total_skus: int) -> dict:
    """Derive performance metrics from delivered shipment/PO history (real data)."""
    delivered = [s for s in shipments if s.get("status") == "delivered"]
    if not delivered:
        return {
            "on_time_rate": 0.9, "defect_rate": 0.01, "lead_time_cv": 0.1,
            "geo_risk": geo_risk, "single_source_skus": single_source_skus,
            "total_skus": total_skus, "shipments_analyzed": 0,
            "avg_delay_hours": 0.0,
        }
    on_time = sum(1 for s in delivered if s.get("on_time")) / len(delivered)
    ratios = [s["actual_hours"] / s["planned_hours"] for s in delivered if s.get("actual_hours") and s.get("planned_hours")]
    lt_cv = float(np.std(ratios) / max(np.mean(ratios), 0.01)) if ratios else 0.1
    total_qty = sum(p.get("qty", 0) for p in pos) or 1
    defect_rate = sum(p.get("defect_qty", 0) for p in pos) / total_qty
    avg_delay = float(np.mean([s.get("delay_hours", 0) for s in delivered]))
    return {
        "on_time_rate": round(on_time, 3),
        "defect_rate": round(defect_rate, 4),
        "lead_time_cv": round(lt_cv, 3),
        "geo_risk": geo_risk,
        "single_source_skus": single_source_skus,
        "total_skus": total_skus,
        "shipments_analyzed": len(delivered),
        "avg_delay_hours": round(avg_delay, 1),
    }


def predict_delay(shipment: dict, supplier_on_time_rate: float, supplier_avg_delay_h: float) -> dict:
    """Probability a live shipment arrives late + expected delay (explainable)."""
    base = 1.0 - supplier_on_time_rate
    mode_factor = {"sea": 1.25, "air": 0.7, "road": 0.9}.get(shipment.get("mode", "sea"), 1.0)
    progress = shipment.get("progress", 0.0)
    already_delayed = shipment.get("delay_hours", 0.0) > 0
    p = base * mode_factor
    if already_delayed:
        p = min(0.97, p + 0.45)
    # less remaining distance -> less residual uncertainty
    p *= (1.0 - 0.35 * progress)
    p = max(0.02, min(0.97, p))
    expected_delay = shipment.get("delay_hours", 0.0) + p * max(supplier_avg_delay_h, 4.0)
    risk_level = "low" if p < 0.25 else ("medium" if p < 0.55 else "high")
    return {
        "delay_probability": round(p, 3),
        "expected_delay_hours": round(expected_delay, 1),
        "risk_level": risk_level,
        "drivers": {
            "supplier_on_time_rate": supplier_on_time_rate,
            "mode_factor": mode_factor,
            "already_delayed": already_delayed,
            "progress": round(progress, 2),
        },
    }
