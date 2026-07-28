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
    "Gemini",
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


JOB_TITLE_PATTERNS = [
    "Senior Intelligent Automation Architect",
    "Intelligent Automation Architect",
    "Solution Architect",
    "Technical Architect",
    "Automation Architect",
    "Technical Lead",
    "Team Lead",
    "Project Lead",
    "Senior Consultant",
    "Consultant",
    "Senior Developer",
    "Software Developer",
    "UiPath Developer",
    "RPA Developer",
    "Python Developer",
    "Software Engineer",
    "Automation Engineer",
    "RPA Engineer",
    "Business Analyst",
    "Data Analyst",
    "Project Manager",
    "Program Manager",
    "Manager",
    "Architect",
    "Developer",
    "Engineer",
    "Analyst",
]


COMPANY_SUFFIXES = (
    "limited",
    "ltd",
    "ltd.",
    "private limited",
    "pvt ltd",
    "pvt. ltd.",
    "inc",
    "inc.",
    "llc",
    "corporation",
    "corp",
    "corp.",
    "technologies",
    "technology",
    "solutions",
    "services",
    "systems",
    "consulting",
    "consultancy",
)


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
    """Convert text into a comparable uppercase heading."""
    normalized = re.sub(
        r"[^A-Za-z ]+",
        " ",
        value,
    )

    return clean_text(normalized).upper()


def text_lines(text: str) -> list[str]:
    """Return non-empty resume lines with normalized whitespace."""
    return [
        clean_text(line)
        for line in text.splitlines()
        if clean_text(line)
    ]


def is_invalid_name(value: str) -> bool:
    """Return True when a value looks like a resume section heading."""
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
    """Extract text from DOCX paragraphs and tables."""
    document = Document(io.BytesIO(content))

    values: list[str] = []

    for paragraph in document.paragraphs:
        value = clean_text(paragraph.text)

        if value:
            values.append(value)

    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                value = clean_text(cell.text)

                if value:
                    values.append(value)

    return "\n".join(values)


def extract_text(
    filename: str,
    content: bytes,
) -> str:
    """Extract text based on the resume file extension."""
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
    """Return the first regex capture group."""
    match = re.search(
        pattern,
        text,
        flags,
    )

    if not match:
        return ""

    return clean_text(match.group(1))


def remove_trailing_punctuation(
    value: str,
) -> str:
    return value.rstrip(".,;:|)]}>")


def extract_email(text: str) -> str:
    value = first_match(
        r"\b([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})\b",
        text,
    )

    return remove_trailing_punctuation(value)


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

    return " ".join(
        word.capitalize()
        for word in usable_tokens[:3]
    )


