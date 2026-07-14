"""Core platform routes: sim control, KPIs, events, nodes, shipments, inventory, 3D twin."""
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from api.helpers import cache_clear, cache_get, cache_set, get_abc_map, get_sim_time, get_supplier_intel
from ml.inventory import days_of_supply, stockout_probability
from ml.risk import predict_delay

router = APIRouter()


class SpeedBody(BaseModel):
    speed: float


def _db(request: Request):
    return request.app.state.db


@router.get("/health")
async def health(request: Request):
    db = _db(request)
    state = await db.sim_state.find_one({"_id": "state"})
    return {"status": "ok", "sim_running": bool(state and state.get("running")), "service": "supply-chain-digital-twin"}


@router.post("/seed")
async def reseed(request: Request, force: bool = False):
    from engine.seed import seed_database
    result = await seed_database(_db(request), force=force)
    cache_clear()
    return result


# ------------------------------------------------------------- simulation
@router.get("/sim/state")
async def sim_state(request: Request):
    state = await _db(request).sim_state.find_one({"_id": "state"}, {"_id": 0})
    if not state:
        raise HTTPException(404, "Simulation not initialized")
    return state


@router.post("/sim/toggle")
async def sim_toggle(request: Request):
    db = _db(request)
    state = await db.sim_state.find_one({"_id": "state"})
    if not state:
        raise HTTPException(404, "Simulation not initialized")
    running = not state.get("running", True)
    await db.sim_state.update_one({"_id": "state"}, {"$set": {"running": running}})
    return {"running": running}


@router.post("/sim/speed")
async def sim_speed(request: Request, body: SpeedBody):
    speed = max(60.0, min(10080.0, body.speed))
    await _db(request).sim_state.update_one({"_id": "state"}, {"$set": {"speed": speed}})
    return {"speed": speed}


# ------------------------------------------------------------------- KPIs
@router.get("/kpis")
async def kpis(request: Request):
    db = _db(request)
    sim_now = await get_sim_time(db)
    today = sim_now.strftime("%Y-%m-%d")
    d30 = (sim_now - timedelta(days=30)).strftime("%Y-%m-%d")
    d60 = (sim_now - timedelta(days=60)).strftime("%Y-%m-%d")
    d14 = (sim_now - timedelta(days=14)).strftime("%Y-%m-%d")

    inv = await db.inventory.aggregate([
        {"$group": {
            "_id": None,
            "total_value": {"$sum": "$stock_value"},
            "total_units": {"$sum": "$on_hand"},
            "on_order_units": {"$sum": "$on_order"},
            "items": {"$sum": 1},
            "below_rop": {"$sum": {"$cond": [{"$lte": [{"$add": ["$on_hand", "$on_order"]}, "$reorder_point"]}, 1, 0]}},
            "at_risk": {"$sum": {"$cond": [{"$lte": [{"$divide": ["$on_hand", {"$max": ["$avg_daily_demand", 0.01]}]}, 2.0]}, 1, 0]}},
        }},
    ]).to_list(1)
    inv = inv[0] if inv else {}

    ship = await db.shipments.aggregate([
        {"$match": {"status": "in_transit"}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "value": {"$sum": "$value"},
                    "delayed": {"$sum": {"$cond": [{"$gt": ["$delay_hours", 0]}, 1, 0]}}}},
    ]).to_list(1)
    ship = ship[0] if ship else {}

    otd = await db.shipments.aggregate([
        {"$match": {"status": "delivered"}},
        {"$sort": {"delivered_at": -1}},
        {"$limit": 300},
        {"$group": {"_id": None, "on_time": {"$avg": {"$cond": ["$on_time", 1, 0]}}, "count": {"$sum": 1}}},
    ]).to_list(1)
    otd = otd[0] if otd else {}

    rev = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": d60, "$lte": today}}},
        {"$group": {
            "_id": {"$cond": [{"$gte": ["$date", d30]}, "current", "previous"]},
            "revenue": {"$sum": "$revenue"}, "units": {"$sum": "$qty"},
        }},
    ]).to_list(None)
    rev_map = {r["_id"]: r for r in rev}
    rev_cur = rev_map.get("current", {}).get("revenue", 0)
    rev_prev = rev_map.get("previous", {}).get("revenue", 0)

    fill = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": d14}}},
        {"$group": {"_id": None, "fulfilled": {"$sum": "$qty"},
                    "unmet": {"$sum": {"$ifNull": ["$unmet", 0]}}}},
    ]).to_list(1)
    fill = fill[0] if fill else {}
    total_demand = (fill.get("fulfilled", 0) + fill.get("unmet", 0)) or 1

    spark = await db.demand_history.aggregate([
        {"$match": {"date": {"$gte": d30, "$lte": today}}},
        {"$group": {"_id": "$date", "revenue": {"$sum": "$revenue"}, "units": {"$sum": "$qty"}}},
        {"$sort": {"_id": 1}},
    ]).to_list(None)

    open_pos = await db.purchase_orders.count_documents({"status": "in_transit"})
    stockouts_7d = await db.events.count_documents({"type": "stockout"})

    return {
        "sim_time": sim_now.isoformat(),
        "inventory_value": round(inv.get("total_value", 0), 2),
        "inventory_units": inv.get("total_units", 0),
        "on_order_units": inv.get("on_order_units", 0),
        "skus_at_risk": inv.get("at_risk", 0),
        "items_below_rop": inv.get("below_rop", 0),
        "in_transit_count": ship.get("count", 0),
        "in_transit_value": round(ship.get("value", 0), 2),
        "delayed_shipments": ship.get("delayed", 0),
        "on_time_delivery_rate": round(otd.get("on_time", 1.0) * 100, 1),
        "deliveries_analyzed": otd.get("count", 0),
        "revenue_30d": round(rev_cur, 2),
        "revenue_trend_pct": round((rev_cur - rev_prev) / rev_prev * 100, 1) if rev_prev else 0.0,
        "units_30d": rev_map.get("current", {}).get("units", 0),
        "fill_rate": round(fill.get("fulfilled", 0) / total_demand * 100, 1),
        "open_purchase_orders": open_pos,
        "stockout_events": stockouts_7d,
        "revenue_sparkline": [{"date": s["_id"], "revenue": round(s["revenue"], 2), "units": s["units"]} for s in spark],
    }


