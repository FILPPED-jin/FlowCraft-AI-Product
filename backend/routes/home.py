from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/")
async def get_status():
    return HTMLResponse(
        content="<h3>FlowCraft AI backend is running correctly.</h3>"
    )
