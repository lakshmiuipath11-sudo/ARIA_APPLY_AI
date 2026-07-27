import io
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader

from app.models.profile import CandidateProfile


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}

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


def extract_text(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported resume format. Upload PDF, DOCX, or TXT."
        )

    if extension == ".pdf":
        return extract_pdf_text(content)

    if extension == ".docx":
        return extract_docx_text(content)

    return content.decode("utf-8", errors="ignore")


def first_match(pattern: str, text: str) -> str:
    match = re.search(pattern, text, re.IGNORECASE)

    if not match:
        return ""

    return match.group(1).strip()


def extract_name(text: str) -> tuple[str, str, str]:
    ignored_words = {
        "resume",
        "curriculum vitae",
        "profile",
        "professional summary",
    }

    for line in text.splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()

        if not cleaned:
            continue

        if cleaned.lower() in ignored_words:
            continue

        if "@" in cleaned or "http" in cleaned.lower():
            continue

        words = cleaned.split()

        if 2 <= len(words) <= 5 and all(
            re.fullmatch(r"[A-Za-z.'-]+", word)
            for word in words
        ):
            first_name = words[0]
            last_name = words[-1]

            return first_name, last_name, cleaned

    return "", "", ""


def extract_skills(text: str) -> str:
    found: list[str] = []

    for skill in KNOWN_SKILLS:
        if re.search(
            rf"\b{re.escape(skill)}\b",
            text,
            re.IGNORECASE,
        ):
            found.append(skill)

    return ", ".join(found)


def parse_resume(filename: str, content: bytes) -> CandidateProfile:
    text = extract_text(filename, content)

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
        r"(https?://(?:www\.)?linkedin\.com/in/[^\s,;]+)",
        text,
    )

    github = first_match(
        r"(https?://(?:www\.)?github\.com/[^\s,;]+)",
        text,
    )

    portfolio = first_match(
        r"(https?://(?!.*(?:linkedin|github))[^\s,;]+)",
        text,
    )

    experience_years = first_match(
        r"(\d{1,2}(?:\.\d+)?)\+?\s+years?(?:\s+of)?\s+experience",
        text,
    )

    designation = first_match(
        r"(?:current\s+(?:role|designation)|designation|job title)"
        r"\s*[:\-]\s*([^\n\r]+)",
        text,
    )

    current_company = first_match(
        r"(?:current\s+(?:company|employer)|company)"
        r"\s*[:\-]\s*([^\n\r]+)",
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
        portfolio=portfolio,
        currentCompany=current_company,
        designation=designation,
        experienceYears=experience_years,
        skills=extract_skills(text),
        resume=filename,
    )