# ----------------------------------------------------------------- events
@router.get("/events")
async def events(request: Request, limit: int = Query(50, le=200), severity: str | None = None):
    q = {"severity": severity} if severity else {}
    rows = await _db(request).events.find(q, {"_id": 0}).sort("ts", -1).limit(limit).to_list(limit)
    return rows


# ------------------------------------------------------------------ nodes
@router.get("/products")
async def products(request: Request):
    rows = await _db(request).products.find({}, {"_id": 0}).to_list(None)
    rows.sort(key=lambda p: p["sku"])
    return rows


@router.get("/nodes")
async def nodes(request: Request, node_type: str | None = None):
    q = {"node_type": node_type} if node_type else {}
    return await _db(request).nodes.find(q, {"_id": 0}).to_list(None)


@router.get("/lanes")
async def lanes(request: Request):
    cached = cache_get("lanes", 300)
    if cached is not None:
        return cached
    rows = await _db(request).lanes.find({}, {"_id": 0}).to_list(None)
    cache_set("lanes", rows)
    return rows


# -------------------------------------------------------------- shipments
@router.get("/shipments")
async def shipments(request: Request, status: str | None = None, mode: str | None = None,
                    limit: int = Query(100, le=400)):
    db = _db(request)
    q: dict = {}
    if status:
        q["status"] = status
    if mode:
        q["mode"] = mode
    rows = await db.shipments.find(q, {"_id": 0}).sort("departed_at", -1).limit(limit).to_list(limit)

    intel = {s["code"]: s for s in await get_supplier_intel(db)}
    for s in rows:
        if s["status"] == "in_transit":
            sup = intel.get(s["supplier_code"])
            if sup:
                s["delay_prediction"] = predict_delay(
                    s, sup["metrics"]["on_time_rate"], sup["metrics"]["avg_delay_hours"])
    return rows


@router.get("/shipments/{shipment_id}")
async def shipment_detail(request: Request, shipment_id: str):
    db = _db(request)
    s = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Shipment not found")
    lane = await db.lanes.find_one({"id": s["lane_id"]}, {"_id": 0})
    s["waypoints"] = lane["waypoints"] if lane else []
    po = await db.purchase_orders.find_one({"id": s["po_id"]}, {"_id": 0})
    s["purchase_order"] = po
    intel = {x["code"]: x for x in await get_supplier_intel(db)}
    sup = intel.get(s["supplier_code"])
    if s["status"] == "in_transit" and sup:
        s["delay_prediction"] = predict_delay(s, sup["metrics"]["on_time_rate"], sup["metrics"]["avg_delay_hours"])
    return s


# -------------------------------------------------------------- inventory
@router.get("/inventory")
async def inventory(request: Request, warehouse: str | None = None, search: str | None = None,
                    abc: str | None = None, sort: str = "risk", limit: int = Query(200, le=500)):
    db = _db(request)
    q: dict = {}
    if warehouse:
        q["warehouse_code"] = warehouse
    if search:
        q["sku"] = {"$regex": search, "$options": "i"}
    rows = await db.inventory.find(q, {"_id": 0}).to_list(None)

    products = {p["id"]: p async for p in db.products.find({}, {"_id": 0})}
    abc_map = await get_abc_map(db)

    out = []
    for r in rows:
        p = products.get(r["product_id"], {})
        if search and search.lower() not in r["sku"].lower() and search.lower() not in p.get("name", "").lower():
            continue
        dos = days_of_supply(r["on_hand"], r["avg_daily_demand"])
        p_so = stockout_probability(r["on_hand"], r["on_order"], r["avg_daily_demand"], r["demand_std"], r["lead_time_days"])
        klass = abc_map.get(r["sku"], {}).get("abc_class", "C")
        if abc and klass != abc:
            continue
        status = "critical" if (r["on_hand"] == 0 or dos <= 2.0) else (
            "low" if (dos <= 7.0 or r["on_hand"] + r["on_order"] <= r["reorder_point"]) else "healthy")
        out.append({
            **r,
            "product_name": p.get("name", r["sku"]),
            "category": p.get("category", ""),
            "unit_price": p.get("unit_price", 0),
            "days_of_supply": round(dos, 1),
            "stockout_probability": round(p_so, 3),
            "abc_class": klass,
            "status": status,
        })

    if sort == "risk":
        out.sort(key=lambda x: -x["stockout_probability"])
    elif sort == "value":
        out.sort(key=lambda x: -x["stock_value"])
    elif sort == "dos":
        out.sort(key=lambda x: x["days_of_supply"])
    return out[:limit]


