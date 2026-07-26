import type { CandidateProfile } from "../types";

const PROFILE_KEY = "ariaCandidateProfile";

export const emptyProfile: CandidateProfile = {
  firstName: "", lastName: "", fullName: "", email: "", phone: "",
  city: "", country: "", linkedin: "", github: "", portfolio: "",
  currentCompany: "", designation: "", experienceYears: "",
  noticePeriod: "", currentSalary: "", expectedSalary: "",
  skills: "", coverLetter: ""
};

export async function getProfile(): Promise<CandidateProfile> {
  const result = await chrome.storage.local.get(PROFILE_KEY);
  return { ...emptyProfile, ...(result[PROFILE_KEY] ?? {}) };
}

export async function saveProfile(profile: CandidateProfile): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
}
