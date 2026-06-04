import { useState, useEffect } from "react";
import type { ServerInstance } from "../ipc/types";
import { Terminal, Settings, Trash2, Cpu, FolderClosed } from "lucide-react";
import Console from "../components/Console";
import ConfigEditor from "../components/ConfigEditor";
import { deleteServer, startServer, stopServer, restartServer } from "../ipc/serverAPI";

interface InstancesProps {
  servers: ServerInstance[];
  refreshServers: () => void;
  initialSelectedId?: string | null;
  onSelectionChange?: (id: string) => void;
}

export default function Instances({ servers, refreshServers, initialSelectedId, onSelectionChange }: InstancesProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>(
    initialSelectedId || (servers.length > 0 ? servers[0].id : "")
  );
  const [activeTab, setActiveTab] = useState<"terminal" | "config">("terminal");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [serverActionLoading, setServerActionLoading] = useState(false);

  // Sync selected server state when initialSelectedId prop changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedServerId(initialSelectedId);
    }
  }, [initialSelectedId]);

  // Sync selected server
  const selectedServer = servers.find((s) => s.id === selectedServerId) || (servers.length > 0 ? servers[0] : null);

  const handleSelectServer = (id: string) => {
    setSelectedServerId(id);
    if (onSelectionChange) onSelectionChange(id);
  };

  const handleDelete = async () => {
    if (!selectedServer) return;
    const confirmDelete = window.confirm(
      `Are you absolutely sure you want to delete "${selectedServer.name}"? This will permanently wipe all server files, mods, and worlds!`
    );
    if (!confirmDelete) return;

    setDeleteLoading(true);
    try {
      await deleteServer(selectedServer.id);
      refreshServers();
      if (servers.length > 1) {
        const remaining = servers.filter((s) => s.id !== selectedServer.id);
        handleSelectServer(remaining[0].id);
      } else {
        handleSelectServer("");
      }
    } catch (err) {
      alert("Failed to delete server: " + err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStart = async () => {
    if (!selectedServer) return;
    setServerActionLoading(true);
    try {
      await startServer(selectedServer.id);
      refreshServers();
    } catch (err: any) {
      alert("Failed to start server: " + err.message);
    } finally {
      setServerActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!selectedServer) return;
    setServerActionLoading(true);
    try {
      await stopServer(selectedServer.id);
      refreshServers();
    } catch (err: any) {
      alert("Failed to stop server: " + err.message);
    } finally {
      setServerActionLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!selectedServer) return;
    setServerActionLoading(true);
    try {
      await restartServer(selectedServer.id);
      refreshServers();
    } catch (err: any) {
      alert("Failed to restart server: " + err.message);
    } finally {
      setServerActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "var(--success)";
      case "starting":
      case "restarting":
        return "var(--warning)";
      case "stopping":
        return "var(--danger)";
      case "installing":
        return "var(--primary)";
      default:
        return "var(--text-muted)";
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem", minHeight: "calc(100vh - 5rem)" }}>
      {/* Left List: Instances */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Instances</h2>
        <div
          className="glass-panel"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            padding: "0.5rem",
            overflowY: "auto",
            maxHeight: "650px",
          }}
        >
          {servers.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
              No instances.
            </p>
          ) : (
            servers.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectServer(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "none",
                  borderRadius: "10px",
                  background: selectedServerId === s.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  textAlign: "left",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontWeight: selectedServerId === s.id ? 600 : 500,
                      color: selectedServerId === s.id ? "var(--text-main)" : "var(--text-muted)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {s.name}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dark)" }}>
                    {s.type} • {s.version}
                  </span>
                </div>

                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: getStatusColor(s.status),
                  }}
                  className={s.status === "online" ? "status-pulse-online" : s.status === "starting" ? "status-pulse-starting" : ""}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Details: Console or Settings */}
      {selectedServer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Panel */}
          <div
            className="glass-panel"
            style={{
              padding: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                {selectedServer.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <FolderClosed size={14} /> {selectedServer.id}
                </span>
                <span>•</span>
                <span>Port: {selectedServer.port}</span>
              </div>
            </div>

            {/* Action Row */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.5rem", marginRight: "1rem", borderRight: "1px solid var(--border-glass)", paddingRight: "1rem" }}>
                <button
                  onClick={handleStart}
                  disabled={serverActionLoading || selectedServer.status !== "offline"}
                  className="btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: selectedServer.status !== "offline" ? 0.5 : 1,
                  }}
                >
                  Start
                </button>
                <button
                  onClick={handleRestart}
                  disabled={serverActionLoading || selectedServer.status === "offline" || selectedServer.status === "installing"}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: (selectedServer.status === "offline" || selectedServer.status === "installing") ? 0.5 : 1,
                  }}
                >
                  Restart
                </button>
                <button
                  onClick={handleStop}
                  disabled={serverActionLoading || selectedServer.status === "offline" || selectedServer.status === "installing"}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--danger)",
                    borderColor: "rgba(239, 68, 68, 0.2)",
                    opacity: (selectedServer.status === "offline" || selectedServer.status === "installing") ? 0.5 : 1,
                  }}
                >
                  Stop
                </button>
              </div>

              <button
                onClick={() => setActiveTab("terminal")}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderColor: activeTab === "terminal" ? "var(--primary)" : "var(--border-glass)",
                  background: activeTab === "terminal" ? "var(--primary-glow)" : "",
                  color: activeTab === "terminal" ? "white" : "var(--text-muted)",
                }}
              >
                <Terminal size={16} /> Console
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  borderColor: activeTab === "config" ? "var(--primary)" : "var(--border-glass)",
                  background: activeTab === "config" ? "var(--primary-glow)" : "",
                  color: activeTab === "config" ? "white" : "var(--text-muted)",
                }}
              >
                <Settings size={16} /> Settings
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn-secondary"
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>

          {/* Active Screen Tab Content */}
          {activeTab === "terminal" ? (
            <Console
              key={selectedServer.id}
              serverId={selectedServer.id}
              serverName={selectedServer.name}
            />
          ) : (
            <ConfigEditor key={selectedServer.id} server={selectedServer} refreshServers={refreshServers} />
          )}
        </div>
      ) : (
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <Cpu size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <h3>No Instance Selected</h3>
            <p style={{ fontSize: "0.85rem" }}>Select a server from the sidebar list to inspect.</p>
          </div>
        </div>
      )}
    </div>
  );
}
