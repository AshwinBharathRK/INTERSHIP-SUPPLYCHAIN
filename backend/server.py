"""Supply Chain Digital Twin — FastAPI application entrypoint.

Self-seeding, self-simulating: on startup the platform seeds MongoDB with the
real-world grounded dataset (idempotent) and starts the living simulation loop.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("twin")

TICK_REAL_SECONDS = 2.5


async def simulation_loop(app: FastAPI):
    from engine.simulation import SimulationEngine

    engine = SimulationEngine(app.state.db)
    logger.info("Simulation loop started (tick every %.1fs)", TICK_REAL_SECONDS)
    while True:
        try:
            await engine.tick(real_seconds=TICK_REAL_SECONDS)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Simulation tick failed; continuing")
        await asyncio.sleep(TICK_REAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from core.db import get_client, get_db
    from engine.seed import seed_database

    app.state.db = get_db()
    try:
        result = await seed_database(app.state.db, force=False)
        logger.info("Seed check: %s", result)
    except Exception:
        logger.exception("Seeding failed")
    task = asyncio.create_task(simulation_loop(app))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    get_client().close()


app = FastAPI(title="Supply Chain Digital Twin", version="1.0.0", lifespan=lifespan)

from api.ai_routes import router as ai_router  # noqa: E402
from api.analytics_routes import router as analytics_router  # noqa: E402
from api.core_routes import router as core_router  # noqa: E402

app.include_router(core_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
