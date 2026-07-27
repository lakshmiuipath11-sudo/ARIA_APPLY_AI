import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  openSidePanel,
  scanActivePage
} from "../services/tabService";

import {
  mapFieldsWithBackend
} from "../services/apiClient";

import "../ui.css";

function Popup() {
  const [status, setStatus] = useState("Ready");
  const [count, setCount] = useState<number | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);

  const scan = async () => {
    try {
      setStatus("Scanning page...");

      const scanResult = await scanActivePage();

      setCount(scanResult.fields.length);

      setStatus(
        `Detected ${scanResult.fields.length} fields. Calling AI...`
      );

      const semantic = await mapFieldsWithBackend(scanResult);

      setMappings(semantic.mappings);

      setStatus(
        `AI mapped ${semantic.mappings.length} fields.`
      );

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Scan failed."
      );
    }
  };

  return (
    <main className="app">

      <section className="card">

        <h1>ARIA Apply AI</h1>

        <p>Universal AI Job Application Assistant</p>

        {count !== null && (
          <div className="stat">
            <span>Detected Fields</span>
            <strong>{count}</strong>
          </div>
        )}

        <button
          className="primary"
          onClick={scan}
        >
          Scan Current Page
        </button>

        <button
          className="secondary"
          onClick={() => openSidePanel()}
        >
          Open Side Panel
        </button>

        <div className="status">
          {status}
        </div>

        {mappings.length > 0 && (
          <div
            style={{
              marginTop: 20,
              maxHeight: 250,
              overflowY: "auto"
            }}
          >
            <h3>Semantic Mapping</h3>

            {mappings.map(field => (
              <div
                key={field.id}
                style={{
                  marginBottom: 10,
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 6
                }}
              >
                <strong>{field.id}</strong>

                <br />

                {field.canonicalField}

                <br />

                Confidence:

                {" "}

                {Math.round(field.confidence * 100)}%

              </div>
            ))}

          </div>
        )}

      </section>

    </main>
  );
}

createRoot(
  document.getElementById("root")!
).render(<Popup />);
