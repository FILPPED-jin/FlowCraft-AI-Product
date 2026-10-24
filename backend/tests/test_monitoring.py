import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from monitoring import MonitoringStore


def record(
    store: MonitoringStore,
    *,
    path: str,
    success: bool,
    duration_ms: float,
) -> None:
    store.record(
        started_at=time.time(),
        request_kind="http",
        method="GET",
        path=path,
        status_code=200 if success else 500,
        duration_ms=duration_ms,
        success=success,
        error_type=None if success else "TestError",
        error_message=None if success else "test failure",
    )


class MonitoringStoreTest(unittest.TestCase):
    def test_monitoring_persists_and_aggregates(self) -> None:
        with TemporaryDirectory() as directory:
            db_path = Path(directory) / "monitoring.sqlite3"
            store = MonitoringStore(db_path)
            record(store, path="/ok", success=True, duration_ms=10)
            record(store, path="/failed", success=False, duration_ms=30)

            restarted_store = MonitoringStore(db_path)
            summary = restarted_store.summary()

            self.assertEqual(summary["lifetime_request_count"], 2)
            self.assertEqual(summary["request_count"], 2)
            self.assertEqual(summary["average_response_ms"], 20)
            self.assertEqual(summary["error_count"], 1)
            self.assertEqual(summary["error_rate"], 50)
            self.assertEqual(summary["recent_errors"][0]["path"], "/failed")

    def test_monitoring_respects_retention_limit(self) -> None:
        with TemporaryDirectory() as directory:
            store = MonitoringStore(
                Path(directory) / "monitoring.sqlite3", max_records=2
            )
            record(store, path="/one", success=True, duration_ms=1)
            record(store, path="/two", success=True, duration_ms=2)
            record(store, path="/three", success=True, duration_ms=3)

            self.assertEqual(store.summary()["lifetime_request_count"], 2)
