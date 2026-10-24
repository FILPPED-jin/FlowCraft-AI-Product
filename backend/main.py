import asyncio
import time

# Load environment variables first
from dotenv import load_dotenv

load_dotenv()


from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from config import IS_DEBUG_ENABLED
from routes import (
    capabilities,
    screenshot,
    generate_code,
    home,
    evals,
    export,
    design_systems,
    prompt_reports,
    agent_runs,
    eval_sets,
    flowcraft_visual,
    monitoring,
    benchmark_cases,
)
from monitoring import monitoring_store
from uploaded_assets import configure_uploaded_asset_routes

app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
configure_uploaded_asset_routes(app)


@app.on_event("startup")
async def log_debug_mode() -> None:
    debug_status = "ENABLED" if IS_DEBUG_ENABLED else "DISABLED"
    print(f"Backend startup complete. Debug mode is {debug_status}.")


@app.on_event("startup")
async def probe_screenshot_preview_on_startup() -> None:
    # Detect (and warm up) headless Chromium so the screenshot_preview tool is
    # only offered when it can actually run. Logs the outcome.
    from preview_screenshot import probe_screenshot_preview

    asyncio.create_task(probe_screenshot_preview())

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def record_request_metrics(request: Request, call_next):
    if request.url.path.startswith("/api/monitoring"):
        return await call_next(request)

    started_at = time.time()
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        monitoring_store.record(
            started_at=started_at,
            request_kind="http",
            method=request.method,
            path=request.url.path,
            status_code=500,
            duration_ms=(time.perf_counter() - started) * 1000,
            success=False,
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        raise

    monitoring_store.record(
        started_at=started_at,
        request_kind="http",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=(time.perf_counter() - started) * 1000,
        success=response.status_code < 400,
        error_type="HTTPError" if response.status_code >= 400 else None,
        error_message=(
            f"HTTP {response.status_code}" if response.status_code >= 400 else None
        ),
    )
    return response

# Add routes
app.include_router(generate_code.router)
app.include_router(screenshot.router)
app.include_router(home.router)
app.include_router(capabilities.router)
app.include_router(evals.router)
app.include_router(export.router)
app.include_router(design_systems.router)
app.include_router(prompt_reports.router)
app.include_router(agent_runs.router)
app.include_router(eval_sets.router)
app.include_router(flowcraft_visual.router)
app.include_router(monitoring.router)
app.include_router(benchmark_cases.router)
