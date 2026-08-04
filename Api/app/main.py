import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal, engine
from app.middleware.error import register_exception_handlers
from app.routers.api import api_router
from app.routers.public import router as public_router

logging.basicConfig(level=logging.INFO)


def _warm_connection_pool() -> None:
    """Open a couple of connections before the first request arrives.

    Failures are logged, not raised — the app should still start if the
    database is briefly unreachable, and pool_pre_ping will recover later.
    """
    warmed = 0
    connections = []
    try:
        connections = [engine.connect() for _ in range(2)]
        for conn in connections:
            conn.execute(text("SELECT 1"))
            warmed += 1
    except Exception:
        logging.getLogger("app.startup").warning(
            "Could not warm the connection pool; first request will be slow.",
            exc_info=True,
        )
    else:
        logging.getLogger("app.startup").info("Warmed %d DB connections.", warmed)
    finally:
        for conn in connections:
            conn.close()  # returns to the pool rather than closing the socket


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _warm_connection_pool()
    yield


app = FastAPI(
    title="kwt25 Real Estate API",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

register_exception_handlers(app)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.admin_cors_origins + settings.storefront_cors_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(public_router, prefix="/public/v1")


@app.get("/health", tags=["system"])
def health() -> dict:
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}
