import re

from app.models.semantic import RawField, SemanticMappedField


RULES: list[tuple[str, tuple[str, ...]]] = [
    ("firstName", (r"first[\s_-]*name", r"given[\s_-]*name")),
    ("lastName", (r"last[\s_-]*name", r"surname", r"family[\s_-]*name")),
    ("fullName", (r"full[\s_-]*name", r"^name$")),
    ("email", (r"e-?mail",)),
    ("phone", (r"phone", r"mobile", r"contact[\s_-]*number")),
    ("city", (r"\bcity\b", r"current[\s_-]*location")),
    ("country", (r"\bcountry\b", r"nationality")),
    ("linkedin", (r"linkedin",)),
    ("github", (r"github",)),
    ("portfolio", (r"portfolio", r"personal[\s_-]*website")),
    ("currentCompany", (r"current[\s_-]*(company|employer)", r"organization")),
    ("designation", (r"designation", r"job[\s_-]*title", r"current[\s_-]*role")),
    ("experienceYears", (r"years?.*experience", r"total.*experience")),
    ("noticePeriod", (r"notice[\s_-]*period", r"availability")),
    ("currentSalary", (r"current.*(salary|compensation|ctc)",)),
    ("expectedSalary", (r"expected.*(salary|compensation|ctc)",)),
    ("skills", (r"\bskills?\b", r"technolog")),
    ("coverLetter", (r"cover[\s_-]*letter", r"why.*(join|apply)")),
    ("resume", (r"resume", r"\bcv\b")),
]


def map_with_rules(field: RawField) -> SemanticMappedField:
    if field.inputType.lower() == "email":
        return SemanticMappedField(
            id=field.id,
            canonicalField="email",
            confidence=0.99,
            reasoning="The browser input type is email.",
        )

    if field.inputType.lower() == "tel":
        return SemanticMappedField(
            id=field.id,
            canonicalField="phone",
            confidence=0.99,
            reasoning="The browser input type is telephone.",
        )

    if field.inputType.lower() == "file":
        return SemanticMappedField(
            id=field.id,
            canonicalField="resume",
            confidence=0.84,
            reasoning="The field accepts a file upload.",
        )

    primary = " ".join(
        value for value in (field.label, field.ariaLabel, field.name, field.placeholder)
        if value
    )
    all_text = f"{primary} {field.context}".strip()

    for canonical, patterns in RULES:
        for pattern in patterns:
            if re.search(pattern, all_text, re.IGNORECASE):
                primary_match = bool(re.search(pattern, primary, re.IGNORECASE))
                return SemanticMappedField(
                    id=field.id,
                    canonicalField=canonical,  # type: ignore[arg-type]
                    confidence=0.93 if primary_match else 0.76,
                    reasoning="Mapped from the field label, name, placeholder, or nearby context.",
                )

    return SemanticMappedField(
        id=field.id,
        canonicalField="unknown",
        confidence=0.20,
        reasoning="No reliable canonical-field match was found.",
    )
