import type {
  CandidateProfile,
  StoredCandidate
} from "../types";

const CANDIDATES_KEY = "ariaCandidateProfiles";
const SELECTED_CANDIDATE_KEY =
  "ariaSelectedCandidateId";
const SETUP_COMPLETE_KEY =
  "ariaSetupComplete";

const MEMORY_FIELDS: Array<keyof CandidateProfile> = [
  "noticePeriod",
  "currentSalary",
  "expectedSalary",
  "coverLetter"
];

function normalizeName(
  profile: CandidateProfile,
  resumeFileName: string
): string {
  const fullName = profile.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  const combinedName = [
    profile.firstName?.trim(),
    profile.lastName?.trim()
  ]
    .filter(Boolean)
    .join(" ");

  if (combinedName) {
    return combinedName;
  }

  return (
    resumeFileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    "ARIA Candidate"
  );
}

function createInitials(
  displayName: string
): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "A";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
}

function cleanProfileValue(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function preserveCandidateMemory(
  currentProfile: CandidateProfile,
  incomingProfile: CandidateProfile
): CandidateProfile {
  const mergedProfile: CandidateProfile = {
    ...currentProfile,
    ...incomingProfile
  };

  for (const field of MEMORY_FIELDS) {
    const incomingValue = cleanProfileValue(
      incomingProfile[field]
    );

    const currentValue = cleanProfileValue(
      currentProfile[field]
    );

    mergedProfile[field] = (
      incomingValue || currentValue
    ) as never;
  }

  return mergedProfile;
}

export async function getCandidates():
Promise<StoredCandidate[]> {
  const result =
    await chrome.storage.local.get(
      CANDIDATES_KEY
    );

  const candidates =
    result[CANDIDATES_KEY];

  return Array.isArray(candidates)
    ? candidates as StoredCandidate[]
    : [];
}

export async function getCandidateById(
  candidateId: string
): Promise<StoredCandidate | null> {
  const candidates =
    await getCandidates();

  return (
    candidates.find(
      candidate =>
        candidate.id === candidateId
    ) ?? null
  );
}

export async function getSelectedCandidate():
Promise<StoredCandidate | null> {
  const result =
    await chrome.storage.local.get(
      SELECTED_CANDIDATE_KEY
    );

  const selectedId = String(
    result[SELECTED_CANDIDATE_KEY] ?? ""
  );

  if (!selectedId) {
    return null;
  }

  return getCandidateById(selectedId);
}

export async function selectCandidate(
  candidateId: string
): Promise<void> {
  const candidate =
    await getCandidateById(candidateId);

  if (!candidate) {
    throw new Error(
      "The selected candidate profile was not found."
    );
  }

  await chrome.storage.local.set({
    [SELECTED_CANDIDATE_KEY]:
      candidateId
  });
}

export async function addCandidate(
  profile: CandidateProfile,
  resumeFileName: string
): Promise<StoredCandidate> {
  const candidates =
    await getCandidates();

  const timestamp =
    new Date().toISOString();

  const displayName =
    normalizeName(
      profile,
      resumeFileName
    );

  const candidate: StoredCandidate = {
    id: crypto.randomUUID(),
    displayName,
    initials:
      createInitials(displayName),
    resumeFileName,
    createdAt: timestamp,
    updatedAt: timestamp,
    profile: {
      ...profile,
      resume:
        profile.resume ||
        resumeFileName
    }
  };

  const updatedCandidates = [
    ...candidates,
    candidate
  ];

  await chrome.storage.local.set({
    [CANDIDATES_KEY]:
      updatedCandidates,
    [SETUP_COMPLETE_KEY]: true
  });

  if (updatedCandidates.length === 1) {
    await chrome.storage.local.set({
      [SELECTED_CANDIDATE_KEY]:
        candidate.id
    });
  }

  return candidate;
}

export async function updateCandidate(
  candidateId: string,
  profile: CandidateProfile,
  resumeFileName?: string
): Promise<StoredCandidate> {
  const candidates =
    await getCandidates();

  const index =
    candidates.findIndex(
      candidate =>
        candidate.id === candidateId
    );

  if (index < 0) {
    throw new Error(
      "Candidate profile not found."
    );
  }

  const current =
    candidates[index];

  const finalResumeName =
    resumeFileName ||
    current.resumeFileName;

  const mergedProfile =
    preserveCandidateMemory(
      current.profile,
      profile
    );

  const displayName =
    normalizeName(
      mergedProfile,
      finalResumeName
    );

  const updatedCandidate:
  StoredCandidate = {
    ...current,
    displayName,
    initials:
      createInitials(displayName),
    resumeFileName:
      finalResumeName,
    updatedAt:
      new Date().toISOString(),
    profile: {
      ...mergedProfile,
      resume:
        mergedProfile.resume ||
        finalResumeName
    }
  };

  const updatedCandidates = [
    ...candidates
  ];

  updatedCandidates[index] =
    updatedCandidate;

  await chrome.storage.local.set({
    [CANDIDATES_KEY]:
      updatedCandidates
  });

  return updatedCandidate;
}

export async function updateCandidateMemory(
  candidateId: string,
  memory: Partial<CandidateProfile>
): Promise<StoredCandidate> {
  const candidate =
    await getCandidateById(candidateId);

  if (!candidate) {
    throw new Error(
      "Candidate profile not found."
    );
  }

  const memoryUpdate:
  Partial<CandidateProfile> = {};

  for (const field of MEMORY_FIELDS) {
    const value = cleanProfileValue(
      memory[field]
    );

    if (value) {
      memoryUpdate[field] =
        value as never;
    }
  }

  return updateCandidate(
    candidateId,
    {
      ...candidate.profile,
      ...memoryUpdate
    },
    candidate.resumeFileName
  );
}

export async function deleteCandidate(
  candidateId: string
): Promise<void> {
  const candidates =
    await getCandidates();

  const remaining =
    candidates.filter(
      candidate =>
        candidate.id !== candidateId
    );

  const selectedCandidate =
    await getSelectedCandidate();

  const updates:
  Record<string, unknown> = {
    [CANDIDATES_KEY]: remaining,
    [SETUP_COMPLETE_KEY]:
      remaining.length > 0
  };

  if (
    selectedCandidate?.id ===
    candidateId
  ) {
    updates[SELECTED_CANDIDATE_KEY] =
      remaining[0]?.id ?? "";
  }

  await chrome.storage.local.set(
    updates
  );
}

export async function getSetupComplete():
Promise<boolean> {
  const result =
    await chrome.storage.local.get(
      SETUP_COMPLETE_KEY
    );

  return Boolean(
    result[SETUP_COMPLETE_KEY]
  );
}

export async function clearAllCandidates():
Promise<void> {
  await chrome.storage.local.remove([
    CANDIDATES_KEY,
    SELECTED_CANDIDATE_KEY,
    SETUP_COMPLETE_KEY
  ]);
}
