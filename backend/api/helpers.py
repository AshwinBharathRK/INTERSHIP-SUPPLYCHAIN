"""Shared API helpers: TTL caching, supplier intelligence, CSV responses."""
import io
import time
from datetime import datetime, timedelta, timezone

from fastapi.responses import StreamingResponse

from ml.risk import compute_supplier_metrics, supplier_risk

_cache: dict[str, tuple[float, object]] = {}


def cache_get(key: str, ttl: float):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    return None


def cache_set(key: str, value):
    _cache[key] = (time.time(), value)


def cache_clear():
    _cache.clear()


async def get_sim_time(db) -> datetime:
    state = await db.sim_state.find_one({"_id": "state"})
    if state:
        dt = datetime.fromisoformat(state["sim_time"])
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


async def get_supplier_intel(db) -> list[dict]:
    """Computed supplier performance + risk from real shipment/PO history. Cached 30s."""
    cached = cache_get("supplier_intel", 30)
    if cached is not None:
        return cached

    suppliers = await db.nodes.find({"node_type": "supplier"}, {"_id": 0}).to_list(None)
    products = await db.products.find({}, {"_id": 0}).to_list(None)

    # single-source analysis
    single_source: dict[str, int] = {}
    supplied: dict[str, set] = {}
    for p in products:
        for sc in p["suppliers"]:
            supplied.setdefault(sc, set()).add(p["sku"])
        if len(p["suppliers"]) == 1:
            single_source[p["suppliers"][0]] = single_source.get(p["suppliers"][0], 0) + 1

    ship_agg: dict[str, list] = {}
    async for s in db.shipments.find({}, {"_id": 0, "status": 1, "on_time": 1, "actual_hours": 1, "planned_hours": 1, "delay_hours": 1, "supplier_code": 1, "value": 1}):
        ship_agg.setdefault(s["supplier_code"], []).append(s)
    po_agg: dict[str, list] = {}
    async for p in db.purchase_orders.find({}, {"_id": 0, "qty": 1, "defect_qty": 1, "supplier_code": 1, "total_cost": 1}):
        po_agg.setdefault(p["supplier_code"], []).append(p)

    intel = []
    for sup in suppliers:
        code = sup["code"]
        ships = ship_agg.get(code, [])
        pos = po_agg.get(code, [])
        metrics = compute_supplier_metrics(
            ships, pos, sup["geo_risk"], single_source.get(code, 0), len(supplied.get(code, [])) or 1,
        )
        risk = supplier_risk(metrics)
        intel.append({
            "id": sup["id"], "code": code, "name": sup["name"],
            "city": sup["city"], "country": sup["country"], "region": sup["region"],
            "lon": sup["lon"], "lat": sup["lat"],
            "skus": sorted(supplied.get(code, [])),
            "total_spend": round(sum(p.get("total_cost", 0) for p in pos), 2),
            "active_shipments": sum(1 for s in ships if s.get("status") == "in_transit"),
            "metrics": metrics,
            "risk": risk,
        })
    intel.sort(key=lambda x: -x["risk"]["score"])
    cache_set("supplier_intel", intel)
    return intel


async def get_abc_map(db) -> dict:
    """SKU -> abc class + revenue, from full demand history. Cached 120s."""
    cached = cache_get("abc_map", 120)
    if cached is not None:
        return cached
    from ml.inventory import abc_analysis

    sim_now = await get_sim_time(db)
    cutoff = (sim_now - timedelta(days=365)).strftime("%Y-%m-%d")
    agg = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {"_id": "$sku", "annual_revenue": {"$sum": "$revenue"}, "annual_units": {"$sum": "$qty"}}},
    ]).to_list(None)
    rows = abc_analysis([{"sku": a["_id"], "annual_revenue": round(a["annual_revenue"], 2), "annual_units": a["annual_units"]} for a in agg])
    result = {r["sku"]: r for r in rows}
    cache_set("abc_map", result)
    return result


def csv_response(rows: list[dict], columns: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    buf.write(",".join(columns) + "\n")
    for r in rows:
        vals = []
        for c in columns:
            v = r.get(c, "")
            s = str(v).replace('"', "'")
            vals.append(f'"{s}"' if ("," in s or "\n" in s) else s)
        buf.write(",".join(vals) + "\n")
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
