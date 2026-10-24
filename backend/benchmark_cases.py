from __future__ import annotations
import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from database import prepare_database_path


class BenchmarkCaseStore:
    def __init__(self, db_path: Path | None = None, max_records: int = 1_000):
        self.db_path = db_path or prepare_database_path()
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
                CREATE TABLE IF NOT EXISTS benchmark_cases (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    scenario_id TEXT NOT NULL,
                    classification TEXT,
                    regression_status TEXT,
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_benchmark_cases_created_at "
                "ON benchmark_cases(created_at)"
            )

    def save(self, payload: dict[str, Any]) -> dict[str, Any]:
        record = dict(payload)
        record["id"] = str(record.get("id") or uuid4())
        record["createdAt"] = str(
            record.get("createdAt") or datetime.now(timezone.utc).isoformat()
        )
        scenario_id = str(record.get("scenarioId") or "unknown")
        serialized = json.dumps(record, ensure_ascii=False)
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO benchmark_cases (
                    id, created_at, scenario_id, classification,
                    regression_status, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    created_at = excluded.created_at,
                    scenario_id = excluded.scenario_id,
                    classification = excluded.classification,
                    regression_status = excluded.regression_status,
                    payload_json = excluded.payload_json
                """,
                (
                    record["id"],
                    record["createdAt"],
                    scenario_id,
                    record.get("caseClassification"),
                    record.get("regressionStatus"),
                    serialized,
                ),
            )
            connection.execute(
                """
                DELETE FROM benchmark_cases
                WHERE id NOT IN (
                    SELECT id FROM benchmark_cases
                    ORDER BY created_at DESC LIMIT ?
                )
                """,
                (self.max_records,),
            )
        return record

    def save_many(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self.save(record) for record in records]

    def list(self, limit: int = 100) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, self.max_records))
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload_json FROM benchmark_cases "
                "ORDER BY created_at DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()
        return [json.loads(row["payload_json"]) for row in rows]


benchmark_case_store = BenchmarkCaseStore()
