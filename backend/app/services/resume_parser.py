import io
import json
import re
from pathlib import Path

from docx import Document
from openai import OpenAI
from pypdf import PdfReader

from app.core.config import get_settings
from app.models.profile import CandidateProfile


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}

KNOWN_SKILLS = [
    "UiPath",
    "Python",
    "FastAPI",
    "React",
    "TypeScript",
    "JavaScript",
    "Azure",
    "AWS",
    "SAP",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "Docker",
    "Git",
    "GitHub",
    "Railway",
    "OpenAI",
    "LangGraph",
    "Power Automate",
    "Power Platform",
    "Automation Anywhere",
    "Blue Prism",
    "Machine Learning",
    "Artificial Intelligence",
]


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))

    pages: list[str] = []

    for page in reader.pages:
        pages.append(page.extract_text() or "")

    return "\n".join(pages)


def extract_docx_text(content: bytes) -> str:
    document = Document(io.BytesIO(content))

    paragraphs = [
        paragraph.text
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return "\n".join(paragraphs)


def extract_text(
    filename: str,
    content: bytes,
) -> str:
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported resume format. Upload PDF, DOCX, or TXT."
        )

    if extension == ".pdf":
        return extract_pdf_text(content)

    if extension == ".docx":
        return extract_docx_text(content)

    return content.decode(
        "utf-8",
        errors="ignore",
    )


def first_match(
    pattern: str,
    text: str,
) -> str:
    match = re.search(
        pattern,
        text,
        re.IGNORECASE,
    )

    if not match:
        return ""

    return match.group(1).strip()


def extract_name(
    text: str,
) -> tuple[str, str, str]:
    ignored_words = {
        "resume",
        "curriculum vitae",
        "profile",
        "professional summary",
    }

    for line in text.splitlines():
        cleaned = re.sub(
            r"\s+",
            " ",
            line,
        ).strip()

        if not cleaned:
            continue

        if cleaned.lower() in ignored_words:
            continue

        if "@" in cleaned:
            continue

        if "http" in cleaned.lower():
            continue

        words = cleaned.split()

        if 2 <= len(words) <= 5 and all(
            re.fullmatch(
                r"[A-Za-z.'-]+",
                word,
            )
            for word in words
        ):
            return (
                words[0],
                words[-1],
                cleaned,
            )

    return "", "", ""


def extract_skills(
    text: str,
) -> str:
    found: list[str] = []

    for skill in KNOWN_SKILLS:
        if re.search(
            rf"\b{re.escape(skill)}\b",
            text,
            re.IGNORECASE,
        ):
            found.append(skill)

    return ", ".join(found)


def regex_fallback(
    filename: str,
    text: str,
) -> CandidateProfile:
    first_name, last_name, full_name = extract_name(text)

    email = first_match(
        r"([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})",
        text,
    )

    phone = first_match(
        r"(\+?\d[\d\s().-]{8,}\d)",
        text,
    )

    linkedin = first_match(
        r"((?:https?://)?(?:www\.)?linkedin\.com/in/[^\s,;]+)",
        text,
    )

    github = first_match(
        r"((?:https?://)?(?:www\.)?github\.com/[^\s,;]+)",
        text,
    )

    experience_years = first_match(
        r"(\d{1,2}(?:\.\d+)?)\+?\s+years?"
        r"(?:\s+of)?\s+(?:total\s+)?experience",
        text,
    )

    return CandidateProfile(
        firstName=first_name,
        lastName=last_name,
        fullName=full_name,
        email=email,
        phone=phone,
        linkedin=linkedin,
        github=github,
        experienceYears=experience_years,
        skills=extract_skills(text),
        resume=filename,
    )


def clean_profile_payload(
    payload: dict,
    filename: str,
) -> CandidateProfile:
    allowed_fields = set(
        CandidateProfile.model_fields.keys()
    )

    cleaned = {
        key: value
        for key, value in payload.items()
        if key in allowed_fields
    }

    for key, value in cleaned.items():
        if value is None:
            cleaned[key] = ""
        elif isinstance(value, list):
            cleaned[key] = ", ".join(
                str(item)
                for item in value
            )
        elif not isinstance(value, str):
            cleaned[key] = str(value)

    cleaned["resume"] = filename

    return CandidateProfile(
        **cleaned
    )


def ai_extract_profile(
    filename: str,
    text: str,
) -> CandidateProfile | None:
    settings = get_settings()

    if not settings.openai_api_key:
        return None

    client = OpenAI(
        api_key=settings.openai_api_key
    )

    prompt = """
Extract the candidate profile from the resume text.

Return strict JSON only with these keys:

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

Rules:
- Use empty string when a value is not present.
- Do not invent information.
- currentCompany means the candidate's latest employer.
- designation means the candidate's latest job title.
- experienceYears must contain only the number as a string.
- skills must be a comma-separated string.
- noticePeriod, currentSalary and expectedSalary must remain empty unless explicitly present.
- resume must contain the uploaded filename.
"""

    response = client.responses.create(
        model=settings.openai_model,
        instructions=prompt,
        input=(
            f"Filename: {filename}\n\n"
            f"Resume text:\n{text[:30000]}"
        ),
        text={
            "format": {
                "type": "json_object"
            }
        },
    )

    payload = json.loads(
        response.output_text
    )

    return clean_profile_payload(
        payload,
        filename,
    )


def merge_profiles(
    primary: CandidateProfile,
    fallback: CandidateProfile,
) -> CandidateProfile:
    values: dict[str, str] = {}

    for field_name in CandidateProfile.model_fields:
        primary_value = getattr(
            primary,
            field_name,
            "",
        )

        fallback_value = getattr(
            fallback,
            field_name,
            "",
        )

        values[field_name] = (
            primary_value
            or fallback_value
            or ""
        )

    return CandidateProfile(
        **values
    )


def parse_resume(
    filename: str,
    content: bytes,
) -> CandidateProfile:
    text = extract_text(
        filename,
        content,
    )

    fallback = regex_fallback(
        filename,
        text,
    )

    try:
        ai_profile = ai_extract_profile(
            filename,
            text,
        )

        if ai_profile:
            return merge_profiles(
                ai_profile,
                fallback,
            )

    except Exception:
        pass

    return fallback
