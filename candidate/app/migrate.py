"""Versioned baseline migration. Run as a deployment step, never on API startup."""

from sqlalchemy import text

from app.db import engine
from app.models import Base


def main():
    with engine().begin() as connection:
        connection.execute(text("SELECT pg_advisory_xact_lock(843601001)"))
        connection.execute(
            text("CREATE TABLE IF NOT EXISTS schema_versions (version integer PRIMARY KEY)")
        )
        current = connection.execute(text("SELECT max(version) FROM schema_versions")).scalar()
        if current is None:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            Base.metadata.create_all(connection)
            connection.execute(text("INSERT INTO schema_versions (version) VALUES (1)"))
        elif current != 1:
            raise RuntimeError("Unsupported database schema version")


if __name__ == "__main__":
    main()
