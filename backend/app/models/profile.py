from pydantic import BaseModel


class CandidateProfile(BaseModel):
    firstName: str = ""
    lastName: str = ""
    fullName: str = ""

    email: str = ""
    phone: str = ""

    city: str = ""
    country: str = ""

    linkedin: str = ""
    github: str = ""
    portfolio: str = ""

    currentCompany: str = ""
    designation: str = ""

    experienceYears: str = ""
    noticePeriod: str = ""

    currentSalary: str = ""
    expectedSalary: str = ""

    skills: str = ""
    coverLetter: str = ""

    resume: str = ""
