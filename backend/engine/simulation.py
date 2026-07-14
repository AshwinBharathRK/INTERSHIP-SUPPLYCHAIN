"""Living digital-twin simulation engine.

Advances a simulated clock; every tick:
  1. moves in-transit shipments along their geo routes,
  2. applies stochastic delay events,
  3. consumes inventory according to daily demand (writes back to demand_history
     so ML models keep learning from live data),
  4. triggers replenishment purchase orders when stock crosses reorder points,
  5. emits business events for the UI stream.
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

from pymongo import UpdateOne

from core.geo import position_along_path
from engine.seed import WEEKDAY_FACTOR, annual_seasonality
from worlddata.world import CARRIERS


def _uid() -> str:
    return str(uuid.uuid4())


def _parse(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class SimulationEngine:
    """Stateless-per-tick engine operating directly on MongoDB."""

    def __init__(self, db):
        self.db = db
        self.rng = random.Random()
        self._lane_cache: dict[str, dict] = {}
        self._product_cache: dict[str, dict] = {}
        self._supplier_cache: dict[str, dict] = {}

    # ------------------------------------------------------------ caching
    async def _load_caches(self):
        if not self._lane_cache:
            async for lane in self.db.lanes.find({}, {"_id": 0}):
                self._lane_cache[lane["id"]] = lane
        if not self._product_cache:
            async for p in self.db.products.find({}, {"_id": 0}):
                self._product_cache[p["id"]] = p
        if not self._supplier_cache:
            async for s in self.db.nodes.find({"node_type": "supplier"}, {"_id": 0}):
                self._supplier_cache[s["code"]] = s

    def _lane_for(self, supplier_code: str, warehouse_code: str, preferred_mode: str | None = None) -> dict | None:
        candidates = [
            lane for lane in self._lane_cache.values()
            if lane["supplier_code"] == supplier_code and lane["warehouse_code"] == warehouse_code
        ]
        if not candidates:
            return None
        if preferred_mode:
            for lane in candidates:
                if lane["mode"] == preferred_mode:
                    return lane
        return candidates[0]

    # --------------------------------------------------------------- tick
    async def tick(self, real_seconds: float = 2.0) -> dict:
        """Advance simulation by speed-scaled time. Returns tick summary."""
        state = await self.db.sim_state.find_one({"_id": "state"})
        if not state or not state.get("running"):
            return {"advanced": False}

        await self._load_caches()
        speed = float(state.get("speed", 1440.0))
        sim_hours = real_seconds * speed / 3600.0
        sim_time = _parse(state["sim_time"]) + timedelta(hours=sim_hours)

        events: list[dict] = []
        summary = {"advanced": True, "sim_hours": round(sim_hours, 3), "arrivals": 0,
                   "reorders": 0, "delays": 0, "stockouts": 0, "days_processed": 0}

        await self._advance_shipments(sim_time, sim_hours, events, summary)
        await self._process_demand_days(state, sim_time, events, summary)

        if events:
            await self.db.events.insert_many(events)
            # keep the event log bounded
            count = await self.db.events.count_documents({})
            if count > 800:
                old = await self.db.events.find({}, {"_id": 1}).sort("ts", 1).limit(count - 800).to_list(None)
                await self.db.events.delete_many({"_id": {"$in": [o["_id"] for o in old]}})

        await self.db.sim_state.update_one(
            {"_id": "state"},
            {"$set": {"sim_time": sim_time.isoformat()},
             "$inc": {"tick_count": 1}},
        )
        summary["sim_time"] = sim_time.isoformat()
        return summary

    # ---------------------------------------------------------- shipments
    async def _advance_shipments(self, sim_time: datetime, sim_hours: float,
                                 events: list[dict], summary: dict):
        active = await self.db.shipments.find({"status": "in_transit"}, {"_id": 0}).to_list(500)
        ship_updates, inv_updates, po_updates = [], [], []

        for s in active:
            lane = self._lane_cache.get(s["lane_id"])
            if not lane:
                continue
            total_hours = s["planned_hours"] + s.get("delay_hours", 0.0)
            delta = sim_hours / max(total_hours, 0.1)
            progress = min(1.0, s["progress"] + delta)
            position = position_along_path(lane["waypoints"], progress)

            # stochastic delay (weather / customs / congestion)
            delay_added = 0.0
            if progress < 0.95 and self.rng.random() < 0.004 * sim_hours:
                delay_added = self.rng.uniform(8, 60)
                summary["delays"] += 1
                events.append({
                    "id": _uid(), "ts": sim_time.isoformat(), "type": "shipment_delayed",
                    "severity": "warning",
                    "title": f"Shipment delayed — {s['sku']}",
                    "description": f"{s['carrier']} {s['mode']} shipment to {s['warehouse_code']} delayed by {round(delay_added)}h (port congestion / customs hold)",
                    "entity_type": "shipment", "entity_id": s["id"],
                })

            if progress >= 1.0:
                # arrival: replenish inventory
                summary["arrivals"] += 1
                actual_hours = s["planned_hours"] + s.get("delay_hours", 0.0) + delay_added
                on_time = actual_hours <= s["planned_hours"] * 1.05
                ship_updates.append(UpdateOne({"id": s["id"]}, {"$set": {
                    "status": "delivered", "progress": 1.0, "position": position,
                    "delivered_at": sim_time.isoformat(), "actual_hours": round(actual_hours, 1),
                    "on_time": on_time,
                }}))
                po_updates.append(UpdateOne({"id": s["po_id"]}, {"$set": {
                    "status": "delivered", "actual_delivery": sim_time.isoformat(),
                    "defect_qty": int(s["qty"] * max(0.0, self.rng.gauss(
                        self._supplier_cache.get(s["supplier_code"], {}).get("defect_bias", 0.01), 0.005))),
                }}))
                inv_updates.append(UpdateOne(
                    {"product_id": s["product_id"], "warehouse_id": s["warehouse_id"]},
                    {"$inc": {"on_hand": s["qty"], "on_order": -s["qty"]},
                     "$set": {"last_updated": sim_time.isoformat()}},
                ))
                events.append({
                    "id": _uid(), "ts": sim_time.isoformat(), "type": "shipment_arrived",
                    "severity": "success",
                    "title": f"Shipment arrived — {s['sku']}",
                    "description": f"{s['qty']} units received at {s['warehouse_code']} via {s['carrier']} ({'on time' if on_time else 'late'})",
                    "entity_type": "shipment", "entity_id": s["id"],
                })
            else:
                update = {"$set": {"progress": round(progress, 5), "position": position}}
                if delay_added:
                    update["$inc"] = {"delay_hours": round(delay_added, 1)}
                    new_eta = _parse(s["eta"]) + timedelta(hours=delay_added)
                    update["$set"]["eta"] = new_eta.isoformat()
                ship_updates.append(UpdateOne({"id": s["id"]}, update))

        if ship_updates:
            await self.db.shipments.bulk_write(ship_updates)
        if inv_updates:
            await self.db.inventory.bulk_write(inv_updates)
        if po_updates:
            await self.db.purchase_orders.bulk_write(po_updates)

    # ------------------------------------------------------------- demand
    async def _process_demand_days(self, state: dict, sim_time: datetime,
                                   events: list[dict], summary: dict):
        last_date = datetime.strptime(state["last_demand_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        current_date = sim_time.replace(hour=0, minute=0, second=0, microsecond=0)
        days_to_process = (current_date - last_date).days
        if days_to_process <= 0:
            return
        days_to_process = min(days_to_process, 7)  # cap per tick for smoothness

        inventory = await self.db.inventory.find({}, {"_id": 0}).to_list(1000)
        inv_updates, demand_docs, new_pos, new_ships = [], [], [], []

        for day_i in range(1, days_to_process + 1):
            date = last_date + timedelta(days=day_i)
            doy = date.timetuple().tm_yday
            for item in inventory:
                product = self._product_cache.get(item["product_id"])
                if not product:
                    continue
                mu = (item["avg_daily_demand"]
                      * WEEKDAY_FACTOR[date.weekday()]
                      * annual_seasonality(doy, product["q4_lift"]))
                demand = max(0, round(self.rng.gauss(mu, max(item["demand_std"], 0.5))))
                fulfilled = min(demand, item["on_hand"])
                item["on_hand"] -= fulfilled

                if demand > 0 and fulfilled < demand:
                    summary["stockouts"] += 1
                    events.append({
                        "id": _uid(), "ts": date.isoformat(), "type": "stockout",
                        "severity": "critical",
                        "title": f"Stockout — {item['sku']} at {item['warehouse_code']}",
                        "description": f"Unmet demand of {demand - fulfilled} units. Lost revenue ≈ ${round((demand - fulfilled) * product['unit_price']):,}",
                        "entity_type": "inventory", "entity_id": item["id"],
                    })

                demand_docs.append({
                    "product_id": item["product_id"], "warehouse_id": item["warehouse_id"],
                    "sku": item["sku"], "warehouse_code": item["warehouse_code"],
                    "date": date.strftime("%Y-%m-%d"), "qty": int(fulfilled),
                    "unmet": int(demand - fulfilled),
                    "revenue": round(fulfilled * product["unit_price"], 2),
                })

                # ------------------------------------------------ reorder policy
                if item["on_hand"] + item["on_order"] <= item["reorder_point"]:
                    qty = max(int(item["eoq"]), int(item["avg_daily_demand"] * item["lead_time_days"]))
                    supplier_code = product["suppliers"][0]
                    lane = self._lane_for(supplier_code, item["warehouse_code"])
                    if lane is None:
                        continue
                    summary["reorders"] += 1
                    po_id, ship_id = _uid(), _uid()
                    eta = sim_time + timedelta(hours=lane["transit_hours"])
                    new_pos.append({
                        "id": po_id, "product_id": item["product_id"], "sku": item["sku"],
                        "supplier_id": lane["supplier_id"], "supplier_code": supplier_code,
                        "warehouse_id": item["warehouse_id"], "warehouse_code": item["warehouse_code"],
                        "qty": qty, "unit_cost": product["unit_cost"],
                        "total_cost": round(qty * product["unit_cost"], 2),
                        "status": "in_transit", "created_at": sim_time.isoformat(),
                        "expected_delivery": eta.isoformat(), "actual_delivery": None,
                        "defect_qty": 0,
                    })
                    new_ships.append({
                        "id": ship_id, "po_id": po_id, "product_id": item["product_id"],
                        "sku": item["sku"], "supplier_id": lane["supplier_id"],
                        "supplier_code": supplier_code,
                        "warehouse_id": item["warehouse_id"], "warehouse_code": item["warehouse_code"],
                        "mode": lane["mode"],
                        "carrier": self.rng.choice(CARRIERS[lane["mode"]]),
                        "qty": qty, "value": round(qty * product["unit_cost"], 2),
                        "status": "in_transit", "progress": 0.0,
                        "lane_id": lane["id"], "distance_km": lane["distance_km"],
                        "planned_hours": lane["transit_hours"], "actual_hours": None,
                        "on_time": True, "departed_at": sim_time.isoformat(),
                        "eta": eta.isoformat(), "delivered_at": None, "delay_hours": 0.0,
                        "position": list(lane["waypoints"][0]),
                    })
                    item["on_order"] += qty
                    events.append({
                        "id": _uid(), "ts": sim_time.isoformat(), "type": "order_created",
                        "severity": "info",
                        "title": f"Replenishment order — {item['sku']}",
                        "description": f"PO for {qty} units from {supplier_code} to {item['warehouse_code']} (stock hit reorder point {item['reorder_point']})",
                        "entity_type": "purchase_order", "entity_id": po_id,
                    })
                elif 0 < item["on_hand"] <= item["safety_stock"]:
                    if self.rng.random() < 0.25:  # avoid event spam
                        events.append({
                            "id": _uid(), "ts": date.isoformat(), "type": "low_stock",
                            "severity": "warning",
                            "title": f"Below safety stock — {item['sku']} at {item['warehouse_code']}",
                            "description": f"{item['on_hand']} on hand vs safety stock {item['safety_stock']}; replenishment {'in transit' if item['on_order'] else 'not yet ordered'}",
                            "entity_type": "inventory", "entity_id": item["id"],
                        })
            summary["days_processed"] += 1

        for item in inventory:
            inv_updates.append(UpdateOne({"id": item["id"]}, {"$set": {
                "on_hand": item["on_hand"], "on_order": item["on_order"],
                "stock_value": round(item["on_hand"] * item["unit_cost"], 2),
                "last_updated": sim_time.isoformat(),
            }}))

        if inv_updates:
            await self.db.inventory.bulk_write(inv_updates)
        if demand_docs:
            await self.db.demand_history.insert_many(demand_docs)
        if new_pos:
            await self.db.purchase_orders.insert_many(new_pos)
        if new_ships:
            await self.db.shipments.insert_many(new_ships)
            for s in new_ships[:4]:
                events.append({
                    "id": _uid(), "ts": sim_time.isoformat(), "type": "shipment_departed",
                    "severity": "info",
                    "title": f"Shipment departed — {s['sku']}",
                    "description": f"{s['qty']} units via {s['carrier']} ({s['mode']}) from {s['supplier_code']} to {s['warehouse_code']}",
                    "entity_type": "shipment", "entity_id": s["id"],
                })

        await self.db.sim_state.update_one(
            {"_id": "state"},
            {"$set": {"last_demand_date": (last_date + timedelta(days=days_to_process)).strftime("%Y-%m-%d")}},
        )
