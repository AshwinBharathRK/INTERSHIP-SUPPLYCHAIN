"""Inventory optimization: EOQ, safety stock, reorder point, ABC, stockout risk."""
import math

from scipy.stats import norm

from worlddata.world import HOLDING_RATE_ANNUAL, ORDERING_COST


def eoq(annual_demand: float, ordering_cost: float, unit_cost: float,
        holding_rate: float = HOLDING_RATE_ANNUAL) -> float:
    holding = max(unit_cost * holding_rate, 0.01)
    return math.sqrt(2 * max(annual_demand, 0) * ordering_cost / holding)


def safety_stock(demand_std: float, lead_time_days: float, service_level: float = 0.95) -> float:
    z = norm.ppf(service_level)
    return z * demand_std * math.sqrt(max(lead_time_days, 0.1))


def reorder_point(avg_daily: float, lead_time_days: float, ss: float) -> float:
    return avg_daily * lead_time_days + ss


def days_of_supply(on_hand: float, avg_daily: float) -> float:
    return on_hand / max(avg_daily, 0.01)


def stockout_probability(on_hand: float, on_order: float, avg_daily: float,
                         demand_std: float, horizon_days: float) -> float:
    """P(demand over horizon > available stock), normal approximation."""
    mu = avg_daily * horizon_days
    sigma = max(demand_std * math.sqrt(max(horizon_days, 0.1)), 0.01)
    available = on_hand + on_order
    return float(1 - norm.cdf((available - mu) / sigma))


def optimize_item(item: dict, mode: str = "sea", service_level: float = 0.95) -> dict:
    """Full optimization bundle for one inventory item with explanation."""
    annual = item["avg_daily_demand"] * 365
    order_cost = ORDERING_COST.get(mode, 420.0)
    q = eoq(annual, order_cost, item["unit_cost"])
    ss = safety_stock(item["demand_std"], item["lead_time_days"], service_level)
    rop = reorder_point(item["avg_daily_demand"], item["lead_time_days"], ss)
    dos = days_of_supply(item["on_hand"], item["avg_daily_demand"])
    p_stockout = stockout_probability(
        item["on_hand"], item.get("on_order", 0), item["avg_daily_demand"],
        item["demand_std"], item["lead_time_days"],
    )
    return {
        "eoq": round(q),
        "safety_stock": round(ss),
        "reorder_point": round(rop),
        "days_of_supply": round(dos, 1),
        "stockout_probability": round(p_stockout, 4),
        "annual_demand": round(annual),
        "explanation": {
            "eoq": f"sqrt(2 x {round(annual)} annual units x ${order_cost} order cost / ${round(item['unit_cost'] * HOLDING_RATE_ANNUAL, 2)} holding cost)",
            "safety_stock": f"z(95%)=1.64 x {item['demand_std']} demand std x sqrt({item['lead_time_days']}d lead time)",
            "reorder_point": f"{item['avg_daily_demand']}/day x {item['lead_time_days']}d lead time + {round(ss)} safety stock",
            "stockout": f"P(demand over {item['lead_time_days']}d lead time > {item['on_hand']} on hand + {item.get('on_order', 0)} on order)",
        },
    }


def abc_analysis(rows: list[dict]) -> list[dict]:
    """Pareto ABC classification by annual revenue.

    rows: [{sku, name, category, annual_revenue, ...}]
    Adds class A (top 80% cum revenue), B (next 15%), C (rest).
    """
    total = sum(r["annual_revenue"] for r in rows) or 1.0
    ranked = sorted(rows, key=lambda r: -r["annual_revenue"])
    cum = 0.0
    out = []
    for r in ranked:
        cum += r["annual_revenue"]
        pct = cum / total
        klass = "A" if pct <= 0.80 else ("B" if pct <= 0.95 else "C")
        out.append({**r, "cum_revenue_pct": round(pct * 100, 1), "abc_class": klass,
                    "revenue_share_pct": round(r["annual_revenue"] / total * 100, 1)})
    return out
