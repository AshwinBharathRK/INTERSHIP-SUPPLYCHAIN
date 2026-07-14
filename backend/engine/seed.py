"""Deterministic seed generator using the real USAID SCMS delivery history dataset.

Generates 15 months of daily demand history with statistical signal,
completed shipment history, live inventory positions, and an initial fleet
of in-transit shipments for the USAID dataset.
"""
import csv
import uuid
import hashlib
from pathlib import Path
from datetime import datetime, timedelta, timezone
import numpy as np

from core.db import ensure_indexes
from core.geo import position_along_path

SEED_VERSION = 5
HISTORY_DAYS = 456  # ~15 months

WEEKDAY_FACTOR = [1.06, 1.02, 1.0, 1.01, 1.12, 0.78, 0.68]

def annual_seasonality(day_of_year: int, q4_lift: float) -> float:
    """Smooth annual curve peaking in Q4 (holiday) with a small mid-year bump."""
    x = day_of_year / 365.0
    q4 = np.exp(-0.5 * ((x - 0.90) / 0.07) ** 2) * (q4_lift - 1.0)
    summer = np.exp(-0.5 * ((x - 0.55) / 0.10) ** 2) * 0.15
    jan_dip = -np.exp(-0.5 * ((x - 0.05) / 0.05) ** 2) * 0.18
    return 1.0 + q4 + summer + jan_dip

COORDINATES = {
    "Côte d'Ivoire": [6.8276, -5.2796],
    "Vietnam": [21.0285, 105.8542],
    "Nigeria": [9.0820, 7.4913],
    "Zambia": [-15.3875, 28.3228],
    "Tanzania": [-6.1630, 35.7516],
    "Haiti": [18.5392, -72.3350],
    "Zimbabwe": [-17.8252, 31.0530],
    "Ethiopia": [9.0192, 38.7468],
    "South Africa": [-25.7479, 28.2293],
    "Guyana": [6.8013, -58.1551],
    "Rwanda": [-1.9403, 30.0619],
    "Mozambique": [-25.9692, 32.5732],
    "Botswana": [-24.6282, 25.9231],
    "Namibia": [-22.5609, 17.0658],
    "India": [28.6139, 77.2090],
    "Germany": [52.5200, 13.4050],
    "USA": [37.0902, -95.7129],
    "France": [46.2276, 2.2137],
    "UK": [55.3781, -3.4360],
    "Canada": [56.1304, -106.3468],
    "Australia": [-25.2744, 133.7751],
    "Japan": [36.2048, 138.2529],
    "Thailand": [15.8700, 100.9925],
    "Korea": [35.9078, 127.7669],
}

CARRIERS = {
    "air": ["FedEx Express", "UPS Air Cargo", "DHL Aviation", "Cathay Cargo", "Lufthansa Cargo"],
    "road": ["Schneider National", "J.B. Hunt", "DSV Road", "XPO Logistics", "DB Schenker"],
    "sea": ["Maersk Line", "MSC", "CMA CGM", "COSCO Shipping", "Hapag-Lloyd", "Evergreen Marine"],
}

