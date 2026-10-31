import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, settings
from app.db import db
from app.main import app
from app.models import Base

KEY = "test-platform-key-" + "a" * 32
OTHER_KEY = "test-platform-key-" + "b" * 32


@pytest.fixture
def setup():
    url = os.getenv("TEST_DATABASE_URL")
    admin = None
    schema = None
    if url:
        admin = create_engine(url)
        schema = "test_" + uuid.uuid4().hex
        with admin.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(url, connect_args={"options": f"-csearch_path={schema},public"})
    else:
        engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    config = Settings(api_keys={KEY: "tenant-a", OTHER_KEY: "tenant-b"}, max_attempts=1)
    settings.cache_clear()
    # Dependency override for HTTP; module config reads use environment through cached settings.
    original = os.environ.get("API_KEYS")
    import json

    os.environ["API_KEYS"] = json.dumps(config.api_keys)

    def sessions():
        with factory() as session:
            yield session

    app.dependency_overrides[db] = sessions
    with TestClient(app) as client:
        client.headers.update({"Authorization": "Bearer " + KEY})
        yield client, factory, config
    app.dependency_overrides.clear()
    if original is None:
        os.environ.pop("API_KEYS", None)
    else:
        os.environ["API_KEYS"] = original
    settings.cache_clear()
    engine.dispose()
    if admin:
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


@pytest.fixture
def payload():
    return {
        "application_id": "application-1",
        "job_id": "job-1",
        "resume_id": "resume-1",
        "full_name": "Alex Example",
        "email": "alex@example.com",
        "application_date": "2026-01-01T10:00:00Z",
        "resume": {
            "format": "text",
            "content": "Built spreadsheet reports. Worked with a team on customer research.",
        },
    }


class FakeProvider:
    def __init__(self, complete=False, fail=False):
        self.complete = complete
        self.fail = fail

    def extract(self, text, rubric):
        if self.fail:
            from app.errors import ServiceError

            raise ServiceError("provider_unavailable", 503)
        categories = [c["id"] for c in rubric["categories"]] if self.complete else ["skill"]
        return {
            "evidence": [
                {"category": category, "detail": "Candidate reported work", "quote": text[:25]}
                for category in categories
            ],
            "other_details": [],
        }

    def embed(self, chunks):
        if self.fail:
            from app.errors import ServiceError

            raise ServiceError("provider_unavailable", 503)
        return [[0.1] * 1536 for _ in chunks]
