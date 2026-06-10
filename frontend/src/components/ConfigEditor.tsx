import { useState, useEffect, type FormEvent } from "react";
import type { ServerInstance } from "../ipc/types";
import { Save, AlertCircle, FileText, Settings, FolderOpen } from "lucide-react";
import { getServerProperties, updateServerConfig, detectJava, browseForBackupDir } from "../ipc/serverAPI";

interface ConfigEditorProps {
  server: ServerInstance;
  refreshServers: () => void;
}

export default function ConfigEditor({ server, refreshServers }: ConfigEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "properties">("general");
  
  // General Config State
  const [name, setName] = useState(server.name);
  const [memoryMB, setMemoryMB] = useState(server.memoryMB);
  const [port, setPort] = useState(server.port);
  const [watchdog, setWatchdog] = useState(server.watchdog);
  const [javaPath, setJavaPath] = useState(server.javaPath);
  const [version, setVersion] = useState(server.version);
  const [type, setType] = useState(server.type);
  const [backupPath, setBackupPath] = useState(server.backupPath || "");
  
  // Java Autocomplete List
  const [javas, setJavas] = useState<{ path: string; version: string }[]>([]);
  
  // Server.properties State
  const [rawProperties, setRawProperties] = useState("");
  const [propsLoading, setPropsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Sync state when server change
    setName(server.name);
    setMemoryMB(server.memoryMB);
    setPort(server.port);
    setWatchdog(server.watchdog);
    setJavaPath(server.javaPath);
    setVersion(server.version);
    setType(server.type);
    setBackupPath(server.backupPath || "");
    
    // Fetch available java environments
    detectJava().then(setJavas).catch(console.error);

    // Fetch server properties
    setPropsLoading(true);
    getServerProperties(server.id)
      .then((data) => {
        setRawProperties(data.properties);
        setPropsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load server.properties", err);
        setPropsLoading(false);
      });
  }, [server.id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);

    try {
      await updateServerConfig({
        id: server.id,
        name,
        javaPath,
        memoryMB: Number(memoryMB),
        port: Number(port),
        watchdog,
        rawProps: activeSubTab === "properties" ? rawProperties : "",
        version,
        type,
        backupPath,
      });

      setSaveSuccess(true);
      refreshServers();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save configuration: " + err);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "1.5rem" }}>
      {/* Settings Navigation Sub Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid var(--border-glass)",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={() => setActiveSubTab("general")}
          style={{
            background: "transparent",
            border: "none",
            color: activeSubTab === "general" ? "var(--primary-light)" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Settings size={16} /> General Config
        </button>

        <button
          onClick={() => setActiveSubTab("properties")}
          style={{
            background: "transparent",
            border: "none",
            color: activeSubTab === "properties" ? "var(--primary-light)" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <FileText size={16} /> Server Properties
        </button>
      </div>

      <form onSubmit={handleSave}>
        {activeSubTab === "general" ? (
          /* General Settings Form */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Instance Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Server Port
                </label>
                <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  RAM Limit (MB)
                </label>
                <input
                  type="number"
                  value={memoryMB}
                  onChange={(e) => setMemoryMB(Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Java Path
                </label>
                <select value={javaPath} onChange={(e) => setJavaPath(e.target.value)}>
                  {javas.map((j) => (
                    <option key={j.path} value={j.path}>
                      {j.version} ({j.path})
                    </option>
                  ))}
                  <option value="java">Default System (java)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Minecraft Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.20.4"
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Server Loader / Type
                </label>
                <select value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="vanilla">Vanilla (Official)</option>
                  <option value="spigot">Spigot (Plugins)</option>
                  <option value="paper">Paper (Optimized Plugins)</option>
                  <option value="fabric">Fabric (Mods)</option>
                  <option value="quilt">Quilt (Mods)</option>
                  <option value="forge">Forge (Mods)</option>
                  <option value="neoforge">NeoForge (Mods)</option>
                </select>
              </div>
            </div>

            {/* Backup Directory */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                Backup Directory
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="Default: server/backups/"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button-normal"
                  onClick={async () => {
                    try {
                      const dir = await browseForBackupDir();
                      if (dir) setBackupPath(dir);
                    } catch (err) {
                      console.error("Failed to select backup directory:", err);
                      alert("Failed to open directory picker.");
                    }
                  }}
                  style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
                >
                  <FolderOpen size={14} /> Browse
                </button>
              </div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, opacity: 0.7 }}>
                Tip: Use a separate drive or dedicated folder to protect backups from accidental deletion.
              </p>
            </div>

            {/* Watchdog Option */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(0, 0, 0, 0.2)",
                marginTop: "0.5rem",
              }}
            >
              <input
                type="checkbox"
                id="watchdog"
                checked={watchdog}
                onChange={(e) => setWatchdog(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <div>
                <label htmlFor="watchdog" style={{ fontWeight: 600, cursor: "pointer" }}>
                  Enable Watchdog (Crash Auto-Restart)
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Automatically detects unexpected engine termination and restarts the server process.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Server.properties Editor */
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--warning)", fontSize: "0.85rem" }}>
              <AlertCircle size={16} />
              <span>Editing properties directly impacts gameplay. Incorrect values can cause boot failures.</span>
            </div>
            {propsLoading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading properties...</p>
            ) : (
              <textarea
                value={rawProperties}
                onChange={(e) => setRawProperties(e.target.value)}
                style={{
                  width: "100%",
                  height: "280px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-glass)",
                  padding: "1rem",
                  borderRadius: "8px",
                  resize: "vertical",
                  lineHeight: "1.6",
                }}
                placeholder="# Minecraft server properties..."
              />
            )}
          </div>
        )}

        {/* Save button and alerts */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
          <button
            type="submit"
            disabled={saveLoading}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Save size={16} /> {saveLoading ? "Saving..." : "Save Configuration"}
          </button>
          
          {saveSuccess && (
            <span style={{ color: "var(--success)", fontSize: "0.85rem", fontWeight: 500 }}>
              Configuration saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
