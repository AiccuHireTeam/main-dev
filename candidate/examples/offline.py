"""Local demonstration with real API/database workflow and explicitly simulated model calls."""

import json
import os
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, settings
from app.db import db
from app.main import app
from app.models import Base, VectorChunk
from app.worker import run_once

DEMO_KEY = "offline-synthetic-demo-key-" + "x" * 32


class DemoProvider:
    def extract(self, text, rubric):
        quote = "Used Excel formulas and pivot tables to summarize 200 expense records and create a monthly spending report."
        if quote not in text:
            raise ValueError("Offline provider expects the bundled synthetic resume")
        return {
            "evidence": [
                {
                    "category": "skill",
                    "detail": "Excel analysis and expense reporting",
                    "quote": quote,
                }
            ],
            "other_details": [
                {
                    "label": "education",
                    "detail": "Business Administration degree, 2025",
                    "quote": "Bachelor of Business Administration, Example College, 2025.",
                }
            ],
            "identity_details": [],
        }

    def embed(self, chunks):
        # Test values only: these vectors have no semantic meaning.
        return [[0.1] * 1536 for _ in chunks]


@contextmanager
def offline_client():
    previous_keys = os.environ.get("API_KEYS")
    previous_override = app.dependency_overrides.get(db)
    os.environ["API_KEYS"] = json.dumps({DEMO_KEY: "synthetic-demo-tenant"})
    settings.cache_clear()
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    config = Settings(api_keys={DEMO_KEY: "synthetic-demo-tenant"}, max_attempts=1)

    def sessions():
        with factory() as session:
            yield session

    def tick():
        run_once(factory, DemoProvider(), config)

    def vector_count():
        with factory() as session:
            return session.scalar(select(func.count()).select_from(VectorChunk))

    app.dependency_overrides[db] = sessions
    try:
        with TestClient(app) as client:
            client.headers["Authorization"] = "Bearer " + DEMO_KEY
            yield client, tick, vector_count
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(db, None)
        else:
            app.dependency_overrides[db] = previous_override
        if previous_keys is None:
            os.environ.pop("API_KEYS", None)
        else:
            os.environ["API_KEYS"] = previous_keys
        settings.cache_clear()
        engine.dispose()
