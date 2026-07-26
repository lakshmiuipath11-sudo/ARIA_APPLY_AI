import type { ScanResult } from "../types";

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

export async function getApiBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(API_URL_KEY);
  return String(stored[API_URL_KEY] ?? "").replace(/\/+$/, "");
}

export async function saveApiBaseUrl(value: string): Promise<void> {
  await chrome.storage.local.set({
    [API_URL_KEY]: value.trim().replace(/\/+$/, "")
  });
}

export async function mapFieldsWithBackend(
  scan: ScanResult
): Promise<SemanticMapResponse> {
  const baseUrl = await getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Add your Railway backend URL first.");
  }

  const response = await fetch(`${baseUrl}/api/v1/semantic/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scan)
  });

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}.`);
  }

  return await response.json() as SemanticMapResponse;
}
