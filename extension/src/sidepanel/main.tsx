import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CandidateProfile, ScanResult } from "../types";
import { emptyProfile, getProfile, saveProfile } from "../storage/profileStorage";
import { autofillActivePage, scanActivePage } from "../services/tabService";
import {
  getApiBaseUrl,
  mapFieldsWithBackend,
  saveApiBaseUrl
} from "../services/apiClient";
import "../ui.css";

function SidePanel() {
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [mappingSource, setMappingSource] = useState("");
  const [status, setStatus] = useState("Load or enter your profile.");

  useEffect(() => {
    getProfile().then(setProfile);
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const update = (key: keyof CandidateProfile, value: string) =>
    setProfile(current => ({ ...current, [key]: value }));

  const save = async () => {
    await Promise.all([saveProfile(profile), saveApiBaseUrl(apiUrl)]);
    setStatus("Profile and Railway URL saved locally.");
  };

  const scanPage = async () => {
    try {
      setStatus("Scanning page...");
      const result = await scanActivePage();
      setScan(result);
      setMappingSource("");
      setStatus(`${result.fields.length} visible fields detected.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed.");
    }
  };

  const runAiMapping = async () => {
    try {
      setStatus("Sending detected fields to the semantic mapper...");
      await saveApiBaseUrl(apiUrl);
      const currentScan = scan ?? await scanActivePage();
      const result = await mapFieldsWithBackend(currentScan);
      const byId = new Map(result.mappings.map(item => [item.id, item]));

      const enriched: ScanResult = {
        ...currentScan,
        fields: currentScan.fields.map(field => {
          const mapping = byId.get(field.id);
          return mapping ? {
            ...field,
            canonicalField: mapping.canonicalField as typeof field.canonicalField,
            confidence: mapping.confidence
          } : field;
        })
      };

      setScan(enriched);
      setMappingSource(result.source);
      setStatus(
        `Semantic mapping completed using ${result.source === "ai" ? "AI" : "rule fallback"}.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Semantic mapping failed.");
    }
  };

  const fill = async () => {
    try {
      await saveProfile(profile);
      const count = await autofillActivePage(profile);
      setStatus(`${count} fields filled. Review everything before submitting.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Autofill failed.");
    }
  };

  return <main className="app">
    <section className="card">
      <h1>ARIA Side Panel</h1>
      <p>Scan, understand, fill, and review. ARIA never submits automatically.</p>

      <label>Railway backend URL</label>
      <input
        placeholder="https://your-service.up.railway.app"
        value={apiUrl}
        onChange={event => setApiUrl(event.target.value)}
      />

      <label>First name</label>
      <input value={profile.firstName} onChange={e => update("firstName", e.target.value)} />
      <label>Last name</label>
      <input value={profile.lastName} onChange={e => update("lastName", e.target.value)} />
      <label>Email</label>
      <input value={profile.email} onChange={e => update("email", e.target.value)} />
      <label>Phone</label>
      <input value={profile.phone} onChange={e => update("phone", e.target.value)} />
      <label>Current company</label>
      <input value={profile.currentCompany} onChange={e => update("currentCompany", e.target.value)} />
      <label>Designation</label>
      <input value={profile.designation} onChange={e => update("designation", e.target.value)} />
      <label>Skills</label>
      <textarea value={profile.skills} onChange={e => update("skills", e.target.value)} />

      <button className="secondary" onClick={save}>Save Settings</button>
      <button className="secondary" onClick={scanPage}>1. Scan Page</button>
      <button className="secondary" onClick={runAiMapping}>2. Run Semantic Mapping</button>
      <button className="primary" onClick={fill}>3. Autofill Fields</button>
      <div className="status">{status}</div>
    </section>

    {scan && <section className="card">
      <h2>
        Detected Fields
        {mappingSource && <span className="badge">{mappingSource}</span>}
      </h2>
      <div className="field-list">
        {scan.fields.map(field => (
          <div className="field" key={field.id}>
            <strong>{field.label || field.name || field.id}</strong>
            <span className="badge">{field.canonicalField}</span>
            <div className="status">
              Confidence: {Math.round(field.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    </section>}
  </main>;
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
