from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.models.semantic import SemanticMapRequest, SemanticMapResponse
from app.services.openai_mapper import OpenAISemanticMapper


router = APIRouter()


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.post("/semantic/map", response_model=SemanticMapResponse)
async def semantic_map(
    request: SemanticMapRequest,
    settings: Settings = Depends(get_settings),
) -> SemanticMapResponse:
    mapper = OpenAISemanticMapper(settings)
    return await mapper.map_fields(request)
