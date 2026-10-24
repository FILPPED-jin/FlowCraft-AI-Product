from __future__ import annotations
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any


from database import prepare_database_path


DEFAULT_DB_PATH = prepare_database_path()


class MonitoringStore:
    def __init__(self, db_path: Path = DEFAULT_DB_PATH, max_records: int = 10_000):
        self.db_path = db_path
        self.max_records = max_records
        self._lock = threading.Lock()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS request_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    started_at REAL NOT NULL,
                    request_kind TEXT NOT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    duration_ms REAL NOT NULL,
                    success INTEGER NOT NULL,
                    error_type TEXT,
                    error_message TEXT
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_request_events_started_at "
                "ON request_events(started_at)"
            )

    def record(
        self,
        *,
        started_at: float,
        request_kind: str,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        success: bool,
        error_type: str | None = None,
        error_message: str | None = None,
    ) -> None:
        safe_message = (error_message or "").strip()[:500] or None
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO request_events (
                    started_at, request_kind, method, path, status_code,
                    duration_ms, success, error_type, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    started_at,
                    request_kind,
                    method,
                    path,
                    status_code,
                    round(duration_ms, 2),
                    int(success),
                    error_type,
                    safe_message,
                ),
            )
            connection.execute(
                """
                DELETE FROM request_events
                WHERE id NOT IN (
                    SELECT id FROM request_events ORDER BY id DESC LIMIT ?
                )
                """,
                (self.max_records,),
            )

    def summary(self, window_hours: int = 24, error_limit: int = 8) -> dict[str, Any]:
        window_hours = max(1, min(window_hours, 24 * 30))
        error_limit = max(1, min(error_limit, 50))
        since = time.time() - window_hours * 60 * 60
        with self._connect() as connection:
            lifetime = connection.execute(
                "SELECT COUNT(*) AS count FROM request_events"
            ).fetchone()
            aggregate = connection.execute(
                """
                SELECT
                    COUNT(*) AS request_count,
                    COALESCE(AVG(duration_ms), 0) AS average_response_ms,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS error_count
                FROM request_events
                WHERE started_at >= ?
                """,
                (since,),
            ).fetchone()
            recent_errors = connection.execute(
                """
                SELECT started_at, request_kind, method, path, status_code,
                       duration_ms, error_type, error_message
                FROM request_events
                WHERE success = 0
                ORDER BY started_at DESC
                LIMIT ?
                """,
                (error_limit,),
            ).fetchall()

        request_count = int(aggregate["request_count"] or 0)
        error_count = int(aggregate["error_count"] or 0)
        return {
            "window_hours": window_hours,
            "lifetime_request_count": int(lifetime["count"] or 0),
            "request_count": request_count,
            "average_response_ms": round(float(aggregate["average_response_ms"] or 0), 1),
            "error_count": error_count,
            "error_rate": round(error_count / request_count * 100, 1)
            if request_count
            else 0.0,
            "recent_errors": [dict(row) for row in recent_errors],
        }


monitoring_store = MonitoringStore()
