"""Analytics & ML routes: forecasting, risk, ABC, sankey, heatmap, network, exports."""
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query, Request

from api.helpers import cache_get, cache_set, csv_response, get_abc_map, get_sim_time, get_supplier_intel
from ml.forecast import forecast_series
from ml.inventory import optimize_item
# MARKETS import removed to support dynamic database-driven markets

router = APIRouter()


def _db(request: Request):
    return request.app.state.db


# --------------------------------------------------------------- forecast
@router.get("/ml/forecast")
async def ml_forecast(request: Request, product_id: str, warehouse_id: str | None = None,
                      horizon: int = Query(30, ge=7, le=90)):
    db = _db(request)
    key = f"fc:{product_id}:{warehouse_id}:{horizon}"
    cached = cache_get(key, 60)
    if cached is not None:
        return cached

    match: dict = {"product_id": product_id}
    if warehouse_id:
        match["warehouse_id"] = warehouse_id
    agg = await db.demand_history.aggregate([
        {"$match": match},
        {"$group": {"_id": "$date", "qty": {"$sum": "$qty"}, "revenue": {"$sum": "$revenue"}}},
        {"$sort": {"_id": 1}},
    ]).to_list(None)
    if len(agg) < 30:
        raise HTTPException(404, "Not enough demand history for this selection")

    fc = forecast_series([a["_id"] for a in agg], [a["qty"] for a in agg], horizon=horizon)
    history = [{"date": a["_id"], "qty": a["qty"], "revenue": round(a["revenue"], 2)} for a in agg[-120:]]
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    result = {"product": product, "warehouse_id": warehouse_id, "history": history, **fc}
    cache_set(key, result)
    return result


# ------------------------------------------------------------------- risk
@router.get("/ml/risk")
async def ml_risk(request: Request):
    return await get_supplier_intel(_db(request))


# ----------------------------------------------------------- optimization
@router.get("/ml/optimization")
async def ml_optimization(request: Request, sku: str, warehouse: str):
    db = _db(request)
    item = await db.inventory.find_one({"sku": sku, "warehouse_code": warehouse}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Inventory item not found")
    product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
    lane = await db.lanes.find_one(
        {"supplier_code": product["suppliers"][0], "warehouse_code": warehouse}, {"_id": 0, "waypoints": 0})
    mode = lane["mode"] if lane else "sea"
    opt = optimize_item(item, mode=mode)
    return {"item": item, "product": product, "mode": mode, "optimization": opt}


# -------------------------------------------------------------- analytics
@router.get("/analytics/abc")
async def analytics_abc(request: Request):
    db = _db(request)
    abc_map = await get_abc_map(db)
    products = {p["sku"]: p async for p in db.products.find({}, {"_id": 0})}
    out = []
    for sku, row in abc_map.items():
        p = products.get(sku, {})
        out.append({**row, "name": p.get("name", sku), "category": p.get("category", ""),
                    "unit_price": p.get("unit_price", 0)})
    out.sort(key=lambda x: -x["annual_revenue"])
    return out


@router.get("/analytics/sankey")
async def analytics_sankey(request: Request):
    db = _db(request)
    cached = cache_get("sankey", 60)
    if cached is not None:
        return cached

    sup_wh = await db.shipments.aggregate([
        {"$group": {"_id": {"s": "$supplier_code", "w": "$warehouse_code"},
                    "value": {"$sum": "$value"}, "count": {"$sum": 1}}},
        {"$sort": {"value": -1}},
        {"$limit": 40},
    ]).to_list(None)

    sim_now = await get_sim_time(db)
    d60 = (sim_now - timedelta(days=60)).strftime("%Y-%m-%d")
    wh_rev = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": d60}}},
        {"$group": {"_id": "$warehouse_code", "revenue": {"$sum": "$revenue"}}},
    ]).to_list(None)

    # allocate warehouse revenue to the markets they serve (by market weight)
    served: dict[str, list] = {}
    db_markets = await db.nodes.find({"node_type": "market"}, {"_id": 0}).to_list(None)
    for m in db_markets:
        served.setdefault(m["served_by"], []).append(m)

    links = [{"source": r["_id"]["s"], "target": r["_id"]["w"],
              "value": round(r["value"], 2), "count": r["count"], "kind": "inbound"} for r in sup_wh]
    for wr in wh_rev:
        markets = served.get(wr["_id"], [])
        total_w = sum(m["weight"] for m in markets) or 1
        for m in markets:
            links.append({"source": wr["_id"], "target": m["code"],
                          "value": round(wr["revenue"] * m["weight"] / total_w, 2),
                          "count": None, "kind": "outbound"})

    node_names = sorted({x for link in links for x in (link["source"], link["target"])})
    result = {"nodes": [{"name": n} for n in node_names], "links": links}
    cache_set("sankey", result)
    return result


