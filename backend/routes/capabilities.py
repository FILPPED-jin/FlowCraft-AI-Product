from fastapi import APIRouter
from pydantic import BaseModel

from config import DEEPSEEK_API_KEY
from preview_screenshot import probe_screenshot_preview

router = APIRouter()


class Capabilities(BaseModel):
    screenshot_preview: bool
    deepseek_configured: bool


@router.get("/api/capabilities", response_model=Capabilities)
async def get_capabilities() -> Capabilities:
    """Backend feature availability for the frontend to reflect in settings."""
    return Capabilities(
        screenshot_preview=await probe_screenshot_preview(),
        deepseek_configured=bool(DEEPSEEK_API_KEY),
    )
