import { useState, useEffect } from "react";
import { Cpu, RotateCw, Database, Terminal, Shield } from "lucide-react";
import { detectJava } from "../ipc/serverAPI";
import type { JavaInstall } from "../ipc/types";

export default function Settings() {
  const [javas, setJavas] = useState<JavaInstall[]>([]);
  const [loading, setLoading] = useState(false);

  const runDetection = () => {
    setLoading(true);
    detectJava()
      .then((data) => { setJavas(data); setLoading(false); })
      .catch((err) => { console.error("Failed to detect java environments", err); setLoading(false); });
  };

  useEffect(() => { runDetection(); }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Global Settings</h1>
        <p style={{ color: "var(--accent-color)", margin: 0 }}>Manage global server configurations and system dependencies.</p>
      </div>

      {/* Java Runtimes Card */}
      <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} style={{ color: "var(--btn-primary-inner-color)" }} />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Java Runtimes</h2>
          </div>
          <button
            onClick={runDetection}
            disabled={loading}
            className="button-normal"
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0.4rem 0.8rem", margin: 0, fontSize: "0.8rem" }}
          >
            <RotateCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Scan System
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--accent-color)", lineHeight: "1.5", margin: 0 }}>
          MACE searches registry keys and standard folders (Program Files) to find Java JDKs and JREs.
          Use these exact paths inside your server instance configurations.
        </p>

        {/* Java list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {javas.length === 0 ? (
            <p style={{ color: "var(--accent-color)", fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>
              No Java installations detected.
            </p>
          ) : (
            javas.map((j, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "var(--primary-color)",
                  border: "2px solid var(--hr-top-color)",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{j.version}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--accent-color)", fontFamily: "monospace", marginTop: "2px" }}>
                    {j.path}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Diagnostics Card */}
      <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={18} style={{ color: "var(--success-color)" }} />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Engine Diagnostic Information</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", fontSize: "0.85rem" }}>
          <div style={{ padding: "0.75rem 1rem", background: "var(--primary-color)", border: "2px solid var(--hr-top-color)" }}>
            <div style={{ color: "var(--accent-color)", fontSize: "0.75rem", marginBottom: "4px" }}>Launcher Version</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Shield size={14} color="var(--success-color)" /> v0.1.0 (Alpha Build)
            </div>
          </div>

          <div style={{ padding: "0.75rem 1rem", background: "var(--primary-color)", border: "2px solid var(--hr-top-color)" }}>
            <div style={{ color: "var(--accent-color)", fontSize: "0.75rem", marginBottom: "4px" }}>Backend Engine</div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Terminal size={14} color="var(--btn-primary-inner-color)" /> Go + Wails v2
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
