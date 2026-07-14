"""AI routes: streaming Copilot chat grounded in live data + deterministic insights."""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.helpers import get_supplier_intel
from ml.inventory import days_of_supply, stockout_probability

router = APIRouter()


class ChatBody(BaseModel):
    message: str
    session_id: str = "default"


def _db(request: Request):
    return request.app.state.db


async def build_context(db) -> str:
    """Assemble live platform context for LLM grounding."""
    parts = []
    state = await db.sim_state.find_one({"_id": "state"})
    if state:
        parts.append(f"Simulation time: {state['sim_time'][:16]}")

    inv = await db.inventory.find({}, {"_id": 0}).to_list(None)
    total_value = sum(r["stock_value"] for r in inv)
    parts.append(f"Total inventory value: ${total_value:,.0f} across {len(inv)} SKU-warehouse positions.")

    scored = []
    for r in inv:
        p_so = stockout_probability(r["on_hand"], r["on_order"], r["avg_daily_demand"], r["demand_std"], r["lead_time_days"])
        dos = days_of_supply(r["on_hand"], r["avg_daily_demand"])
        scored.append((p_so, dos, r))
    scored.sort(key=lambda x: -x[0])
    parts.append("Top stockout risks: " + "; ".join(
        f"{r['sku']}@{r['warehouse_code']} (p={p:.0%}, {d:.1f} days supply, {r['on_hand']} on hand, {r['on_order']} inbound)"
        for p, d, r in scored[:6]))

    intel = await get_supplier_intel(db)
    parts.append("Supplier risk (top 5): " + "; ".join(
        f"{s['name']} [{s['code']}] score {s['risk']['score']} ({s['risk']['level']}, driver: {s['risk']['primary_driver']}, on-time {s['metrics']['on_time_rate']:.0%})"
        for s in intel[:5]))

    in_transit = await db.shipments.find({"status": "in_transit"}, {"_id": 0}).to_list(None)
    delayed = [s for s in in_transit if s.get("delay_hours", 0) > 0]
    parts.append(f"Shipments in transit: {len(in_transit)} worth ${sum(s['value'] for s in in_transit):,.0f}; {len(delayed)} currently delayed.")
    if delayed:
        parts.append("Delayed shipments: " + "; ".join(
            f"{s['sku']} to {s['warehouse_code']} via {s['carrier']} (+{s['delay_hours']:.0f}h)" for s in delayed[:5]))

    events = await db.events.find({"severity": {"$in": ["critical", "warning"]}}, {"_id": 0}).sort("ts", -1).limit(6).to_list(6)
    if events:
        parts.append("Recent alerts: " + "; ".join(f"[{e['severity']}] {e['title']}" for e in events))
    return "\n".join(parts)


@router.post("/ai/chat")
async def ai_chat(request: Request, body: ChatBody):
    db = _db(request)
    context = await build_context(db)
    history = await db.chat_messages.find(
        {"session_id": body.session_id}, {"_id": 0}).sort("ts", -1).limit(8).to_list(8)
    history = list(reversed(history))

    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()), "session_id": body.session_id,
        "role": "user", "content": body.message, "ts": now,
    })

    from ai_copilot import stream_copilot

    async def event_stream():
        collected = []
        try:
            async for delta in stream_copilot(body.message, context, history=history,
                                              session_id=body.session_id):
                collected.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as exc:  # graceful LLM failure
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        full = "".join(collected)
        if full:
            await db.chat_messages.insert_one({
                "id": str(uuid.uuid4()), "session_id": body.session_id,
                "role": "assistant", "content": full,
                "ts": datetime.now(timezone.utc).isoformat(),
            })
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/ai/history")
async def ai_history(request: Request, session_id: str = "default", limit: int = 50):
    rows = await _db(request).chat_messages.find(
        {"session_id": session_id}, {"_id": 0}).sort("ts", 1).limit(limit).to_list(limit)
    return rows


@router.delete("/ai/history")
async def ai_clear(request: Request, session_id: str = "default"):
    await _db(request).chat_messages.delete_many({"session_id": session_id})
    return {"cleared": True}


@router.get("/ai/insights")
async def ai_insights(request: Request):
    """Deterministic, explainable recommended actions computed from live data."""
    db = _db(request)
    insights = []

    inv = await db.inventory.find({}, {"_id": 0}).to_list(None)
    products = {p["id"]: p async for p in db.products.find({}, {"_id": 0})}
    scored = []
    for r in inv:
        p_so = stockout_probability(r["on_hand"], r["on_order"], r["avg_daily_demand"], r["demand_std"], r["lead_time_days"])
        if p_so > 0.35:
            product = products.get(r["product_id"], {})
            lost = p_so * r["avg_daily_demand"] * r["lead_time_days"] * product.get("unit_price", 0)
            scored.append((p_so, lost, r, product))
    scored.sort(key=lambda x: -x[1])
    for p_so, lost, r, product in scored[:4]:
        insights.append({
            "id": f"stockout-{r['sku']}-{r['warehouse_code']}",
            "type": "stockout_risk", "severity": "critical" if p_so > 0.6 else "warning",
            "title": f"Expedite replenishment of {r['sku']} to {r['warehouse_code']}",
            "description": f"{product.get('name', r['sku'])} has {days_of_supply(r['on_hand'], r['avg_daily_demand']):.1f} days of supply vs {r['lead_time_days']:.0f}-day lead time. Stockout probability {p_so:.0%}.",
            "impact": f"~${lost:,.0f} revenue at risk over lead time",
            "action": "Expedite via air freight or transfer stock from a sister DC",
        })

    intel = await get_supplier_intel(db)
    for s in [x for x in intel if x["risk"]["level"] == "high"][:2]:
        insights.append({
            "id": f"supplier-{s['code']}",
            "type": "supplier_risk", "severity": "warning",
            "title": f"Diversify away from {s['name']}",
            "description": f"Risk score {s['risk']['score']}/100 driven by {s['risk']['primary_driver']}. On-time rate {s['metrics']['on_time_rate']:.0%} across {s['metrics']['shipments_analyzed']} shipments.",
            "impact": f"${s['total_spend']:,.0f} annual spend exposed",
            "action": "Qualify a second source for affected SKUs and rebalance POs",
        })

    delayed = await db.shipments.find(
        {"status": "in_transit", "delay_hours": {"$gt": 12}}, {"_id": 0}).sort("delay_hours", -1).limit(3).to_list(3)
    for s in delayed:
        insights.append({
            "id": f"delay-{s['id'][:8]}",
            "type": "shipment_delay", "severity": "warning",
            "title": f"Delayed: {s['sku']} to {s['warehouse_code']} (+{s['delay_hours']:.0f}h)",
            "description": f"{s['qty']} units (${s['value']:,.0f}) via {s['carrier']} ({s['mode']}) at {s['progress']:.0%} of route.",
            "impact": f"${s['value']:,.0f} in delayed goods",
            "action": "Notify downstream planners; review safety stock coverage at destination",
        })

    healthy = len(insights) == 0
    if healthy:
        insights.append({
            "id": "healthy", "type": "health", "severity": "success",
            "title": "Network operating within tolerance",
            "description": "No critical stockout risks, supplier alerts or major delays detected.",
            "impact": "", "action": "Review C-class inventory for working-capital reduction opportunities",
        })
    return insights