@router.get("/inventory/summary")
async def inventory_summary(request: Request):
    db = _db(request)
    rows = await db.inventory.find({}, {"_id": 0}).to_list(None)
    total_value = sum(r["stock_value"] for r in rows)
    dos_all = [days_of_supply(r["on_hand"], r["avg_daily_demand"]) for r in rows]
    high_risk = sum(1 for r in rows if (r["on_hand"] == 0 or days_of_supply(r["on_hand"], r["avg_daily_demand"]) <= 2.0))
    return {
        "total_value": round(total_value, 2),
        "total_units": sum(r["on_hand"] for r in rows),
        "avg_days_of_supply": round(sum(dos_all) / max(len(dos_all), 1), 1),
        "high_risk_items": high_risk,
        "items": len(rows),
    }


# ------------------------------------------------------------- warehouses
@router.get("/warehouses")
async def warehouses(request: Request):
    db = _db(request)
    whs = await db.nodes.find({"node_type": "warehouse"}, {"_id": 0}).to_list(None)
    inv = await db.inventory.aggregate([
        {"$group": {"_id": "$warehouse_code", "units": {"$sum": "$on_hand"},
                    "value": {"$sum": "$stock_value"}, "skus": {"$sum": 1},
                    "on_order": {"$sum": "$on_order"}}},
    ]).to_list(None)
    inv_map = {i["_id"]: i for i in inv}
    inbound = await db.shipments.aggregate([
        {"$match": {"status": "in_transit"}},
        {"$group": {"_id": "$warehouse_code", "count": {"$sum": 1}}},
    ]).to_list(None)
    inbound_map = {i["_id"]: i["count"] for i in inbound}
    out = []
    for w in whs:
        i = inv_map.get(w["code"], {})
        units = i.get("units", 0)
        out.append({
            **w,
            "units": units, "stock_value": round(i.get("value", 0), 2),
            "skus": i.get("skus", 0), "on_order": i.get("on_order", 0),
            "inbound_shipments": inbound_map.get(w["code"], 0),
            "utilization_pct": round(min(units / w["capacity"], 1.0) * 100, 1),
        })
    return out


@router.get("/warehouses/{code}/threed")
async def warehouse_threed(request: Request, code: str):
    """Rack/bin layout for the 3D digital twin, bound to live inventory."""
    db = _db(request)
    wh = await db.nodes.find_one({"node_type": "warehouse", "code": code}, {"_id": 0})
    if not wh:
        raise HTTPException(404, "Warehouse not found")
    rows = await db.inventory.find({"warehouse_code": code}, {"_id": 0}).to_list(None)
    products = {p["id"]: p async for p in db.products.find({}, {"_id": 0})}
    rows.sort(key=lambda r: r["sku"])

    racks = []
    cols = 6
    for idx, r in enumerate(rows):
        p = products.get(r["product_id"], {})
        capacity = max(r["reorder_point"] + r["eoq"], r["on_hand"], 1)
        fill = min(r["on_hand"] / capacity, 1.0)
        dos = days_of_supply(r["on_hand"], r["avg_daily_demand"])
        status = "critical" if (r["on_hand"] == 0 or dos <= 2.0) else (
            "low" if (dos <= 7.0 or r["on_hand"] + r["on_order"] <= r["reorder_point"]) else "healthy")
        racks.append({
            "rack_id": f"R{idx + 1:02d}",
            "row": idx // cols, "col": idx % cols,
            "sku": r["sku"], "product_name": p.get("name", r["sku"]),
            "category": p.get("category", ""),
            "on_hand": r["on_hand"], "on_order": r["on_order"],
            "capacity": int(capacity), "fill_pct": round(fill, 3),
            "days_of_supply": round(dos, 1),
            "safety_stock": r["safety_stock"], "reorder_point": r["reorder_point"],
            "stock_value": r["stock_value"], "status": status,
        })
    return {
        "warehouse": wh,
        "racks": racks,
        "levels": 4, "slots_per_level": 6,
        "summary": {
            "total_units": sum(r["on_hand"] for r in rows),
            "total_value": round(sum(r["stock_value"] for r in rows), 2),
            "critical": sum(1 for r in racks if r["status"] == "critical"),
            "low": sum(1 for r in racks if r["status"] == "low"),
        },
    }
