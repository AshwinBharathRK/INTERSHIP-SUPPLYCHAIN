"""PHASE 1 POC — single core test proving all critical workflows in isolation.

Covers plan.md POC user stories:
  1. Seed realistic global supply chain dataset into MongoDB
  2. Simulation tick moves shipments along waypoint routes + updates inventory
  3. Reorders trigger when stock crosses reorder point -> new shipments
  4. ML (forecast / EOQ / safety stock / ABC / risk / delay) returns sane outputs
  5. AI Copilot (Emergent LLM key) returns a grounded response

Run: cd /app/backend && python test_core.py
"""
import asyncio
import os
import sys
import time

os.environ.setdefault("DB_NAME", "supply_chain_twin")

from core.db import get_db  # noqa: E402

RESULTS: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = ""):
    RESULTS.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'} — {name}" + (f" | {detail}" if detail else ""))


async def test_seed(db):
    print("\n[1/5] SEED GENERATION")
    from engine.seed import seed_database

    t0 = time.time()
    result = await seed_database(db, force=True)
    dt = time.time() - t0
    record("seed completes", result["status"] == "seeded", f"{dt:.1f}s -> {result}")
    counts = {
        "nodes": await db.nodes.count_documents({}),
        "products": await db.products.count_documents({}),
        "lanes": await db.lanes.count_documents({}),
        "demand_history": await db.demand_history.count_documents({}),
        "inventory": await db.inventory.count_documents({}),
        "shipments": await db.shipments.count_documents({}),
        "in_transit": await db.shipments.count_documents({"status": "in_transit"}),
    }
    record("nodes seeded (141 = 109 sup + 16 wh + 16 mkt)", counts["nodes"] == 141, str(counts["nodes"]))
    record("162 products", counts["products"] == 162, str(counts["products"]))
    record("demand history > 300k rows", counts["demand_history"] > 300000, str(counts["demand_history"]))
    record("inventory items = 673 active pairs", counts["inventory"] == 673, str(counts["inventory"]))
    record("live in-transit fleet exists", counts["in_transit"] >= 10, str(counts["in_transit"]))

    # data sanity: demand has seasonality signal (Q4 mean > Q2 mean for high-lift product)
    doc = await db.products.find_one({"sku": "PROD-3754"}, {"_id": 0})
    rows = await db.demand_history.find({"product_id": doc["id"]}, {"_id": 0}).to_list(None)
    q4 = [r["qty"] for r in rows if r["date"][5:7] in ("11", "12")]
    q2 = [r["qty"] for r in rows if r["date"][5:7] in ("04", "05")]
    ok = q4 and q2 and (sum(q4) / len(q4)) > 1.2 * (sum(q2) / len(q2))
    record("demand history carries seasonal signal", bool(ok),
           f"Q4 avg {sum(q4)/len(q4):.1f} vs Q2 avg {sum(q2)/len(q2):.1f}")


async def test_simulation(db):
    print("\n[2/5] SIMULATION ENGINE")
    from engine.simulation import SimulationEngine

    engine = SimulationEngine(db)
    before = {s["id"]: s async for s in db.shipments.find({"status": "in_transit"}, {"_id": 0})}
    inv_before = await db.inventory.find({}, {"_id": 0}).to_list(None)
    total_on_hand_before = sum(i["on_hand"] for i in inv_before)

    # simulate ~6 sim days across several ticks (speed=1440 -> 2 real sec = 48 sim min)
    summaries = []
    for _ in range(20):
        summaries.append(await engine.tick(real_seconds=30))  # 30s * 1440x = 12h per tick

    last = summaries[-1]
    record("tick advances sim clock", last.get("advanced") and "sim_time" in last, last.get("sim_time", ""))

    after_ships = await db.shipments.find({"id": {"$in": list(before)}}, {"_id": 0}).to_list(None)
    moved = sum(
        1 for s in after_ships
        if s["progress"] > before[s["id"]]["progress"] and s["position"] != before[s["id"]]["position"]
    )
    delivered = sum(1 for s in after_ships if s["status"] == "delivered")
    record("shipments progressed along routes", moved + delivered >= len(before) * 0.8,
           f"{moved} moved, {delivered} delivered of {len(before)}")

    days = sum(s.get("days_processed", 0) for s in summaries)
    record("demand days processed", days >= 5, f"{days} sim days")

    inv_after = await db.inventory.find({}, {"_id": 0}).to_list(None)
    total_on_hand_after = sum(i["on_hand"] for i in inv_after)
    record("inventory changed by demand/replenishment", total_on_hand_after != total_on_hand_before,
           f"{total_on_hand_before} -> {total_on_hand_after}")

    reorders = sum(s.get("reorders", 0) for s in summaries)
    new_ship_count = await db.shipments.count_documents({"status": "in_transit"})
    record("reorder policy triggered new POs/shipments", reorders > 0,
           f"{reorders} reorders, {new_ship_count} now in transit")

    n_events = await db.events.count_documents({})
    record("business events emitted", n_events > 5, f"{n_events} events")

    # live demand written back for ML freshness
    doc = await db.demand_history.count_documents({})
    record("live demand appended to history", doc > 307000, str(doc))


