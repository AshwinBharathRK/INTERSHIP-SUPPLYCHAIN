"""MongoDB connection layer (Motor async client)."""
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client


def get_db():
    return get_client()[os.environ.get("DB_NAME", "supply_chain_twin")]


async def ensure_indexes(db) -> None:
    await db.demand_history.create_index([("product_id", 1), ("warehouse_id", 1), ("date", 1)])
    await db.events.create_index([("ts", -1)])
    await db.shipments.create_index([("status", 1)])
    await db.inventory.create_index([("product_id", 1), ("warehouse_id", 1)], unique=True)
    await db.purchase_orders.create_index([("status", 1), ("created_at", -1)])
    await db.nodes.create_index([("node_type", 1)])
