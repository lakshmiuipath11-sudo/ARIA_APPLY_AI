import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { openSidePanel, scanActivePage } from "../services/tabService";
import "../ui.css";

function Popup() {
  const [status, setStatus] = useState("Ready");
  const [count, setCount] = useState<number | null>(null);

  const scan = async () => {
    try {
      setStatus("Scanning...");
      const result = await scanActivePage();
      setCount(result.fields.length);
      setStatus(`Found ${result.fields.length} visible fields.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed.");
    }
  };

  return <main className="app">
    <section className="card">
      <h1>ARIA Apply AI</h1>
      <p>Universal job application assistant</p>
      {count !== null && <div className="stat"><span>Detected fields</span><strong>{count}</strong></div>}
      <button className="primary" onClick={scan}>Scan Current Page</button>
      <button className="secondary" onClick={() => openSidePanel()}>Open Side Panel</button>
      <div className="status">{status}</div>
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<Popup />);