def looks_like_person_name(
    value: str,
) -> bool:
    """Validate whether a line could represent a person's name."""
    cleaned = clean_text(value)

    if not cleaned:
        return False

    if is_invalid_name(cleaned):
        return False

    lowered = cleaned.lower()

    invalid_markers = (
        "@",
        "http://",
        "https://",
        "linkedin",
        "github",
        "phone",
        "mobile",
        "email",
        "summary",
        "experience",
        "objective",
        "skills",
        "education",
    )

    if any(
        marker in lowered
        for marker in invalid_markers
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


def extract_name_from_text(
    text: str,
) -> str:
    """Search early resume lines for a valid candidate name."""
    lines = text_lines(text)

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
    Resolve candidate name.

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


def clean_profile_value(
    value: str,
) -> str:
    """Clean extracted profile values and reject obvious headings."""
    cleaned = clean_text(value)

    cleaned = re.sub(
        r"\s{2,}",
        " ",
        cleaned,
    )

    cleaned = cleaned.strip(
        " -–—:;,|"
    )

    if not cleaned:
        return ""

    normalized = normalize_heading(cleaned)

    invalid_values = {
        "WORK EXPERIENCE",
        "PROFESSIONAL EXPERIENCE",
        "EMPLOYMENT HISTORY",
        "CURRENT COMPANY",
        "CURRENT EMPLOYER",
        "CURRENT DESIGNATION",
        "CURRENT ROLE",
        "JOB TITLE",
        "DESIGNATION",
    }

    if normalized in invalid_values:
        return ""

    return cleaned


def extract_city(text: str) -> str:
    return clean_profile_value(
        extract_labeled_value(
            [
                "Current City",
                "Current Location",
                "City",
                "Location",
            ],
            text,
        )
    )


def extract_country(text: str) -> str:
    return clean_profile_value(
        extract_labeled_value(
            [
                "Country",
                "Nationality",
            ],
            text,
        )
    )


def looks_like_company_name(
    value: str,
) -> bool:
    cleaned = clean_profile_value(value)

    if not cleaned:
        return False

    lowered = cleaned.lower()

    if len(cleaned) > 100:
        return False

    if any(
        heading.lower() == lowered
        for heading in INVALID_NAME_HEADINGS
    ):
        return False

    if any(
        suffix in lowered
        for suffix in COMPANY_SUFFIXES
    ):
        return True

    words = cleaned.split()

    return (
        1 <= len(words) <= 8
        and not re.search(
            r"\b(?:years?|months?|responsibilities|project|skills)\b",
            lowered,
        )
    )


def extract_current_company(
    text: str,
) -> str:
    """Extract the current or most recent employer."""
    labeled_value = extract_labeled_value(
        [
            "Current Company",
            "Current Employer",
            "Present Company",
            "Present Employer",
            "Organization",
            "Employer",
            "Company",
        ],
        text,
    )

    labeled_value = clean_profile_value(
        labeled_value
    )

    if looks_like_company_name(
        labeled_value
    ):
        return labeled_value

    lines = text_lines(text)

    at_patterns = [
        (
            r"\b(?:working|currently working|employed)"
            r"\s+(?:with|at)\s+(.+)$"
        ),
        (
            r"\b(?:architect|developer|engineer|consultant|manager|lead)"
            r"\s+(?:with|at)\s+(.+)$"
        ),
    ]

    for line in lines:
        for pattern in at_patterns:
            match = re.search(
                pattern,
                line,
                re.IGNORECASE,
            )

            if not match:
                continue

            candidate = clean_profile_value(
                match.group(1)
            )

            candidate = re.split(
                r"\s+(?:since|from)\s+",
                candidate,
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0]

            if looks_like_company_name(candidate):
                return candidate

    experience_headings = {
        "WORK EXPERIENCE",
        "PROFESSIONAL EXPERIENCE",
        "EMPLOYMENT HISTORY",
        "EXPERIENCE",
    }

    for index, line in enumerate(lines):
        if normalize_heading(line) not in experience_headings:
            continue

        for nearby_line in lines[
            index + 1:index + 12
        ]:
            candidate = clean_profile_value(
                nearby_line
            )

            if any(
                title.lower() in candidate.lower()
                for title in JOB_TITLE_PATTERNS
            ):
                continue

            if looks_like_company_name(candidate):
                return candidate

    return ""


def extract_designation(
    text: str,
) -> str:
    """Extract current or most recent job title."""
    labeled_value = extract_labeled_value(
        [
            "Current Designation",
            "Current Role",
            "Current Job Title",
            "Designation",
            "Job Title",
            "Role",
            "Position",
        ],
        text,
    )

    labeled_value = clean_profile_value(
        labeled_value
    )

    if labeled_value:
        return labeled_value

    lines = text_lines(text)

    for line in lines:
        normalized_line = clean_profile_value(
            line
        )

        if not normalized_line:
            continue

        for title in JOB_TITLE_PATTERNS:
            match = re.search(
                rf"\b{re.escape(title)}\b",
                normalized_line,
                re.IGNORECASE,
            )

            if not match:
                continue

            before_title = normalized_line[
                :match.start()
            ].strip()

            if (
                before_title
                and len(before_title.split()) > 5
            ):
                continue

            return match.group(0)

    return ""


def extract_experience_years(
    text: str,
) -> str:
    """Extract total years of professional experience."""
    patterns = [
        (
            r"(?:total\s+)?(?:professional\s+)?experience"
            r"\s*[:\-]?\s*"
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
        ),
        (
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
            r"\s+(?:of\s+)?"
            r"(?:total\s+)?"
            r"(?:professional\s+)?experience"
        ),
        (
            r"(?:over|more\s+than|around|approximately)"
            r"\s+(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
            r"(?:\s+of)?\s+experience"
        ),
        (
            r"(?:professional|specialist|architect|developer|engineer)"
            r"\s+with\s+"
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
        ),
        (
            r"(\d{1,2}(?:\.\d+)?)\+?"
            r"\s*(?:years?|yrs?)"
            r"\s+in\s+(?:it|software|automation|technology)"
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


def extract_notice_period(
    text: str,
) -> str:
    return clean_profile_value(
        extract_labeled_value(
            [
                "Notice Period",
                "Availability",
                "Available From",
            ],
            text,
        )
    )


def extract_current_salary(
    text: str,
) -> str:
    return clean_profile_value(
        extract_labeled_value(
            [
                "Current Salary",
                "Current CTC",
                "Current Compensation",
            ],
            text,
        )
    )


def extract_expected_salary(
    text: str,
) -> str:
    return clean_profile_value(
        extract_labeled_value(
            [
                "Expected Salary",
                "Expected CTC",
                "Expected Compensation",
            ],
            text,
        )
    )


def extract_skills(text: str) -> str:
    """Extract known skills without returning duplicates."""
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

    Missing values remain empty. The parser does not invent information.
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