import { useState, useEffect } from "react";
import { createServer, getAvailableVersions } from "../ipc/serverAPI";
import { Download, ShieldAlert, Cpu } from "lucide-react";

interface CreateServerProps {
  refreshServers: () => void;
  setActiveTab: (tab: "dashboard" | "instances" | "create" | "settings") => void;
}

export default function CreateServer({ refreshServers, setActiveTab }: CreateServerProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("vanilla");
  const [version, setVersion] = useState("");
  const [memoryMB, setMemoryMB] = useState(2048);
  const [loading, setLoading] = useState(false);
  const [fetchingVersions, setFetchingVersions] = useState(true);
  const [error, setError] = useState("");
  const [versionsMap, setVersionsMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function loadVersions() {
      try {
        const data = await getAvailableVersions();
        setVersionsMap(data);
        if (data.vanilla && data.vanilla.length > 0) {
          setVersion(data.vanilla[0]);
        }
      } catch (err: any) {
        setError("Failed to fetch server versions. Using offline fallback.");
        const fallback = {
          vanilla: ["1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.12.2"],
          paper: ["1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.12.2"],
          fabric: ["1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
          quilt: ["1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.2", "1.18.2"],
          forge: ["1.20.4", "1.20.2", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.12.2"],
        };
        setVersionsMap(fallback);
        setVersion("1.20.4");
      } finally {
        setFetchingVersions(false);
      }
    }
    loadVersions();
  }, []);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const available = versionsMap[newType];
    if (available && available.length > 0) {
      setVersion(available[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      await createServer({
        name,
        type,
        version,
        memoryMB: Number(memoryMB),
      });
      refreshServers();
      setActiveTab("instances");
    } catch (err: any) {
      setError(err.message || "Failed to create server. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>New Server Instance</h1>
        <p style={{ color: "var(--text-muted)" }}>Download and set up a Minecraft server in a single click.</p>
      </div>

      {loading ? (
        /* Loading installation state */
        <div
          className="glass-panel"
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              border: "4px solid var(--border-glass)",
              borderTop: "4px solid var(--primary)",
              borderRadius: "50%",
              width: "60px",
              height: "60px",
              animation: "spin 1s linear infinite",
            }}
          />
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Downloading Server Jars
            </h3>
            <p style={{ color: "var(--text-muted)", maxWidth: "420px", margin: "0 auto", fontSize: "0.9rem" }}>
              Downloading the Minecraft server engine, setting up config files, and preparing folders. This can take up to a minute.
            </p>
          </div>
        </div>
      ) : (
        /* Form Wizard */
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {error && (
            <div
              style={{
                background: "var(--danger-glow)",
                border: "1px solid var(--danger)",
                padding: "1rem",
                borderRadius: "8px",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-muted)" }}>
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Survival Server"
              required
              maxLength={30}
            />
          </div>

          {/* Engine Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-muted)" }}>
              Server Engine Type
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem" }}>
              {["vanilla", "paper", "fabric", "quilt", "forge"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  style={{
                    background: type === t ? "var(--primary-glow)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${type === t ? "var(--primary)" : "var(--border-glass)"}`,
                    borderRadius: "8px",
                    color: type === t ? "white" : "var(--text-muted)",
                    padding: "0.75rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    fontSize: "0.85rem",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Version and RAM */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-muted)" }}>
                Minecraft Version
              </label>
              <select value={version} onChange={(e) => setVersion(e.target.value)} disabled={fetchingVersions}>
                {fetchingVersions ? (
                  <option>Loading versions...</option>
                ) : (
                  (versionsMap[type] || []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-muted)" }}>
                Memory Limit (MB)
              </label>
              <input
                type="number"
                value={memoryMB}
                onChange={(e) => setMemoryMB(Number(e.target.value))}
                min={512}
                max={16384}
                required
              />
            </div>
          </div>

          {/* RAM Recommendation Hint */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.2)",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-muted)",
            }}
          >
            <Cpu size={14} />
            <span>Recommended RAM: 2048 MB for Vanilla, 4096 MB for Forge/Fabric with mods.</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <Download size={16} /> Download and Create Server
          </button>
        </form>
      )}
    </div>
  );
}