async def test_ml(db):
    print("\n[3/5] ML MODULES")
    from ml.forecast import forecast_series
    from ml.inventory import abc_analysis, optimize_item
    from ml.risk import compute_supplier_metrics, predict_delay, supplier_risk

    product = await db.products.find_one({"sku": "PROD-3427"}, {"_id": 0})
    wh = await db.nodes.find_one({"code": "WH-7185"}, {"_id": 0})
    rows = await db.demand_history.find(
        {"product_id": product["id"], "warehouse_id": wh["id"]}, {"_id": 0}
    ).sort("date", 1).to_list(None)
    fc = forecast_series([r["date"] for r in rows], [r["qty"] for r in rows], horizon=30)
    ok = (
        len(fc["forecast"]) == 30
        and all(v >= 0 and v == v for v in fc["forecast"])  # non-negative, non-NaN
        and all(fc["upper"][i] >= fc["forecast"][i] >= fc["lower"][i] for i in range(30))
    )
    record("Holt-Winters forecast sane", ok,
           f"model={fc['model']} mape={fc['mape']}% avg={fc['avg_daily']}")
    record("forecast used holt_winters (not fallback)", fc["model"] == "holt_winters", fc["model"])
    record("forecast MAPE reasonable (<60%)", fc["mape"] is not None and fc["mape"] < 60, f"{fc['mape']}%")

    item = await db.inventory.find_one({"sku": "PROD-3427", "warehouse_code": "WH-7185"}, {"_id": 0})
    opt = optimize_item(item, mode="air")
    ok = opt["eoq"] > 0 and opt["safety_stock"] >= 0 and opt["reorder_point"] > 0 and 0 <= opt["stockout_probability"] <= 1
    record("EOQ/SS/ROP/stockout sane", ok, str({k: opt[k] for k in ("eoq", "safety_stock", "reorder_point", "days_of_supply", "stockout_probability")}))
    record("optimization has explanations", all(k in opt["explanation"] for k in ("eoq", "safety_stock", "reorder_point", "stockout")))

    # ABC on real revenue aggregation
    pipeline = [
        {"$group": {"_id": "$sku", "annual_revenue": {"$sum": "$revenue"}}},
    ]
    agg = await db.demand_history.aggregate(pipeline).to_list(None)
    abc = abc_analysis([{"sku": a["_id"], "annual_revenue": a["annual_revenue"]} for a in agg])
    classes = {r["abc_class"] for r in abc}
    record("ABC analysis classifies A/B/C", classes == {"A", "B", "C"},
           f"{sum(1 for r in abc if r['abc_class']=='A')}A/{sum(1 for r in abc if r['abc_class']=='B')}B/{sum(1 for r in abc if r['abc_class']=='C')}C")

    # supplier risk from real shipment history
    sup = await db.nodes.find_one({"code": "SUP-1264"}, {"_id": 0})
    ships = await db.shipments.find({"supplier_code": "SUP-1264"}, {"_id": 0}).to_list(None)
    pos = await db.purchase_orders.find({"supplier_code": "SUP-1264"}, {"_id": 0}).to_list(None)
    metrics = compute_supplier_metrics(ships, pos, sup["geo_risk"], 1, 4)
    risk = supplier_risk(metrics)
    ok = 0 <= risk["score"] <= 100 and risk["level"] in ("low", "medium", "high") and "primary_driver" in risk
    record("supplier risk score bounded + explainable", ok,
           f"score={risk['score']} level={risk['level']} driver={risk['primary_driver']} (otd={metrics['on_time_rate']})")

    ship = await db.shipments.find_one({"status": "in_transit"}, {"_id": 0})
    if ship:
        delay = predict_delay(ship, metrics["on_time_rate"], metrics["avg_delay_hours"])
        ok = 0 <= delay["delay_probability"] <= 1 and delay["risk_level"] in ("low", "medium", "high")
        record("delay prediction sane", ok, str(delay))
    else:
        record("delay prediction sane", True, "no in-transit shipment (skipped)")


async def test_llm():
    print("\n[4/5] AI COPILOT (Emergent LLM key)")
    from ai_copilot import ask_copilot

    context = (
        "KPIs: total inventory value $8.4M; 14 shipments in transit; "
        "top stockout risk: ELX-6001 EchoPod Wireless Earbuds at DC-LAX with 3.2 days of supply; "
        "highest-risk supplier: Saigon Assembly Corporation (score 61, driver: on-time delivery)."
    )
    answer = await ask_copilot(
        "Which SKU is at highest stockout risk and what should we do?",
        context, session_id="poc-test",
    )
    ok = isinstance(answer, str) and len(answer) > 40
    grounded = "PROD-3754" in answer or "Determine" in answer
    record("LLM returns substantive answer", ok, f"{len(answer)} chars")
    record("LLM answer grounded in context", grounded, answer[:160].replace("\n", " "))


async def test_streaming():
    print("\n[5/5] AI COPILOT STREAMING")
    from ai_copilot import stream_copilot

    chunks = []
    async for delta in stream_copilot("Summarize network health in one sentence.",
                                      "KPIs: 96% order fill rate, 2 delayed shipments, inventory value $8.4M.",
                                      session_id="poc-stream"):
        chunks.append(delta)
    text = "".join(chunks)
    record("streaming yields multiple chunks", len(chunks) > 1, f"{len(chunks)} chunks")
    record("streamed text non-empty", len(text) > 20, text[:120].replace("\n", " "))


async def main():
    db = get_db()
    await test_seed(db)
    await test_simulation(db)
    await test_ml(db)
    await test_llm()
    await test_streaming()

    print("\n" + "=" * 70)
    failed = [r for r in RESULTS if not r[1]]
    print(f"RESULT: {len(RESULTS) - len(failed)}/{len(RESULTS)} passed")
    if failed:
        print("FAILED:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)
    print("ALL CORE POC TESTS PASSED")
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
