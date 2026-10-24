from __future__ import annotations
import os
import shutil
from pathlib import Path


DEFAULT_DATA_DIR = Path(
    os.environ.get(
        "FLOWCRAFT_DATA_DIR",
        Path(__file__).resolve().parent.parent / ".flowcraft-runtime",
    )
)
DATABASE_PATH = DEFAULT_DATA_DIR / "flowcraft.sqlite3"
LEGACY_MONITORING_PATH = DEFAULT_DATA_DIR / "monitoring.sqlite3"


def prepare_database_path() -> Path:
    DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATABASE_PATH.exists() and LEGACY_MONITORING_PATH.exists():
        shutil.copy2(LEGACY_MONITORING_PATH, DATABASE_PATH)
    return DATABASE_PATH
