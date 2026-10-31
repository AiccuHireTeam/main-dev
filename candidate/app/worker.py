import logging
import signal
import time
from datetime import timedelta

from sqlalchemy import select

from app.config import settings
from app.db import session_factory
from app.errors import ServiceError
from app.models import Application, Task, now
from app.pipeline import extract_application, vectorize_application
from app.provider import Provider

log = logging.getLogger("resume.worker")


def run_once(factory, provider, config):
    # A task is claimed by a row lock, not an in-memory queue. Crash releases the lock;
    # task, result, vectors and counters either commit together or roll back together.
    with factory() as session, session.begin():
        task = session.scalar(
            select(Task)
            .where(Task.status == "pending", Task.available_at <= now())
            .order_by(Task.available_at, Task.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if task is None:
            return False
        application = session.scalar(
            select(Application).where(Application.id == task.application).with_for_update()
        )
        task.attempts += 1
        try:
            with session.begin_nested():
                if task.operation == "extract":
                    extract_application(application, provider, config)
                else:
                    vectorize_application(session, application, provider, config)
                session.flush()
            task.status, task.error_code = "done", None
        except Exception as error:  # noqa: BLE001 - durable task failure boundary
            code = error.code if isinstance(error, ServiceError) else "processing_failed"
            task.error_code = application.error_code = code
            if task.attempts >= config.max_attempts:
                task.status = "failed"
                application.status = task.operation + "_failed"
            else:
                task.available_at = now() + timedelta(seconds=min(300, 2**task.attempts))
            # No raw exception, resume, email, answers, or provider response in logs.
            log.warning(
                "task_failed operation=%s code=%s attempt=%s", task.operation, code, task.attempts
            )
        return True


def main():
    logging.basicConfig(level=logging.INFO)
    config = settings()
    factory = session_factory()
    provider = Provider(config)
    stopped = False

    def stop(*args):
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while not stopped:
        try:
            if not run_once(factory, provider, config):
                time.sleep(1)
        except Exception:  # noqa: BLE001 - keep worker alive after database outages
            log.error("worker_database_or_transaction_failure")
            time.sleep(5)


if __name__ == "__main__":
    main()
