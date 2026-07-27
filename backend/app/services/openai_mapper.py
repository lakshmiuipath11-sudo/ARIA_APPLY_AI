import json

from google import genai

from app.core.config import Settings
from app.models.semantic import (
    SemanticMappedField,
    SemanticMapRequest,
    SemanticMapResponse,
)
from app.services.rule_mapper import map_with_rules


SYSTEM_PROMPT = """
You map job-application HTML fields to ARIA canonical candidate-profile fields.

Return ONLY valid JSON.

Format:

{
  "mappings": [
    {
      "id": "original field id",
      "canonicalField": "firstName",
      "confidence": 0.98,
      "reasoning": "Matched using field label."
    }
  ]
}

Allowed canonical values:

firstName
lastName
fullName
email
phone
city
country
linkedin
github
portfolio
currentCompany
designation
experienceYears
noticePeriod
currentSalary
expectedSalary
skills
coverLetter
resume
unknown

Rules:

- Preserve every supplied field id exactly once.
- Never invent fields.
- Use "unknown" if uncertain.
- Confidence must be between 0 and 1.
- Return JSON ONLY.
"""


class GeminiSemanticMapper:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        self.client = (
            genai.Client(
                api_key=settings.gemini_api_key
            )
            if settings.gemini_api_key
            else None
        )

    async def map_fields(
        self,
        request: SemanticMapRequest,
    ) -> SemanticMapResponse:

        if not self.client:
            return SemanticMapResponse(
                source="rules",
                mappings=[
                    map_with_rules(field)
                    for field in request.fields
                ],
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

            prompt = json.dumps(
                {
                    "page": {
                        "url": request.url,
                        "title": request.title,
                    },
                    "fields": compact_fields,
                },
                ensure_ascii=False,
            )

            response = self.client.models.generate_content(
                model=self.settings.gemini_model,
                contents=prompt,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "response_mime_type": "application/json",
                },
            )

            payload = json.loads(response.text)

            raw_mappings = payload.get(
                "mappings",
                [],
            )

            parsed = [
                SemanticMappedField.model_validate(
                    item
                )
                for item in raw_mappings
            ]

            by_id = {
                item.id: item
                for item in parsed
            }

            complete = [
                by_id.get(field.id)
                or map_with_rules(field)
                for field in request.fields
            ]

            return SemanticMapResponse(
                source="ai",
                mappings=complete,
            )

        except Exception as error:

            print(
                f"Gemini mapper error: {error}"
            )

            return SemanticMapResponse(
                source="rules",
                mappings=[
                    map_with_rules(field)
                    for field in request.fields
                ],
            )
