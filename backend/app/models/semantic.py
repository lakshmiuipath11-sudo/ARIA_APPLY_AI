from typing import Literal

from pydantic import BaseModel, Field


CanonicalField = Literal[
    "firstName",
    "lastName",
    "fullName",
    "email",
    "phone",
    "city",
    "country",
    "linkedin",
    "github",
    "portfolio",
    "currentCompany",
    "designation",
    "experienceYears",
    "noticePeriod",
    "currentSalary",
    "expectedSalary",
    "skills",
    "coverLetter",
    "resume",
    "unknown",
]


class RawField(BaseModel):
    id: str
    tag: str = ""
    inputType: str = ""
    name: str = ""
    label: str = ""
    placeholder: str = ""
    ariaLabel: str = ""
    context: str = ""
    required: bool = False
    options: list[str] | None = None
    canonicalField: CanonicalField = "unknown"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class SemanticMapRequest(BaseModel):
    url: str
    title: str = ""
    fields: list[RawField]


class SemanticMappedField(BaseModel):
    id: str
    canonicalField: CanonicalField
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(
        default="",
        description="Short user-facing explanation. Never include hidden chain of thought.",
    )


class SemanticMapResponse(BaseModel):
    source: Literal["ai", "rules"]
    mappings: list[SemanticMappedField]
