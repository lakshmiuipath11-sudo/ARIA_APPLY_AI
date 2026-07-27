import React, {
  ChangeEvent,
  useEffect,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import type {
  CandidateProfile,
  ScanResult
} from "../types";

import {
  emptyProfile,
  getProfile,
  saveProfile
} from "../storage/profileStorage";

import {
  autofillActivePage,
  scanActivePage
} from "../services/tabService";

import {
  extractResumeProfile,
  getApiBaseUrl,
  healthCheck,
  mapFieldsWithBackend,
  saveApiBaseUrl
} from "../services/apiClient";

import "../ui.css";

function SidePanel() {
  const [profile, setProfile] =
    useState<CandidateProfile>(emptyProfile);

  const [scan, setScan] =
    useState<ScanResult | null>(null);

  const [apiUrl, setApiUrl] =
    useState("");

  const [selectedResume, setSelectedResume] =
    useState<File | null>(null);

  const [mappingSource, setMappingSource] =
    useState("");

  const [status, setStatus] =
    useState(
      "Load or enter your candidate profile."
    );

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData(): Promise<void> {
    try {
      const [storedProfile, storedApiUrl] =
        await Promise.all([
          getProfile(),
          getApiBaseUrl()
        ]);

      setProfile(storedProfile);
      setApiUrl(storedApiUrl);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to load saved settings."
      );
    }
  }

  function updateProfile(
    key: keyof CandidateProfile,
    value: string
  ): void {
    setProfile(current => ({
      ...current,
      [key]: value
    }));
  }

  async function saveSettings(): Promise<void> {
    try {
      await Promise.all([
        saveProfile(profile),
        saveApiBaseUrl(apiUrl)
      ]);

      setStatus(
        "Candidate profile and Railway URL saved."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save profile."
      );
    }
  }

  async function testBackend(): Promise<void> {
    try {
      setStatus("Testing Railway backend...");

      await saveApiBaseUrl(apiUrl);

      const healthy = await healthCheck();

      setStatus(
        healthy
          ? "Railway backend is online."
          : "Railway backend health check failed."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Backend test failed."
      );
    }
  }

  function selectResume(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    const file =
      event.target.files?.[0] ?? null;

    setSelectedResume(file);

    if (file) {
      setStatus(
        `Selected resume: ${file.name}`
      );
    }
  }

  async function extractResume(): Promise<void> {
    if (!selectedResume) {
      setStatus(
        "Choose a PDF, DOCX, or TXT resume first."
      );
      return;
    }

    try {
      setStatus(
        `Extracting profile from ${selectedResume.name}...`
      );

      await saveApiBaseUrl(apiUrl);

      const extractedProfile =
        await extractResumeProfile(
          selectedResume
        );

      const mergedProfile: CandidateProfile = {
        ...emptyProfile,
        ...profile,
        ...extractedProfile,
        resume:
          extractedProfile.resume ||
          selectedResume.name
      };

      setProfile(mergedProfile);

      await saveProfile(mergedProfile);

      setStatus(
        "Resume extracted successfully. Review and save the profile."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Resume extraction failed."
      );
    }
  }

  async function scanPage(): Promise<void> {
    try {
      setStatus("Scanning current page...");

      const result =
        await scanActivePage();

      setScan(result);
      setMappingSource("");

      setStatus(
        `${result.fields.length} visible fields detected.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Page scan failed."
      );
    }
  }

  async function runSemanticMapping(): Promise<void> {
    try {
      setStatus(
        "Sending fields to the semantic mapper..."
      );

      await saveApiBaseUrl(apiUrl);

      const currentScan =
        scan ?? await scanActivePage();

      const semanticResult =
        await mapFieldsWithBackend(
          currentScan
        );

      const mappingById = new Map(
        semanticResult.mappings.map(
          mapping => [
            mapping.id,
            mapping
          ]
        )
      );

      const enrichedScan: ScanResult = {
        ...currentScan,
        fields: currentScan.fields.map(
          field => {
            const mapping =
              mappingById.get(field.id);

            if (!mapping) {
              return field;
            }

            return {
              ...field,
              canonicalField:
                mapping.canonicalField as
                  typeof field.canonicalField,
              confidence:
                mapping.confidence
            };
          }
        )
      };

      setScan(enrichedScan);
      setMappingSource(
        semanticResult.source
      );

      setStatus(
        semanticResult.source === "ai"
          ? "AI semantic mapping completed."
          : "Rule-based semantic mapping completed."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Semantic mapping failed."
      );
    }
  }

  async function autofillPage(): Promise<void> {
    try {
      await saveProfile(profile);

      const filledCount =
        await autofillActivePage(profile);

      setStatus(
        `${filledCount} fields filled. Review every value before submitting.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Autofill failed."
      );
    }
  }

  async function applyWithAria(): Promise<void> {
    try {
      setStatus(
        "Saving candidate profile..."
      );

      await Promise.all([
        saveProfile(profile),
        saveApiBaseUrl(apiUrl)
      ]);

      setStatus(
        "Scanning job application..."
      );

      const currentScan =
        await scanActivePage();

      setScan(currentScan);

      setStatus(
        "Understanding form fields..."
      );

      const semanticResult =
        await mapFieldsWithBackend(
          currentScan
        );

      const mappingById = new Map(
        semanticResult.mappings.map(
          mapping => [
            mapping.id,
            mapping
          ]
        )
      );

      const enrichedScan: ScanResult = {
        ...currentScan,
        fields: currentScan.fields.map(
          field => {
            const mapping =
              mappingById.get(field.id);

            if (!mapping) {
              return field;
            }

            return {
              ...field,
              canonicalField:
                mapping.canonicalField as
                  typeof field.canonicalField,
              confidence:
                mapping.confidence
            };
          }
        )
      };

      setScan(enrichedScan);
      setMappingSource(
        semanticResult.source
      );

      setStatus(
        "Autofilling application..."
      );

      const filledCount =
        await autofillActivePage(profile);

      setStatus(
        `${filledCount} fields filled successfully. Review all values before submitting.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "ARIA application flow failed."
      );
    }
  }

  return (
    <main className="app">
      <section className="card">
        <h1>ARIA Side Panel</h1>

        <p>
          Upload your resume, review your
          candidate profile, scan the job form,
          and autofill it. ARIA never submits
          automatically.
        </p>

        <label>
          Railway backend URL
        </label>

        <input
          value={apiUrl}
          placeholder={
            "https://ariaapplyai-production.up.railway.app"
          }
          onChange={event =>
            setApiUrl(
              event.target.value
            )
          }
        />

        <button
          className="secondary"
          onClick={testBackend}
        >
          Test Railway Backend
        </button>
      </section>

      <section className="card">
        <h2>Resume Extraction</h2>

        <label>
          Choose Resume
        </label>

        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={selectResume}
        />

        <button
          className="primary"
          onClick={extractResume}
          disabled={!selectedResume}
        >
          Extract Resume Profile
        </button>

        {selectedResume && (
          <div className="status">
            Selected:{" "}
            {selectedResume.name}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Candidate Profile</h2>

        <label>First name</label>

        <input
          value={profile.firstName}
          onChange={event =>
            updateProfile(
              "firstName",
              event.target.value
            )
          }
        />

        <label>Last name</label>

        <input
          value={profile.lastName}
          onChange={event =>
            updateProfile(
              "lastName",
              event.target.value
            )
          }
        />

        <label>Full name</label>

        <input
          value={profile.fullName}
          onChange={event =>
            updateProfile(
              "fullName",
              event.target.value
            )
          }
        />

        <label>Email</label>

        <input
          type="email"
          value={profile.email}
          onChange={event =>
            updateProfile(
              "email",
              event.target.value
            )
          }
        />

        <label>Phone</label>

        <input
          value={profile.phone}
          onChange={event =>
            updateProfile(
              "phone",
              event.target.value
            )
          }
        />

        <label>City</label>

        <input
          value={profile.city}
          onChange={event =>
            updateProfile(
              "city",
              event.target.value
            )
          }
        />

        <label>Country</label>

        <input
          value={profile.country}
          onChange={event =>
            updateProfile(
              "country",
              event.target.value
            )
          }
        />

        <label>LinkedIn</label>

        <input
          value={profile.linkedin}
          onChange={event =>
            updateProfile(
              "linkedin",
              event.target.value
            )
          }
        />

        <label>GitHub</label>

        <input
          value={profile.github}
          onChange={event =>
            updateProfile(
              "github",
              event.target.value
            )
          }
        />

        <label>Portfolio</label>

        <input
          value={profile.portfolio}
          onChange={event =>
            updateProfile(
              "portfolio",
              event.target.value
            )
          }
        />

        <label>Current company</label>

        <input
          value={profile.currentCompany}
          onChange={event =>
            updateProfile(
              "currentCompany",
              event.target.value
            )
          }
        />

        <label>Designation</label>

        <input
          value={profile.designation}
          onChange={event =>
            updateProfile(
              "designation",
              event.target.value
            )
          }
        />

        <label>Experience years</label>

        <input
          value={profile.experienceYears}
          onChange={event =>
            updateProfile(
              "experienceYears",
              event.target.value
            )
          }
        />

        <label>Notice period</label>

        <input
          value={profile.noticePeriod}
          onChange={event =>
            updateProfile(
              "noticePeriod",
              event.target.value
            )
          }
        />

        <label>Current salary</label>

        <input
          value={profile.currentSalary}
          onChange={event =>
            updateProfile(
              "currentSalary",
              event.target.value
            )
          }
        />

        <label>Expected salary</label>

        <input
          value={profile.expectedSalary}
          onChange={event =>
            updateProfile(
              "expectedSalary",
              event.target.value
            )
          }
        />

        <label>Skills</label>

        <textarea
          value={profile.skills}
          onChange={event =>
            updateProfile(
              "skills",
              event.target.value
            )
          }
        />

        <label>Cover letter</label>

        <textarea
          value={profile.coverLetter}
          onChange={event =>
            updateProfile(
              "coverLetter",
              event.target.value
            )
          }
        />

        <label>Resume filename</label>

        <input
          value={profile.resume}
          readOnly
        />

        <button
          className="secondary"
          onClick={saveSettings}
        >
          Save Candidate Profile
        </button>
      </section>

      <section className="card">
        <h2>Job Form</h2>

        <button
          className="primary"
          onClick={applyWithAria}
        >
          Apply with ARIA
        </button>

        <button
          className="secondary"
          onClick={scanPage}
        >
          1. Scan Page
        </button>

        <button
          className="secondary"
          onClick={runSemanticMapping}
        >
          2. Run Semantic Mapping
        </button>

        <button
          className="primary"
          onClick={autofillPage}
        >
          3. Autofill Page
        </button>

        <div className="status">
          {status}
        </div>
      </section>

      {scan && (
        <section className="card">
          <h2>
            Detected Fields{" "}
            {mappingSource && (
              <span className="badge">
                {mappingSource}
              </span>
            )}
          </h2>

          <div className="field-list">
            {scan.fields.map(field => (
              <div
                className="field"
                key={field.id}
              >
                <strong>
                  {field.label ||
                    field.name ||
                    field.id}
                </strong>

                <span className="badge">
                  {field.canonicalField}
                </span>

                <div className="status">
                  Confidence:{" "}
                  {Math.round(
                    field.confidence * 100
                  )}
                  %
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(
  document.getElementById("root")!
).render(<SidePanel />);
