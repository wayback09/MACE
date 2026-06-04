import { useState, type MouseEvent } from "react";
import type { ServerInstance } from "../ipc/types";
import { Play, Square, Terminal, Cpu, HardDrive, RefreshCw } from "lucide-react";
import { startServer, stopServer } from "../ipc/serverAPI";

interface ServerCardProps {
  server: ServerInstance;
  refreshServers: () => void;
  onManage: () => void;
}

export default function ServerCard({ server, refreshServers, onManage }: ServerCardProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleStart = async (e: MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    try {
      await startServer(server.id);
      refreshServers();
    } catch (err) {
      alert("Failed to start server: " + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (e: MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    try {
      await stopServer(server.id);
      refreshServers();
    } catch (err) {
      alert("Failed to stop server: " + err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (server.status) {
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

  const getStatusLabel = () => {
    return server.status.charAt(0).toUpperCase() + server.status.slice(1);
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background tint reflecting status */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "4px",
          height: "100%",
          background: getStatusColor(),
        }}
      />

      {/* Header Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.25rem" }}>{server.name}</h3>
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "2px 8px",
              borderRadius: "4px",
              color: "var(--text-muted)",
              textTransform: "capitalize",
            }}
          >
            {server.type} • {server.version}
          </span>
        </div>

        {/* Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: getStatusColor(),
            }}
            className={
              server.status === "online"
                ? "status-pulse-online"
                : server.status === "starting" || server.status === "restarting" || server.status === "installing"
                ? "status-pulse-starting"
                : ""
            }
          />
          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: getStatusColor() }}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {/* Server Specs & Port */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          padding: "0.75rem",
          borderRadius: "8px",
          background: "rgba(0, 0, 0, 0.15)",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={14} className="text-muted" style={{ color: "var(--text-muted)" }} />
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Memory</div>
            <div style={{ fontWeight: 500 }}>{server.memoryMB} MB</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <HardDrive size={14} className="text-muted" style={{ color: "var(--text-muted)" }} />
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Connection</div>
            <div style={{ fontWeight: 500 }}>Port {server.port}</div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto" }}>
        {/* Toggle Start/Stop */}
        {server.status === "offline" ? (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="btn-primary"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "var(--success)",
              boxShadow: "0 4px 10px var(--success-glow)",
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            <Play size={16} /> Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={actionLoading || server.status === "stopping" || server.status === "installing"}
            className="btn-primary"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "var(--danger)",
              boxShadow: "0 4px 10px var(--danger-glow)",
              opacity: actionLoading || server.status === "stopping" ? 0.6 : 1,
            }}
          >
            {actionLoading || server.status === "stopping" ? (
              <RefreshCw size={16} className="status-pulse-starting" />
            ) : (
              <Square size={16} />
            )}
            {server.status === "stopping" ? "Stopping" : "Stop"}
          </button>
        )}

        {/* Manage Button */}
        <button
          onClick={onManage}
          className="btn-secondary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.6rem",
          }}
          title="Open Console & Settings"
        >
          <Terminal size={18} />
        </button>
      </div>
    </div>
  );
}
