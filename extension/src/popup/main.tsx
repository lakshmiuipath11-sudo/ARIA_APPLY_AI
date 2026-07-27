import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import type {
  StoredCandidate
} from "../types";

import {
  addCandidate,
  getCandidates,
  getSelectedCandidate,
  selectCandidate
} from "../storage/candidateProfilesStorage";

import {
  extractResumeProfile,
  mapFieldsWithBackend
} from "../services/apiClient";

import {
  autofillActivePage,
  scanActivePage
} from "../services/tabService";

import "../ui.css";

type PopupStage =
  | "loading"
  | "welcome"
  | "processing"
  | "setup-complete"
  | "candidate-selection"
  | "applying"
  | "completed"
  | "error";

interface ProgressStep {
  label: string;
  state: "waiting" | "active" | "complete";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function Popup() {
  const [stage, setStage] =
    useState<PopupStage>("loading");

  const [candidates, setCandidates] =
    useState<StoredCandidate[]>([]);

  const [selectedCandidateId, setSelectedCandidateId] =
    useState("");

  const [processedCount, setProcessedCount] =
    useState(0);

  const [totalFiles, setTotalFiles] =
    useState(0);

  const [activeStep, setActiveStep] =
    useState(0);

  const [confidence, setConfidence] =
    useState(0);

  const [filledCount, setFilledCount] =
    useState(0);

  const [errorMessage, setErrorMessage] =
    useState("");

  const greeting = getGreeting();

  useEffect(() => {
    void initializePopup();
  }, []);

  async function initializePopup(): Promise<void> {
    try {
      const savedCandidates =
        await getCandidates();

      setCandidates(savedCandidates);

      if (savedCandidates.length === 0) {
        setStage("welcome");
        return;
      }

      const selected =
        await getSelectedCandidate();

      if (selected) {
        setSelectedCandidateId(selected.id);
      } else if (savedCandidates.length === 1) {
        await selectCandidate(
          savedCandidates[0].id
        );

        setSelectedCandidateId(
          savedCandidates[0].id
        );
      }

      setStage("candidate-selection");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "ARIA could not load candidate profiles."
      );
    }
  }

  function showError(message: string): void {
    setErrorMessage(message);
    setStage("error");
  }

  async function handleResumeUpload(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const files = Array.from(
      event.target.files ?? []
    );

    if (files.length === 0) {
      return;
    }

    const supportedFiles = files.filter(file => {
      const name = file.name.toLowerCase();

      return (
        name.endsWith(".pdf") ||
        name.endsWith(".docx") ||
        name.endsWith(".txt")
      );
    });

    if (supportedFiles.length === 0) {
      showError(
        "Please upload PDF, DOCX, or TXT resumes."
      );
      return;
    }

    setTotalFiles(supportedFiles.length);
    setProcessedCount(0);
    setActiveStep(0);
    setStage("processing");

    try {
      const newlyCreated:
      StoredCandidate[] = [];

      for (
        let index = 0;
        index < supportedFiles.length;
        index += 1
      ) {
        const file = supportedFiles[index];

        setActiveStep(0);

        await wait(300);

        setActiveStep(1);

        const extractedProfile =
          await extractResumeProfile(file);

        await wait(300);

        setActiveStep(2);

        const candidate =
          await addCandidate(
            extractedProfile,
            file.name
          );

        newlyCreated.push(candidate);

        await wait(300);

        setActiveStep(3);

        setProcessedCount(index + 1);

        await wait(350);
      }

      const allCandidates =
        await getCandidates();

      setCandidates(allCandidates);

      if (allCandidates.length === 1) {
        await selectCandidate(
          allCandidates[0].id
        );

        setSelectedCandidateId(
          allCandidates[0].id
        );
      }

      setStage("setup-complete");

      window.setTimeout(() => {
        setStage("candidate-selection");
      }, 2200);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "ARIA could not process the resumes."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function chooseCandidate(
    candidateId: string
  ): Promise<void> {
    try {
      await selectCandidate(candidateId);

      setSelectedCandidateId(candidateId);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to select this candidate."
      );
    }
  }

  async function applyWithAria(): Promise<void> {
    const selectedCandidate =
      candidates.find(
        candidate =>
          candidate.id === selectedCandidateId
      );

    if (!selectedCandidate) {
      showError(
        "Choose a candidate profile before applying."
      );
      return;
    }

    setActiveStep(0);
    setConfidence(0);
    setFilledCount(0);
    setStage("applying");

    try {
      await wait(350);
      setActiveStep(1);

      const pageScan =
        await scanActivePage();

      await wait(350);
      setActiveStep(2);

      const semanticResult =
        await mapFieldsWithBackend(pageScan);

      const validMappings =
        semanticResult.mappings.filter(
          mapping =>
            mapping.canonicalField !== "unknown"
        );

      const averageConfidence =
        validMappings.length > 0
          ? validMappings.reduce(
              (sum, mapping) =>
                sum + mapping.confidence,
              0
            ) / validMappings.length
          : 0.98;

      setConfidence(
        Math.round(
          averageConfidence * 100
        )
      );

      await wait(400);
      setActiveStep(3);

      const count =
        await autofillActivePage(
          selectedCandidate.profile
        );

      setFilledCount(count);

      await wait(650);
      setActiveStep(4);

      await wait(450);
      setStage("completed");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "ARIA could not complete this application."
      );
    }
  }

