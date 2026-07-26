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
const DEFAULT_API_BASE_URL =
  "https://ariaapplyai-production.up.railway.app";

export async function getApiBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(API_URL_KEY);
  return String(
    stored[API_URL_KEY] ?? DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

export async function saveApiBaseUrl(value: string): Promise<void> {
  const normalized = value.trim().replace(/\/+$/, "");
  await chrome.storage.local.set({
    [API_URL_KEY]: normalized || DEFAULT_API_BASE_URL
  });
}

export async function healthCheck(): Promise<boolean> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/health`);
  return response.ok;
}

export async function mapFieldsWithBackend(
  scan: ScanResult
): Promise<SemanticMapResponse> {
  const baseUrl = await getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/v1/semantic/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scan)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Backend returned HTTP ${response.status}${message ? `: ${message}` : "."}`
    );
  }

  return await response.json() as SemanticMapResponse;
}
