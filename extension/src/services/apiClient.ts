import type {
  CandidateProfile,
  ScanResult
} from "../types";

export interface SemanticMapping {
  id: string;
  canonicalField: string;
  confidence: number;
  reasoning: string;
}

export interface SemanticMapResponse {
  source: "ai" | "rules";
  mappings: SemanticMapping[];
}

const API_URL_KEY = "ariaApiBaseUrl";

const DEFAULT_API_BASE_URL =
  "https://ariaapplyai-production.up.railway.app";

export async function getApiBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(API_URL_KEY);

  return String(
    stored[API_URL_KEY] ?? DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

export async function saveApiBaseUrl(
  value: string
): Promise<void> {
  const normalized = value.trim().replace(/\/+$/, "");

  await chrome.storage.local.set({
    [API_URL_KEY]:
      normalized || DEFAULT_API_BASE_URL
  });
}

export async function healthCheck(): Promise<boolean> {
  const baseUrl = await getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/v1/health`
  );

  return response.ok;
}

export async function mapFieldsWithBackend(
  scan: ScanResult
): Promise<SemanticMapResponse> {
  const baseUrl = await getApiBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/v1/semantic/map`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(scan)
    }
  );

  if (!response.ok) {
    const message =
      await response.text().catch(() => "");

    throw new Error(
      `Semantic mapping failed: HTTP ${response.status}` +
      (message ? ` — ${message}` : "")
    );
  }

  return await response.json() as SemanticMapResponse;
}

export async function extractResumeProfile(
  file: File
): Promise<CandidateProfile> {
  const baseUrl = await getApiBaseUrl();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${baseUrl}/api/v1/resume/extract`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    let message = "";

    try {
      const errorBody = await response.json();
      message =
        errorBody.detail ??
        JSON.stringify(errorBody);
    } catch {
      message = await response.text();
    }

    throw new Error(
      `Resume extraction failed: HTTP ${response.status}` +
      (message ? ` — ${message}` : "")
    );
  }

  return await response.json() as CandidateProfile;
}
