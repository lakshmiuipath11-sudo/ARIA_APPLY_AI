export type CanonicalField =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "city"
  | "country"
  | "linkedin"
  | "github"
  | "portfolio"
  | "currentCompany"
  | "designation"
  | "experienceYears"
  | "noticePeriod"
  | "currentSalary"
  | "expectedSalary"
  | "skills"
  | "coverLetter"
  | "resume"
  | "unknown";

export interface ScannedField {
  id: string;
  tag: string;
  inputType: string;
  name: string;
  label: string;
  placeholder: string;
  ariaLabel: string;
  context: string;
  required: boolean;
  options?: string[];
  canonicalField: CanonicalField;
  confidence: number;
}

export interface ScanResult {
  url: string;
  title: string;
  scannedAt: string;
  fields: ScannedField[];
}

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  fullName: string;

  email: string;
  phone: string;

  city: string;
  country: string;

  linkedin: string;
  github: string;
  portfolio: string;

  currentCompany: string;
  designation: string;

  experienceYears: string;
  noticePeriod: string;

  currentSalary: string;
  expectedSalary: string;

  skills: string;
  coverLetter: string;

  resume: string;
}

export interface StoredCandidate {
  id: string;
  displayName: string;
  initials: string;
  resumeFileName: string;
  createdAt: string;
  updatedAt: string;
  profile: CandidateProfile;
}
