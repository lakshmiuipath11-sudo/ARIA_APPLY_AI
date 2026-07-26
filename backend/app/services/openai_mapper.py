import json

from openai import AsyncOpenAI

from app.core.config import Settings
from app.models.semantic import (
    SemanticMappedField,
    SemanticMapRequest,
    SemanticMapResponse,
)
from app.services.rule_mapper import map_with_rules


SYSTEM_PROMPT = """
You map job-application HTML fields to ARIA canonical candidate-profile fields.

Return strict JSON with this shape:
{
  "mappings": [
    {
      "id": "original field id",
      "canonicalField": "one allowed canonical value",
      "confidence": 0.0,
      "reasoning": "brief user-facing reason"
    }
  ]
}

Allowed canonical values:
firstName, lastName, fullName, email, phone, city, country, linkedin,
github, portfolio, currentCompany, designation, experienceYears,
noticePeriod, currentSalary, expectedSalary, skills, coverLetter,
resume, unknown.

Rules:
- Preserve every supplied field id exactly once.
- Use unknown when evidence is weak.
- Confidence must be between 0 and 1.
- Do not invent candidate values.
- Reasoning must be one short sentence, not hidden chain-of-thought.
"""


class OpenAISemanticMapper:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = (
            AsyncOpenAI(api_key=settings.openai_api_key)
            if settings.openai_api_key
            else None
        )

    async def map_fields(self, request: SemanticMapRequest) -> SemanticMapResponse:
        if not self.client:
            return SemanticMapResponse(
                source="rules",
                mappings=[map_with_rules(field) for field in request.fields],
            )

        compact_fields = [
            {
                "id": field.id,
                "tag": field.tag,
                "inputType": field.inputType,
                "name": field.name,
                "label": field.label,
                "placeholder": field.placeholder,
                "ariaLabel": field.ariaLabel,
                "context": field.context[:240],
                "options": (field.options or [])[:30],
            }
            for field in request.fields
        ]

        try:
            response = await self.client.responses.create(
                model=self.settings.openai_model,
                instructions=SYSTEM_PROMPT,
                input=json.dumps(
                    {
                        "page": {"url": request.url, "title": request.title},
                        "fields": compact_fields,
                    },
                    ensure_ascii=False,
                ),
                text={"format": {"type": "json_object"}},
            )

            payload = json.loads(response.output_text)
            raw_mappings = payload.get("mappings", [])
            parsed = [SemanticMappedField.model_validate(item) for item in raw_mappings]

            by_id = {item.id: item for item in parsed}
            complete = [
                by_id.get(field.id) or map_with_rules(field)
                for field in request.fields
            ]

            return SemanticMapResponse(source="ai", mappings=complete)
        except Exception:
            # The demo remains functional even if the model call or JSON parsing fails.
            return SemanticMapResponse(
                source="rules",
                mappings=[map_with_rules(field) for field in request.fields],
            )
