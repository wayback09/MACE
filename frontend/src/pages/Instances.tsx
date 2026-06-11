import { useState, useEffect } from "react";
import type { ServerInstance } from "../ipc/types";
import { Terminal, Settings, Trash2, Cpu, FolderClosed, Puzzle, Archive, Users } from "lucide-react";
import Console from "../components/Console";
import ConfigEditor from "../components/ConfigEditor";
import ResourceMonitor from "../components/ResourceMonitor";
import InstanceContentManager from "../components/ContentManager";
import BackupManager from "../components/BackupManager";
import PlayerManager from "../components/PlayerManager";
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
  const [activeTab, setActiveTab] = useState<"terminal" | "players" | "config" | "mods" | "backups">("terminal");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [serverActionLoading, setServerActionLoading] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedServerId(initialSelectedId);
    }
  }, [initialSelectedId]);

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
    try { await startServer(selectedServer.id); refreshServers(); }
    catch (err: any) { alert("Failed to start server: " + err.message); }
    finally { setServerActionLoading(false); }
  };

  const handleStop = async () => {
    if (!selectedServer) return;
    setServerActionLoading(true);
    try { await stopServer(selectedServer.id); refreshServers(); }
    catch (err: any) { alert("Failed to stop server: " + err.message); }
    finally { setServerActionLoading(false); }
  };

  const handleRestart = async () => {
    if (!selectedServer) return;
    setServerActionLoading(true);
    try { await restartServer(selectedServer.id); refreshServers(); }
    catch (err: any) { alert("Failed to restart server: " + err.message); }
    finally { setServerActionLoading(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":      return "var(--success-color)";
      case "starting":
      case "restarting":  return "var(--warning-color)";
      case "stopping":    return "var(--error-color)";
      case "installing":  return "var(--btn-primary-inner-color)";
      default:            return "var(--accent-color)";
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem", minHeight: "calc(100vh - 5rem)" }}>
      {/* Left List: Instances */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Instances</h2>
        <div
          className="card"
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
            <p style={{ color: "var(--accent-color)", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>
              No instances.
            </p>
          ) : (
            servers.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectServer(s.id)}
                className={selectedServerId === s.id ? "button-normal" : "button-normal"}
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  margin: 0,
                  background: selectedServerId === s.id ? "var(--btn-normal-inner-hover-color)" : undefined,
                  color: selectedServerId === s.id ? "var(--btn-normal-text-hover-color)" : undefined,
                  borderColor: selectedServerId === s.id ? "var(--btn-normal-border-hover-color)" : undefined,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{s.name}</span>
                  <span style={{ fontSize: "0.75rem", color: selectedServerId === s.id ? "rgba(255,255,255,0.7)" : "var(--accent-color)" }}>
                    {s.type} • {s.version}
                  </span>
                </div>
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    background: getStatusColor(s.status),
                    flexShrink: 0,
                  }}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Details Panel */}
      {selectedServer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Header Panel */}
          <div
            className="card"
            style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                {selectedServer.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.85rem", color: "var(--accent-color)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <FolderClosed size={14} /> {selectedServer.id}
                </span>
                <span>•</span>
                <span>Port: {selectedServer.port}</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="mc-action-row" style={{ flexWrap: "wrap", alignItems: "center" }}>
              {/* Server control buttons */}
              <div className="mc-action-row" style={{ paddingRight: "0.75rem", borderRight: "3px solid var(--hr-top-color)", alignItems: "center" }}>
                <button
                  onClick={handleStart}
                  disabled={serverActionLoading || selectedServer.status !== "offline"}
                  className="button-primary"
                  style={{ margin: 0, opacity: selectedServer.status !== "offline" ? 0.5 : 1 }}
                >
                  Start
                </button>
                <button
                  onClick={handleRestart}
                  disabled={serverActionLoading || selectedServer.status === "offline" || selectedServer.status === "installing"}
                  className="button-secondary"
                  style={{ margin: 0, opacity: (selectedServer.status === "offline" || selectedServer.status === "installing") ? 0.5 : 1 }}
                >
                  Restart
                </button>
                <button
                  onClick={handleStop}
                  disabled={serverActionLoading || selectedServer.status === "offline" || selectedServer.status === "installing"}
                  className="button-secondary"
                  style={{ margin: 0, opacity: (selectedServer.status === "offline" || selectedServer.status === "installing") ? 0.5 : 1 }}
                >
                  Stop
                </button>
              </div>

              {/* View tabs */}
              <button
                onClick={() => setActiveTab("terminal")}
                className={activeTab === "terminal" ? "button-primary" : "button-normal"}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Terminal size={16} /> Console
              </button>
              <button
                onClick={() => setActiveTab("players")}
                className={activeTab === "players" ? "button-primary" : "button-normal"}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Users size={16} /> Players
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={activeTab === "config" ? "button-primary" : "button-normal"}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Settings size={16} /> Settings
              </button>
              <button
                onClick={() => setActiveTab("mods")}
                className={activeTab === "mods" ? "button-primary" : "button-normal"}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Puzzle size={16} /> Mods & Plugins
              </button>
              <button
                onClick={() => setActiveTab("backups")}
                className={activeTab === "backups" ? "button-primary" : "button-normal"}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Archive size={16} /> Backups
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="button-tertiary"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>

          {/* Resource Monitor - only visible when server is running */}
          <ResourceMonitor
            serverId={selectedServer.id}
            serverStatus={selectedServer.status}
            allocatedMemoryMB={selectedServer.memoryMB}
          />

          {/* Tab Content */}
          {activeTab === "terminal" ? (
            <Console key={selectedServer.id} serverId={selectedServer.id} serverName={selectedServer.name} />
          ) : activeTab === "players" ? (
            <PlayerManager key={selectedServer.id} serverId={selectedServer.id} serverStatus={selectedServer.status} />
          ) : activeTab === "mods" ? (
            <InstanceContentManager key={selectedServer.id} server={selectedServer} />
          ) : activeTab === "backups" ? (
            <BackupManager key={selectedServer.id} serverId={selectedServer.id} serverName={selectedServer.name} backupPath={selectedServer.backupPath || ""} />
          ) : (
            <ConfigEditor key={selectedServer.id} server={selectedServer} refreshServers={refreshServers} />
          )}
        </div>
      ) : (
        <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--accent-color)" }}>
            <Cpu size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <h3>No Instance Selected</h3>
            <p style={{ fontSize: "0.85rem" }}>Select a server from the sidebar list to inspect.</p>
          </div>
        </div>
      )}
    </div>
  );
}