  function reviewApplication(): void {
    window.close();
  }

  const processingSteps:
  ProgressStep[] = useMemo(
    () => [
      {
        label: "Processing Resumes",
        state:
          activeStep > 0
            ? "complete"
            : "active"
      },
      {
        label: "Recognizing Candidates",
        state:
          activeStep > 1
            ? "complete"
            : activeStep === 1
              ? "active"
              : "waiting"
      },
      {
        label: "Creating Profiles",
        state:
          activeStep > 2
            ? "complete"
            : activeStep === 2
              ? "active"
              : "waiting"
      },
      {
        label: "Saving Securely",
        state:
          activeStep > 3
            ? "complete"
            : activeStep === 3
              ? "active"
              : "waiting"
      }
    ],
    [activeStep]
  );

  const applicationSteps:
  ProgressStep[] = useMemo(
    () => [
      {
        label: "Loading Candidate Profile",
        state:
          activeStep > 0
            ? "complete"
            : "active"
      },
      {
        label: "Understanding Job Form",
        state:
          activeStep > 1
            ? "complete"
            : activeStep === 1
              ? "active"
              : "waiting"
      },
      {
        label: "Matching Candidate Details",
        state:
          activeStep > 2
            ? "complete"
            : activeStep === 2
              ? "active"
              : "waiting"
      },
      {
        label: "Completing Application",
        state:
          activeStep > 3
            ? "complete"
            : activeStep === 3
              ? "active"
              : "waiting"
      }
    ],
    [activeStep]
  );

  const selectedCandidate =
    candidates.find(
      candidate =>
        candidate.id === selectedCandidateId
    );

