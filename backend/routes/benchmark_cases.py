from typing import Any
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Query

from benchmark_cases import benchmark_case_store


router = APIRouter()


@router.get("/api/benchmark/cases")
async def list_benchmark_cases(
    limit: int = Query(default=100, ge=1, le=1_000),
) -> list[dict[str, Any]]:
    return benchmark_case_store.list(limit)


@router.post("/api/benchmark/cases")
async def save_benchmark_case(
    case: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    return benchmark_case_store.save(case)


@router.post("/api/benchmark/cases/migrate")
async def migrate_benchmark_cases(
    cases: list[dict[str, Any]] = Body(...),
) -> dict[str, int]:
    saved = benchmark_case_store.save_many(cases[:1_000])
    return {"migrated": len(saved)}


@router.get("/api/benchmark/cases/export")
async def export_benchmark_cases() -> dict[str, Any]:
    records = benchmark_case_store.list(1_000)
    return {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "benchmark": "FlowCraft five-scenario product benchmark",
        "runs": records,
    }
