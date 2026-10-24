from pathlib import Path
from tempfile import TemporaryDirectory

from benchmark_cases import BenchmarkCaseStore


def test_cases_persist_across_store_instances() -> None:
    with TemporaryDirectory() as directory:
        db_path = Path(directory) / "flowcraft.sqlite3"
        first_store = BenchmarkCaseStore(db_path=db_path)
        saved = first_store.save(
            {
                "id": "case-1",
                "createdAt": "2026-10-23T08:00:00+00:00",
                "scenarioId": "saas",
                "caseClassification": "bad",
                "rootCauses": ["semantic-mapping"],
            }
        )

        second_store = BenchmarkCaseStore(db_path=db_path)
        records = second_store.list()

        assert saved["id"] == "case-1"
        assert records == [saved]


def test_saving_existing_case_updates_without_duplicate() -> None:
    with TemporaryDirectory() as directory:
        store = BenchmarkCaseStore(
            db_path=Path(directory) / "flowcraft.sqlite3"
        )
        store.save(
            {
                "id": "case-1",
                "scenarioId": "saas",
                "caseClassification": "boundary",
            }
        )
        updated = store.save(
            {
                "id": "case-1",
                "scenarioId": "saas",
                "caseClassification": "good",
                "regressionStatus": "passed",
            }
        )

        assert store.list() == [updated]
        assert updated["caseClassification"] == "good"