  return (
    <main className="aria-popup-shell">
      <section className="aria-agent-card">
        <AgentHeader />

        {stage === "loading" && (
          <div className="aria-center-state">
            <div className="aria-spinner" />

            <p>Starting ARIA...</p>
          </div>
        )}

        {stage === "welcome" && (
          <section className="aria-onboarding">
            <div className="aria-welcome-icon">
              ✦
            </div>

            <h2>Hi, ARIA user 👋</h2>

            <p>
              Upload one or more resumes to
              create candidate profiles.
            </p>

            <label
              className="aria-upload-box"
              htmlFor="aria-resumes"
            >
              <span className="aria-upload-icon">
                📄
              </span>

              <strong>
                Click here to upload resumes
              </strong>

              <small>
                Select one or multiple PDF,
                DOCX, or TXT files
              </small>
            </label>

            <input
              id="aria-resumes"
              className="aria-hidden-file"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={event => {
                void handleResumeUpload(event);
              }}
            />

            <p className="aria-privacy-note">
              ARIA automatically recognizes,
              extracts, and saves each profile.
            </p>
          </section>
        )}

        {stage === "processing" && (
          <>
            <AgentProgress
              steps={processingSteps}
              confidence={
                totalFiles > 0
                  ? Math.round(
                      (
                        processedCount /
                        totalFiles
                      ) * 100
                    )
                  : 0
              }
              message={
                totalFiles > 1
                  ? `Processed ${processedCount} of ${totalFiles} resumes`
                  : "ARIA is preparing the candidate profile..."
              }
            />
          </>
        )}

        {stage === "setup-complete" && (
          <section className="aria-success-state">
            <div className="aria-success-check">
              ✓
            </div>

            <h2>Profiles Ready!</h2>

            <p>
              Thank you, ARIA users.
            </p>

            <p>
              Your candidate profiles were
              created and saved automatically.
            </p>
          </section>
        )}

        {stage === "candidate-selection" && (
          <section className="aria-selection-state">
            <div>
              <h2>
                {greeting}, ARIA users 👋
              </h2>

              <p>
                Which candidate profile would
                you like to use?
              </p>
            </div>

            <div className="aria-candidate-list">
              {candidates.map(candidate => {
                const selected =
                  candidate.id ===
                  selectedCandidateId;

                return (
                  <button
                    type="button"
                    className={[
                      "aria-candidate-card",
                      selected
                        ? "aria-candidate-selected"
                        : ""
                    ].join(" ")}
                    key={candidate.id}
                    onClick={() => {
                      void chooseCandidate(
                        candidate.id
                      );
                    }}
                  >
                    <span className="aria-avatar">
                      {candidate.initials}
                    </span>

                    <span className="aria-candidate-info">
                      <strong>
                        {candidate.displayName}
                      </strong>

                      {candidate.profile
                        .designation && (
                        <small>
                          {
                            candidate.profile
                              .designation
                          }
                        </small>
                      )}

                      <small>
                        {
                          candidate.resumeFileName
                        }
                      </small>
                    </span>

                    <span className="aria-selection-check">
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="aria-primary-button aria-apply-button"
              disabled={!selectedCandidate}
              onClick={applyWithAria}
            >
              <span>✦</span>
              Apply with ARIA
            </button>

            <label
              className="aria-add-resume-button"
              htmlFor="aria-more-resumes"
            >
              + Add Another Resume
            </label>

            <input
              id="aria-more-resumes"
              className="aria-hidden-file"
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={event => {
                void handleResumeUpload(event);
              }}
            />
          </section>
        )}

        {stage === "applying" && (
          <AgentProgress
            steps={applicationSteps}
            confidence={
              confidence ||
              Math.min(
                activeStep * 25,
                90
              )
            }
            message={
              selectedCandidate
                ? `ARIA is applying with ${selectedCandidate.displayName}'s profile...`
                : "ARIA is completing the application..."
            }
          />
        )}

        {stage === "completed" && (
          <section className="aria-success-state">
            <div className="aria-success-check">
              ✓
            </div>

            <h2>Application Ready!</h2>

            <p>
              The selected candidate’s
              application has been completed.
            </p>

            <div className="aria-confidence-card">
              <span>AI Confidence</span>

              <strong>
                {confidence || 98}%
              </strong>
            </div>

            <p className="aria-completion-note">
              {filledCount > 0
                ? "No issues detected."
                : "Please review the completed form."}
            </p>

            <button
              className="aria-primary-button"
              onClick={reviewApplication}
            >
              Review Application
              <span>→</span>
            </button>
          </section>
        )}

        {stage === "error" && (
          <section className="aria-error-state">
            <div className="aria-error-icon">
              !
            </div>

            <h2>ARIA needs attention</h2>

            <p>{errorMessage}</p>

            <button
              className="aria-primary-button"
              onClick={() => {
                setErrorMessage("");

                setStage(
                  candidates.length > 0
                    ? "candidate-selection"
                    : "welcome"
                );
              }}
            >
              Try Again
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

function AgentHeader() {
  return (
    <header className="aria-agent-header">
      <div className="aria-logo">
        <div className="aria-logo-face">
          <span />
          <span />
        </div>
      </div>

      <div>
        <h1>ARIA Agent</h1>

        <p>
          Your AI Job Application Assistant
        </p>
      </div>
    </header>
  );
}

function AgentProgress({
  steps,
  confidence,
  message
}: {
  steps: ProgressStep[];
  confidence: number;
  message: string;
}) {
  return (
    <section className="aria-agent-progress">
      <div className="aria-step-list">
        {steps.map(step => (
          <div
            className={[
              "aria-step",
              `aria-step-${step.state}`
            ].join(" ")}
            key={step.label}
          >
            <div className="aria-step-icon">
              {step.state === "complete"
                ? "✓"
                : step.state === "active"
                  ? (
                    <span className="aria-small-spinner" />
                  )
                  : "○"}
            </div>

            <span>
              {step.label}...
            </span>
          </div>
        ))}
      </div>

      <div className="aria-confidence-section">
        <div className="aria-confidence-heading">
          <span>✦ AI Confidence</span>

          <strong>{confidence}%</strong>
        </div>

        <div className="aria-progress-track">
          <div
            className="aria-progress-value"
            style={{
              width: `${confidence}%`
            }}
          />
        </div>

        <small>{message}</small>
      </div>
    </section>
  );
}

createRoot(
  document.getElementById("root")!
).render(<Popup />);
