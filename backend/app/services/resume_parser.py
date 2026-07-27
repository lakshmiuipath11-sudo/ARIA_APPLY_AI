import io
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader

from app.models.profile import CandidateProfile


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}


INVALID_NAME_HEADINGS = {
    "PERSONAL INFORMATION",
    "PERSONAL DETAILS",
    "PERSONAL PROFILE",
    "CURRICULUM VITAE",
    "CURRICULUM VITAE CV",
    "RESUME",
    "CV",
    "PROFILE",
    "PROFESSIONAL PROFILE",
    "PROFESSIONAL SUMMARY",
    "CAREER SUMMARY",
    "SUMMARY",
    "ABOUT",
    "ABOUT ME",
    "CONTACT",
    "CONTACT DETAILS",
    "CAREER OBJECTIVE",
    "OBJECTIVE",
    "EDUCATION",
    "EDUCATIONAL QUALIFICATION",
    "WORK EXPERIENCE",
    "EXPERIENCE",
    "EMPLOYMENT HISTORY",
    "TECHNICAL SKILLS",
    "SKILLS",
    "DECLARATION",
}


FILENAME_IGNORE_WORDS = {
    "resume",
    "cv",
    "curriculum",
    "vitae",
    "profile",
    "latest",
    "updated",
    "final",
    "new",
    "copy",
    "professional",
    "personal",
    "information",
    "uipath",
    "python",
    "developer",
    "engineer",
    "architect",
    "automation",
    "rpa",
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
    "Agentic AI",
    "REST API",
    "Microsoft Graph",
    "Orchestrator",
    "REFramework",
    "Document Understanding",
    "AI Center",
    "Maestro",
]


def clean_text(value: str | None) -> str:
    """Normalize whitespace and remove null characters."""
    if not value:
        return ""

    return re.sub(
        r"\s+",
        " ",
        value.replace("\x00", " "),
    ).strip()


def normalize_heading(value: str) -> str:
    """Convert text into a comparable heading format."""
    normalized = re.sub(
        r"[^A-Za-z ]+",
        " ",
        value,
    )

    return clean_text(normalized).upper()


def is_invalid_name(value: str) -> bool:
    """Return True when the value looks like a resume heading."""
    normalized = normalize_heading(value)

    if not normalized:
        return True

    if normalized in INVALID_NAME_HEADINGS:
        return True

    words = normalized.split()

    if len(words) > 5:
        return True

    invalid_phrases = (
        "PERSONAL INFORMATION",
        "PERSONAL DETAILS",
        "PROFESSIONAL SUMMARY",
        "CAREER OBJECTIVE",
        "WORK EXPERIENCE",
        "TECHNICAL SKILLS",
        "EDUCATIONAL QUALIFICATION",
    )

    return any(
        phrase in normalized
        for phrase in invalid_phrases
    )


def extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF resume."""
    reader = PdfReader(io.BytesIO(content))

    pages: list[str] = []

    for page in reader.pages:
        pages.append(page.extract_text() or "")

    return "\n".join(pages)


def extract_docx_text(content: bytes) -> str:
    """Extract text from paragraphs and tables in a DOCX resume."""
    document = Document(io.BytesIO(content))

    values: list[str] = []

    for paragraph in document.paragraphs:
        text = clean_text(paragraph.text)

        if text:
            values.append(text)

    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                text = clean_text(cell.text)

                if text:
                    values.append(text)

    return "\n".join(values)


def extract_text(
    filename: str,
    content: bytes,
) -> str:
    """Extract text based on the uploaded resume extension."""
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported resume format. "
            "Upload a PDF, DOCX, or TXT file."
        )

    if extension == ".pdf":
        text = extract_pdf_text(content)

    elif extension == ".docx":
        text = extract_docx_text(content)

    else:
        text = content.decode(
            "utf-8",
            errors="ignore",
        )

    if not clean_text(text):
        raise ValueError(
            "No readable text was found in the resume."
        )

    return text


def first_match(
    pattern: str,
    text: str,
    flags: int = re.IGNORECASE,
) -> str:
    """Return the first captured group from a regex match."""
    match = re.search(
        pattern,
        text,
        flags,
    )

    if not match:
        return ""

    return clean_text(match.group(1))


def remove_trailing_punctuation(value: str) -> str:
    return value.rstrip(".,;:|)]}>")


def extract_email(text: str) -> str:
    return remove_trailing_punctuation(
        first_match(
            r"\b([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})\b",
            text,
        )
    )


def extract_phone(text: str) -> str:
    candidates = re.findall(
        r"(?<!\d)"
        r"(\+?\d[\d\s().\-]{7,}\d)"
        r"(?!\d)",
        text,
    )

    for candidate in candidates:
        cleaned = clean_text(candidate)

        digits = re.sub(
            r"\D",
            "",
            cleaned,
        )

        if 10 <= len(digits) <= 15:
            return cleaned

    return ""


def extract_linkedin(text: str) -> str:
    value = first_match(
        r"((?:https?://)?"
        r"(?:www\.)?"
        r"linkedin\.com/in/"
        r"[A-Za-z0-9_%\-]+"
        r"/?)",
        text,
    )

    return remove_trailing_punctuation(value)


def extract_github(text: str) -> str:
    value = first_match(
        r"((?:https?://)?"
        r"(?:www\.)?"
        r"github\.com/"
        r"[A-Za-z0-9_.\-]+"
        r"/?)",
        text,
    )

    return remove_trailing_punctuation(value)


def extract_portfolio(text: str) -> str:
    urls = re.findall(
        r"(https?://[^\s<>()]+)",
        text,
        re.IGNORECASE,
    )

    for url in urls:
        lower_url = url.lower()

        if (
            "linkedin.com" not in lower_url
            and "github.com" not in lower_url
        ):
            return remove_trailing_punctuation(url)

    return ""


def candidate_name_from_filename(
    filename: str,
) -> str:
    """
    Derive a safe candidate name from the filename.

    Example:
    Soujanya_CV_UiPath.pdf -> Soujanya
    """
    stem = Path(filename).stem

    stem = re.sub(
        r"\(\d+\)$",
        "",
        stem,
    )

    stem = re.sub(
        r"[\[\]{}()]",
        " ",
        stem,
    )

    tokens = re.split(
        r"[_\-\s]+",
        stem,
    )

    usable_tokens: list[str] = []

    for token in tokens:
        cleaned = re.sub(
            r"[^A-Za-z.' ]",
            "",
            token,
        ).strip()

        if not cleaned:
            continue

        if cleaned.lower() in FILENAME_IGNORE_WORDS:
            continue

        if cleaned.isdigit():
            continue

        usable_tokens.append(cleaned)

    if not usable_tokens:
        return ""

    # Usually the first one to three usable filename words represent the name.
    usable_tokens = usable_tokens[:3]

    return " ".join(
        word.capitalize()
        for word in usable_tokens
    )


def looks_like_person_name(value: str) -> bool:
    """Validate whether a line could reasonably be a person's name."""
    cleaned = clean_text(value)

    if not cleaned:
        return False

    if is_invalid_name(cleaned):
        return False

    if any(
        marker in cleaned.lower()
        for marker in (
            "@",
            "http://",
            "https://",
            "linkedin",
            "github",
            "phone",
            "mobile",
            "email",
        )
    ):
        return False

    if ":" in cleaned:
        return False

    words = cleaned.split()

    if not 1 <= len(words) <= 5:
        return False

    for word in words:
        if not re.fullmatch(
            r"[A-Za-z][A-Za-z.'\-]*",
            word,
        ):
            return False

    return True


def extract_name_from_text(text: str) -> str:
    """Search early resume lines for a valid candidate name."""
    lines = [
        clean_text(line)
        for line in text.splitlines()
        if clean_text(line)
    ]

    # Candidate names normally occur near the start of a resume.
    for line in lines[:30]:
        if looks_like_person_name(line):
            return line

    return ""


def split_full_name(
    full_name: str,
) -> tuple[str, str, str]:
    cleaned = clean_text(full_name)

    if not cleaned or is_invalid_name(cleaned):
        return "", "", ""

    words = cleaned.split()

    if len(words) == 1:
        return (
            words[0],
            "",
            cleaned,
        )

    return (
        words[0],
        " ".join(words[1:]),
        cleaned,
    )


