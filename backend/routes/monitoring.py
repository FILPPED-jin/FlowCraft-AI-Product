from fastapi import APIRouter, Query
from monitoring import monitoring_store


router = APIRouter()


@router.get("/api/monitoring/summary")
async def get_monitoring_summary(
    window_hours: int = Query(default=24, ge=1, le=720),
    error_limit: int = Query(default=8, ge=1, le=50),
) -> dict[str, object]:
    """Return persistent, privacy-safe request and error aggregates."""
    return monitoring_store.summary(
        window_hours=window_hours,
        error_limit=error_limit,
    )
