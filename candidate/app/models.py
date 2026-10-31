from datetime import UTC, datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now():
    return datetime.now(UTC)


def uid():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("tenant", "application_id"),
        UniqueConstraint("tenant", "idempotency_key"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    tenant: Mapped[str] = mapped_column(String(128), index=True)
    application_id: Mapped[str] = mapped_column(String(128))
    job_id: Mapped[str] = mapped_column(String(128))
    resume_id: Mapped[str] = mapped_column(String(128))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    email: Mapped[str] = mapped_column(String(320))
    candidate: Mapped[dict] = mapped_column(JSON)
    resume_text: Mapped[str] = mapped_column(Text)
    rubric: Mapped[dict] = mapped_column(JSON)
    extracted: Mapped[dict] = mapped_column(JSON, default=dict)
    questions: Mapped[list] = mapped_column(JSON, default=list)
    response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    missing_fields: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="received")
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    counted: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("application", "operation"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    application: Mapped[str] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"))
    operation: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)


class JobCounter(Base):
    __tablename__ = "job_counters"
    tenant: Mapped[str] = mapped_column(String(128), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    processed_applications: Mapped[int] = mapped_column(Integer, default=0)


class VectorChunk(Base):
    __tablename__ = "resume_vectors"
    application: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), primary_key=True
    )
    ordinal: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_hash: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String(128))
    normalization_version: Mapped[str] = mapped_column(String(20), default="1")
    embedding: Mapped[list] = mapped_column(Vector(1536).with_variant(JSON(), "sqlite"))


class RepositoryAssociation(Base):
    __tablename__ = "repository_jobs"
    tenant: Mapped[str] = mapped_column(String(128), primary_key=True)
    resume_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(128), primary_key=True)
