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
      .then((data) => {
        setJavas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to detect java environments", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    runDetection();
  }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Global Settings</h1>
        <p style={{ color: "var(--text-muted)" }}>Manage global server configurations and system dependencies.</p>
      </div>

      {/* Java Runtimes Card */}
      <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} style={{ color: "var(--primary)" }} />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Java Runtimes</h2>
          </div>
          <button
            onClick={runDetection}
            disabled={loading}
            className="btn-secondary"
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RotateCw size={12} className={loading ? "status-pulse-starting" : ""} />
            Scan System
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
          MACE searches registry keys and standard folders (Program Files) to find Java JDKs and JREs. 
          Use these exact paths inside your server instance configurations.
        </p>

        {/* Java lists */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
          {javas.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
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
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid var(--border-glass)",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{j.version}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    {j.path}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Specs and Diagnostics */}
      <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={18} style={{ color: "var(--success)" }} />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Engine Diagnostic Information</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
            fontSize: "0.85rem",
            marginTop: "0.5rem",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-glass)",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "2px" }}>Launcher Version</div>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Shield size={14} color="var(--success)" /> v0.1.0 (Alpha Build)
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-glass)",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "2px" }}>Backend Engine</div>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <Terminal size={14} color="var(--primary)" /> Go 1.26.2 (net/http + ws)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
