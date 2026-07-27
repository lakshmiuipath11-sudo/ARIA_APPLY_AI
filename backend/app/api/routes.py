from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import Settings, get_settings
from app.models.profile import CandidateProfile
from app.models.semantic import SemanticMapRequest, SemanticMapResponse
from app.services.openai_mapper import GeminiSemanticMapper
from app.services.resume_parser import parse_resume


router = APIRouter()


@router.get("/health")
async def health(
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.post(
    "/semantic/map",
    response_model=SemanticMapResponse,
)
async def semantic_map(
    request: SemanticMapRequest,
    settings: Settings = Depends(get_settings),
) -> SemanticMapResponse:
    mapper = GeminiSemanticMapper(settings)
    return await mapper.map_fields(request)


@router.post(
    "/resume/extract",
    response_model=CandidateProfile,
)
async def extract_resume(
    file: UploadFile = File(...),
) -> CandidateProfile:
    filename = file.filename or "resume"

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded resume is empty.",
            )

        maximum_size = 10 * 1024 * 1024

        if len(content) > maximum_size:
            raise HTTPException(
                status_code=413,
                detail="Resume must be smaller than 10 MB.",
            )

        return parse_resume(
            filename=filename,
            content=content,
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Resume extraction failed.",
        ) from error

    finally:
        await file.close()