def parse_date(date_str):
    if not date_str or "Captured" in date_str or "Process" in date_str or date_str == "N/A" or date_str == "":
        return None
    for fmt in ("%d-%b-%y", "%m/%d/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None

def parse_float(val):
    try:
        cleaned = val.replace("$", "").replace(",", "").strip()
        return float(cleaned)
    except ValueError:
        return 0.0

def parse_int(val):
    try:
        cleaned = val.replace(",", "").strip()
        return int(cleaned)
    except ValueError:
        return 0

def get_lat_lon(loc_name):
    for name, coords in COORDINATES.items():
        if name.lower() in loc_name.lower():
            return coords[1], coords[0]  # Return [lon, lat]
    return 10.0, 20.0

def det_hash(val, max_val=10000):
    return int(hashlib.md5(val.encode('utf-8')).hexdigest(), 16) % max_val

def map_mode(mode_str):
    mode_lower = mode_str.lower()
    if "air" in mode_lower:
        return "air"
    elif "truck" in mode_lower or "road" in mode_lower:
        return "road"
    elif "ocean" in mode_lower or "sea" in mode_lower:
        return "sea"
    else:
        return "air"  # default standard mode

def _uid() -> str:
    return str(uuid.uuid4())

async def seed_database(db, force: bool = False) -> dict:
    """Idempotent seed from SCMS dataset. Returns summary counts."""
    meta = await db.meta.find_one({"_id": "seed"})
    if meta and meta.get("version") == SEED_VERSION and not force:
        return {"status": "already_seeded", "version": SEED_VERSION}

    csv_path = Path(__file__).parent.parent / "data" / "SCMS_Delivery_History_Dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"SCMS dataset CSV not found at {csv_path}")

    for col in (
        "nodes", "products", "lanes", "demand_history", "inventory",
        "shipments", "purchase_orders", "events", "sim_state", "chat_messages",
    ):
        await db[col].delete_many({})

    nodes = {}
    products = {}
    lanes = {}
    shipments = []
    purchase_orders = []
    events = []
    
    # Read rows from CSV to parse entities
    csv_rows = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_rows.append(row)
            if len(csv_rows) >= 4000:
                break

    print(f"Parsing {len(csv_rows)} rows from SCMS CSV...")
    rng = np.random.default_rng(42)
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Populate Nodes & Products
    for row in csv_rows:
        vendor = row.get("Vendor", "Generic Vendor").strip()
        factory = row.get("Manufacturing Site", "Generic Factory").strip()
        country = row.get("Country", "Generic Location").strip()
        prod_name = row.get("Item Description", "Generic Item").strip()
        category = row.get("Product Group", "Generic Group").strip()
        pack_price = parse_float(row.get("Pack Price", "0.0"))
        unit_price = parse_float(row.get("Unit Price", "0.0"))

        # Vendor -> Supplier
        sup_code = f"SUP-{det_hash(vendor):04d}"
        if sup_code not in nodes:
            lon, lat = get_lat_lon(factory if factory != "Not Applicable" else vendor)
            reliability_bias = 0.85 + (det_hash(vendor) % 15) / 100.0
            defect_bias = 0.005 + (det_hash(vendor) % 25) / 1000.0
            geo_risk = 0.35 if "india" in factory.lower() else 0.15
            nodes[sup_code] = {
                "id": _uid(),
                "node_type": "supplier",
                "code": sup_code,
                "name": vendor,
                "city": factory.split(",")[-1].strip() if "," in factory else "Global Site",
                "country": "India" if "india" in factory.lower() else "Global",
                "region": "south_asia" if "india" in factory.lower() else "global",
                "lat": lat,
                "lon": lon,
                "reliability_bias": reliability_bias,
                "defect_bias": defect_bias,
                "geo_risk": geo_risk,
                "port": "Shanghai" if "india" in factory.lower() else "Rotterdam"
            }

        # Country -> Warehouse
        wh_code = f"WH-{det_hash(country):04d}"
        if wh_code not in nodes:
            lon, lat = get_lat_lon(country)
            nodes[wh_code] = {
                "id": _uid(),
                "node_type": "warehouse",
                "code": wh_code,
                "name": f"{country} Central Warehouse",
                "city": country,
                "country": country,
                "region": "global",
                "capacity": 80000,
                "docks": 30,
                "zones": 8,
                "lat": lat,
                "lon": lon,
                "demand_weight": 1.2
            }

        # Product SKU
        sku = f"PROD-{det_hash(prod_name):04d}"
        if sku not in products:
            cost = pack_price if pack_price > 0 else unit_price
            if cost <= 0:
                cost = 10.0
            products[sku] = {
                "id": _uid(),
                "sku": sku,
                "name": prod_name,
                "category": category,
                "unit_cost": cost,
                "unit_price": round(cost * 1.35, 2),
                "suppliers": [sup_code],
                "criticality": "high" if category == "ARV" else "medium",
                "base_demand": 120,
                "q4_lift": 1.5
            }

    # 2. Populate Markets (one per warehouse for Sankey/Network Visuals)
    wh_codes = [code for code, node in nodes.items() if node["node_type"] == "warehouse"]
    for wc in wh_codes:
        wh = nodes[wc]
        mkt_code = f"MKT-{det_hash(wh['country']):04d}"
        nodes[mkt_code] = {
            "id": _uid(),
            "node_type": "market",
            "code": mkt_code,
            "name": f"{wh['country']} Local Market",
            "city": wh["city"],
            "country": wh["country"],
            "region": wh["region"],
            "lon": wh["lon"] + 0.5,
            "lat": wh["lat"] - 0.5,
            "served_by": wc,
            "weight": 1.0
        }

    # 3. Populate Lanes from CSV rows
    for row in csv_rows:
        vendor = row.get("Vendor", "Generic Vendor").strip()
        country = row.get("Country", "Generic Location").strip()
        mode = row.get("Shipment Mode", "Air").strip()

        sup_code = f"SUP-{det_hash(vendor):04d}"
        wh_code = f"WH-{det_hash(country):04d}"
        mapped_mode = map_mode(mode)
        
        lane_key = (sup_code, wh_code, mapped_mode)
        if lane_key not in lanes:
            sup = nodes[sup_code]
            wh = nodes[wh_code]
            waypoints = [
                [sup["lon"], sup["lat"]],
                [(sup["lon"] + wh["lon"]) / 2 + 3.0, (sup["lat"] + wh["lat"]) / 2 + 4.0],
                [wh["lon"], wh["lat"]]
            ]
            lanes[lane_key] = {
                "id": _uid(),
                "supplier_code": sup_code,
                "warehouse_code": wh_code,
                "supplier_id": sup["id"],
                "warehouse_id": wh["id"],
                "mode": mapped_mode,
                "distance_km": 4500.0,
                "transit_hours": 72.0 if mapped_mode == "air" else (24.0 if mapped_mode == "road" else 360.0),
                "waypoints": waypoints
            }

    # 4. Identify unique (sku, warehouse_code) combinations from CSV
    active_pairs = set()
    pair_volumes = {}
    for row in csv_rows:
        country = row.get("Country", "Generic Location").strip()
        prod_name = row.get("Item Description", "Generic Item").strip()
        qty = parse_int(row.get("Line Item Quantity", "0"))
        
        wh_code = f"WH-{det_hash(country):04d}"
        sku = f"PROD-{det_hash(prod_name):04d}"
        active_pairs.add((sku, wh_code))
        pair_volumes[(sku, wh_code)] = pair_volumes.get((sku, wh_code), 0) + qty

    # Ensure a lane exists for every active inventory pair's supplier to its warehouse
    for sku, wh_code in active_pairs:
        p = products[sku]
        for sup_code in p["suppliers"]:
            has_lane = any(
                lk[0] == sup_code and lk[1] == wh_code
                for lk in lanes
            )
            if not has_lane:
                mapped_mode = "air"
                lane_key = (sup_code, wh_code, mapped_mode)
                sup = nodes[sup_code]
                wh = nodes[wh_code]
                waypoints = [
                    [sup["lon"], sup["lat"]],
                    [(sup["lon"] + wh["lon"]) / 2 + 3.0, (sup["lat"] + wh["lat"]) / 2 + 4.0],
                    [wh["lon"], wh["lat"]]
                ]
                lanes[lane_key] = {
                    "id": _uid(),
                    "supplier_code": sup_code,
                    "warehouse_code": wh_code,
                    "supplier_id": sup["id"],
                    "warehouse_id": wh["id"],
                    "mode": mapped_mode,
                    "distance_km": 4500.0,
                    "transit_hours": 72.0,
                    "waypoints": waypoints
                }

    # Calculate initial on_order quantities based on the 15 live in-transit shipments
    in_transit_qtys = {}
    live_fleet_count = 15
    for idx, row in enumerate(csv_rows):
        if idx >= len(csv_rows) - live_fleet_count:
            country = row.get("Country", "Generic Location").strip()
            prod_name = row.get("Item Description", "Generic Item").strip()
            qty = parse_int(row.get("Line Item Quantity", "0"))
            
            wh_code = f"WH-{det_hash(country):04d}"
            sku = f"PROD-{det_hash(prod_name):04d}"
            in_transit_qtys[(sku, wh_code)] = in_transit_qtys.get((sku, wh_code), 0) + qty

    # Write nodes, products, lanes
    await db.nodes.insert_many(list(nodes.values()))
    await db.products.insert_many(list(products.values()))
    await db.lanes.insert_many(list(lanes.values()))

    # 5. Generate continuous Demand History & Inventory Positions
    inventory_docs = []
    demand_docs = []

    start_date = today - timedelta(days=HISTORY_DAYS)
    doy0 = start_date.timetuple().tm_yday

    for sku, wh_code in active_pairs:
        p = products[sku]
        wh = nodes[wh_code]
        
        # Calculate daily baseline demand based on total quantity in CSV
        total_vol = pair_volumes[(sku, wh_code)]
        avg_daily = max(0.5, min(80.0, total_vol / 365.0)) # bounds to keep realistic
        std_dev = max(0.2, avg_daily * 0.25)
        
        # Generate 15 months of daily demand history
        for d in range(HISTORY_DAYS):
            date = start_date + timedelta(days=d)
            doy = (doy0 + d - 1) % 365 + 1
            mu = (
                avg_daily
                * annual_seasonality(doy, p["q4_lift"])
                * WEEKDAY_FACTOR[date.weekday()]
            )
            qty = max(0, rng.poisson(max(mu, 0.1)))
            demand_docs.append({
                "product_id": p["id"],
                "warehouse_id": wh["id"],
                "sku": sku,
                "warehouse_code": wh_code,
                "date": date.strftime("%Y-%m-%d"),
                "qty": int(qty),
                "revenue": round(float(qty) * p["unit_price"], 2)
            })

        # Calculate safety stock and reorder points
        lt_days = 14.0
        z = 1.65  # 95% service level
        ss = z * std_dev * np.sqrt(lt_days)
        rop = avg_daily * lt_days + ss
        eoq = max(200, int(avg_daily * 30))  # 30 days supply EOQ
        on_hand = int(rop + rng.uniform(0.1, 0.9) * eoq)

        inventory_docs.append({
            "id": _uid(),
            "product_id": p["id"],
            "sku": sku,
            "warehouse_id": wh["id"],
            "warehouse_code": wh_code,
            "on_hand": on_hand,
            "on_order": in_transit_qtys.get((sku, wh_code), 0),
            "reserved": 0,
            "avg_daily_demand": round(avg_daily, 2),
            "demand_std": round(std_dev, 2),
            "lead_time_days": round(lt_days, 1),
            "safety_stock": int(ss),
            "reorder_point": int(rop),
            "eoq": int(eoq),
            "unit_cost": p["unit_cost"],
            "stock_value": round(on_hand * p["unit_cost"], 2),
            "last_updated": now.isoformat()
        })

    # Bulk insert demand and inventory
    for i in range(0, len(demand_docs), 10000):
        await db.demand_history.insert_many(demand_docs[i : i + 10000])
    await db.inventory.insert_many(inventory_docs)

    # 5. Populate Historical Shipments & POs from CSV
    # Keep the last 15 shipments for live fleet
    live_fleet_count = 15
    for idx, row in enumerate(csv_rows):
        vendor = row.get("Vendor", "Generic Vendor").strip()
        country = row.get("Country", "Generic Location").strip()
        prod_name = row.get("Item Description", "Generic Item").strip()
        qty = parse_int(row.get("Line Item Quantity", "0"))
        mode = row.get("Shipment Mode", "Air").strip()

        sup_code = f"SUP-{det_hash(vendor):04d}"
        wh_code = f"WH-{det_hash(country):04d}"
        sku = f"PROD-{det_hash(prod_name):04d}"
        mapped_mode = map_mode(mode)
        
        lane_key = (sup_code, wh_code, mapped_mode)
        lane = lanes[lane_key]
        p = products[sku]
        sup = nodes[sup_code]
        wh = nodes[wh_code]

        po_id = _uid()
        ship_id = _uid()
        
        created = now - timedelta(days=float(rng.uniform(5, 180)))
        departed = created + timedelta(hours=float(rng.uniform(12, 72)))
        planned_h = lane["transit_hours"]

        # Determine status: last 15 will be live in-transit
        if idx >= len(csv_rows) - live_fleet_count:
            progress = float(rng.uniform(0.1, 0.8))
            departed_live = now - timedelta(hours=planned_h * progress)
            eta = departed_live + timedelta(hours=planned_h)
            
            purchase_orders.append({
                "id": po_id, "product_id": p["id"], "sku": sku,
                "supplier_id": sup["id"], "supplier_code": sup_code,
                "warehouse_id": wh["id"], "warehouse_code": wh_code,
                "qty": qty, "unit_cost": p["unit_cost"],
                "total_cost": round(qty * p["unit_cost"], 2),
                "status": "in_transit",
                "created_at": (departed_live - timedelta(hours=24)).isoformat(),
                "expected_delivery": eta.isoformat(),
                "actual_delivery": None,
                "defect_qty": 0
            })
            shipments.append({
                "id": ship_id, "po_id": po_id, "product_id": p["id"], "sku": sku,
                "supplier_id": sup["id"], "supplier_code": sup_code,
                "warehouse_id": wh["id"], "warehouse_code": wh_code,
                "mode": mapped_mode, "carrier": CARRIERS.get(mapped_mode)[det_hash(vendor) % len(CARRIERS.get(mapped_mode))],
                "qty": qty, "value": round(qty * p["unit_cost"], 2),
                "status": "in_transit", "progress": round(progress, 4),
                "lane_id": lane["id"], "distance_km": lane["distance_km"],
                "planned_hours": planned_h, "actual_hours": None,
                "on_time": True,
                "departed_at": departed_live.isoformat(),
                "eta": eta.isoformat(),
                "delivered_at": None, "delay_hours": 0.0,
                "position": position_along_path(lane["waypoints"], progress)
            })
        else:
            on_time = rng.random() < sup["reliability_bias"]
            mult = rng.uniform(0.94, 1.04) if on_time else rng.uniform(1.08, 1.55)
            actual_h = planned_h * mult
            delivered = departed + timedelta(hours=actual_h)
            
            if delivered > now:
                delivered = now - timedelta(hours=12) # force to past
            
            defect_qty = int(qty * max(0.0, rng.normal(sup["defect_bias"], sup["defect_bias"] * 0.5)))
            
            purchase_orders.append({
                "id": po_id, "product_id": p["id"], "sku": sku,
                "supplier_id": sup["id"], "supplier_code": sup_code,
                "warehouse_id": wh["id"], "warehouse_code": wh_code,
                "qty": qty, "unit_cost": p["unit_cost"],
                "total_cost": round(qty * p["unit_cost"], 2),
                "status": "delivered",
                "created_at": created.isoformat(),
                "expected_delivery": (departed + timedelta(hours=planned_h)).isoformat(),
                "actual_delivery": delivered.isoformat(),
                "defect_qty": defect_qty
            })
            shipments.append({
                "id": ship_id, "po_id": po_id, "product_id": p["id"], "sku": sku,
                "supplier_id": sup["id"], "supplier_code": sup_code,
                "warehouse_id": wh["id"], "warehouse_code": wh_code,
                "mode": mapped_mode, "carrier": CARRIERS.get(mapped_mode)[det_hash(vendor) % len(CARRIERS.get(mapped_mode))],
                "qty": qty, "value": round(qty * p["unit_cost"], 2),
                "status": "delivered", "progress": 1.0,
                "lane_id": lane["id"], "distance_km": lane["distance_km"],
                "planned_hours": planned_h, "actual_hours": round(actual_h, 1),
                "on_time": bool(mult <= 1.05),
                "departed_at": departed.isoformat(),
                "eta": (departed + timedelta(hours=planned_h)).isoformat(),
                "delivered_at": delivered.isoformat(),
                "delay_hours": round(max(0.0, actual_h - planned_h), 1),
                "position": [wh["lon"], wh["lat"]]
            })

    await db.purchase_orders.insert_many(purchase_orders)
    await db.shipments.insert_many(shipments)

    # 6. Add initial event logs
    for s in shipments[-live_fleet_count:]:
        events.append({
            "id": _uid(), "ts": s["departed_at"], "type": "shipment_departed",
            "severity": "info",
            "title": f"Shipment departed — {s['sku']}",
            "description": f"{s['qty']} units via {s['carrier']} ({s['mode']}) from {s['supplier_code']} to {s['warehouse_code']}",
            "entity_type": "shipment", "entity_id": s["id"]
        })
    await db.events.insert_many(events)

    # 7. Setup simulation state
    await db.sim_state.insert_one({
        "_id": "state",
        "sim_time": now.isoformat(),
        "speed": 1440.0,
        "running": True,
        "tick_count": 0,
        "last_demand_date": today.strftime("%Y-%m-%d"),
        "started_at": now.isoformat()
    })

    await ensure_indexes(db)
    await db.meta.replace_one(
        {"_id": "seed"},
        {"_id": "seed", "version": SEED_VERSION, "seeded_at": now.isoformat()},
        upsert=True
    )

    return {
        "status": "seeded",
        "version": SEED_VERSION,
        "nodes": len(nodes),
        "products": len(products),
        "lanes": len(lanes),
        "demand_history": len(demand_docs),
        "historical_shipments": len(shipments) - live_fleet_count,
        "inventory_items": len(inventory_docs),
        "live_shipments": live_fleet_count
    }