def extract_name(
    text: str,
    filename: str,
) -> tuple[str, str, str]:
    """
    Resolve the candidate name.

    Priority:
    1. Valid name near the beginning of the resume.
    2. Safe name derived from the filename.
    """
    extracted_name = extract_name_from_text(text)

    if extracted_name:
        result = split_full_name(extracted_name)

        if result[2]:
            return result

    filename_name = candidate_name_from_filename(
        filename
    )

    if filename_name:
        return split_full_name(filename_name)

    return "", "", ""


def extract_labeled_value(
    labels: list[str],
    text: str,
) -> str:
    """Extract a value appearing after a known label."""
    label_pattern = "|".join(
        re.escape(label)
        for label in labels
    )

    pattern = (
        rf"(?:{label_pattern})"
        rf"\s*[:\-]\s*"
        rf"([^\n\r|]+)"
    )

    return first_match(pattern, text)


def extract_city(text: str) -> str:
    return extract_labeled_value(
        [
            "City",
            "Current City",
            "Current Location",
            "Location",
        ],
        text,
    )


def extract_country(text: str) -> str:
    return extract_labeled_value(
        [
            "Country",
            "Nationality",
        ],
        text,
    )


def extract_current_company(text: str) -> str:
    value = extract_labeled_value(
        [
            "Current Company",
            "Current Employer",
            "Present Company",
            "Present Employer",
            "Organization",
        ],
        text,
    )

    return value


def extract_designation(text: str) -> str:
    return extract_labeled_value(
        [
            "Current Designation",
            "Current Role",
            "Current Job Title",
            "Designation",
            "Job Title",
            "Role",
        ],
        text,
    )


def extract_experience_years(text: str) -> str:
    patterns = [
        (
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
            r"\s+(?:of\s+)?"
            r"(?:total\s+)?experience"
        ),
        (
            r"(?:total\s+)?experience"
            r"\s*[:\-]?\s*"
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
        ),
        (
            r"professional\s+with\s+"
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
        ),
    ]

    for pattern in patterns:
        value = first_match(
            pattern,
            text,
        )

        if value:
            return value

    return ""


def extract_notice_period(text: str) -> str:
    return extract_labeled_value(
        [
            "Notice Period",
            "Availability",
            "Available From",
        ],
        text,
    )


def extract_current_salary(text: str) -> str:
    return extract_labeled_value(
        [
            "Current Salary",
            "Current CTC",
            "Current Compensation",
        ],
        text,
    )


def extract_expected_salary(text: str) -> str:
    return extract_labeled_value(
        [
            "Expected Salary",
            "Expected CTC",
            "Expected Compensation",
        ],
        text,
    )


def extract_skills(text: str) -> str:
    found: list[str] = []

    for skill in KNOWN_SKILLS:
        if re.search(
            rf"(?<![A-Za-z0-9])"
            rf"{re.escape(skill)}"
            rf"(?![A-Za-z0-9])",
            text,
            re.IGNORECASE,
        ):
            found.append(skill)

    return ", ".join(found)


def parse_resume(
    filename: str,
    content: bytes,
) -> CandidateProfile:
    """
    Parse an uploaded resume and return a CandidateProfile.

    This function does not invent missing values.
    """
    text = extract_text(
        filename=filename,
        content=content,
    )

    first_name, last_name, full_name = extract_name(
        text=text,
        filename=filename,
    )

    return CandidateProfile(
        firstName=first_name,
        lastName=last_name,
        fullName=full_name,
        email=extract_email(text),
        phone=extract_phone(text),
        city=extract_city(text),
        country=extract_country(text),
        linkedin=extract_linkedin(text),
        github=extract_github(text),
        portfolio=extract_portfolio(text),
        currentCompany=extract_current_company(text),
        designation=extract_designation(text),
        experienceYears=extract_experience_years(text),
        noticePeriod=extract_notice_period(text),
        currentSalary=extract_current_salary(text),
        expectedSalary=extract_expected_salary(text),
        skills=extract_skills(text),
        coverLetter="",
        resume=filename,
    )