@router.get("/analytics/heatmap")
async def analytics_heatmap(request: Request, dim: str = "category"):
    db = _db(request)
    key = f"heatmap:{dim}"
    cached = cache_get(key, 120)
    if cached is not None:
        return cached

    products = {p["sku"]: p async for p in db.products.find({}, {"_id": 0})}
    agg = await db.demand_history.aggregate([
        {"$group": {"_id": {"sku": "$sku", "month": {"$substr": ["$date", 5, 2]}},
                    "qty": {"$sum": "$qty"}, "days": {"$addToSet": "$date"}}},
    ]).to_list(None)

    cells: dict[tuple, float] = {}
    for a in agg:
        sku = a["_id"]["sku"]
        month = int(a["_id"]["month"])
        row_key = products.get(sku, {}).get("category", "Other") if dim == "category" else sku
        avg_daily = a["qty"] / max(len(a["days"]), 1)
        cells[(row_key, month)] = cells.get((row_key, month), 0) + avg_daily

    row_labels = sorted({k[0] for k in cells})
    data = [{"row": r, "month": m, "value": round(cells.get((r, m), 0), 1)}
            for r in row_labels for m in range(1, 13)]
    result = {"rows": row_labels, "data": data}
    cache_set(key, result)
    return result


@router.get("/analytics/network")
async def analytics_network(request: Request):
    db = _db(request)
    cached = cache_get("network_graph", 60)
    if cached is not None:
        return cached
    nodes = await db.nodes.find({}, {"_id": 0}).to_list(None)
    intel = {s["code"]: s for s in await get_supplier_intel(db)}
    lane_agg = await db.shipments.aggregate([
        {"$group": {"_id": {"s": "$supplier_code", "w": "$warehouse_code"},
                    "count": {"$sum": 1}, "value": {"$sum": "$value"},
                    "active": {"$sum": {"$cond": [{"$eq": ["$status", "in_transit"]}, 1, 0]}}}},
    ]).to_list(None)

    g_nodes = []
    for n in nodes:
        item = {"id": n["code"], "name": n["name"], "type": n["node_type"], "region": n["region"]}
        if n["node_type"] == "supplier" and n["code"] in intel:
            item["risk"] = intel[n["code"]]["risk"]["score"]
        g_nodes.append(item)
    g_links = [{"source": a["_id"]["s"], "target": a["_id"]["w"], "count": a["count"],
                "value": round(a["value"], 2), "active": a["active"]} for a in lane_agg]
    db_markets = await db.nodes.find({"node_type": "market"}, {"_id": 0}).to_list(None)
    for m in db_markets:
        g_links.append({"source": m["served_by"], "target": m["code"], "count": None,
                        "value": None, "active": 0, "kind": "distribution"})
    result = {"nodes": g_nodes, "links": g_links}
    cache_set("network_graph", result)
    return result


@router.get("/analytics/revenue")
async def analytics_revenue(request: Request, days: int = Query(90, le=400), by: str = "total"):
    db = _db(request)
    sim_now = await get_sim_time(db)
    cutoff = (sim_now - timedelta(days=days)).strftime("%Y-%m-%d")
    group_id = {"date": "$date"}
    if by == "warehouse":
        group_id["warehouse"] = "$warehouse_code"
    agg = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {"_id": group_id, "revenue": {"$sum": "$revenue"}, "units": {"$sum": "$qty"}}},
        {"$sort": {"_id.date": 1}},
    ]).to_list(None)
    return [{"date": a["_id"]["date"], "warehouse": a["_id"].get("warehouse"),
             "revenue": round(a["revenue"], 2), "units": a["units"]} for a in agg]


# ---------------------------------------------------------------- exports
@router.get("/export/{kind}")
async def export_csv(request: Request, kind: str):
    db = _db(request)
    if kind == "inventory":
        rows = await db.inventory.find({}, {"_id": 0}).to_list(None)
        cols = ["sku", "warehouse_code", "on_hand", "on_order", "safety_stock", "reorder_point",
                "eoq", "avg_daily_demand", "lead_time_days", "unit_cost", "stock_value"]
        return csv_response(rows, cols, "inventory_export.csv")
    if kind == "shipments":
        rows = await db.shipments.find({}, {"_id": 0}).sort("departed_at", -1).limit(500).to_list(500)
        cols = ["id", "sku", "supplier_code", "warehouse_code", "mode", "carrier", "qty", "value",
                "status", "progress", "departed_at", "eta", "delivered_at", "delay_hours", "on_time"]
        return csv_response(rows, cols, "shipments_export.csv")
    if kind == "suppliers":
        intel = await get_supplier_intel(db)
        rows = [{
            "code": s["code"], "name": s["name"], "country": s["country"],
            "risk_score": s["risk"]["score"], "risk_level": s["risk"]["level"],
            "on_time_rate": s["metrics"]["on_time_rate"], "defect_rate": s["metrics"]["defect_rate"],
            "lead_time_cv": s["metrics"]["lead_time_cv"], "total_spend": s["total_spend"],
            "skus": ";".join(s["skus"]),
        } for s in intel]
        cols = ["code", "name", "country", "risk_score", "risk_level", "on_time_rate",
                "defect_rate", "lead_time_cv", "total_spend", "skus"]
        return csv_response(rows, cols, "suppliers_export.csv")
    if kind == "events":
        rows = await db.events.find({}, {"_id": 0}).sort("ts", -1).limit(500).to_list(500)
        cols = ["ts", "type", "severity", "title", "description"]
        return csv_response(rows, cols, "events_export.csv")
    raise HTTPException(404, "Unknown export kind")
