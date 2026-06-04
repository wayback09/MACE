import type { ServerInstance } from "../ipc/types";
import { Server, Activity, PowerOff, Zap, Plus } from "lucide-react";
import ServerCard from "./ServerCard";

interface DashboardProps {
  servers: ServerInstance[];
  setActiveTab: (tab: "dashboard" | "instances" | "create" | "settings") => void;
  refreshServers: () => void;
  onManageInstance: (id: string) => void;
}

export default function Dashboard({ servers, setActiveTab, refreshServers, onManageInstance }: DashboardProps) {
  const activeCount = servers.filter((s) => s.status === "online" || s.status === "starting").length;
  const offlineCount = servers.filter((s) => s.status === "offline").length;
  const totalRAM = servers
    .filter((s) => s.status === "online" || s.status === "starting" || s.status === "stopping")
    .reduce((sum, s) => sum + s.memoryMB, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>System Overview</h1>
        <p style={{ color: "var(--text-muted)" }}>Monitor system load and active Minecraft server instances.</p>
      </div>

      {/* Stats Counter Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "12px", background: "var(--primary-glow)", color: "var(--primary)" }}>
            <Server size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Instances</span>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 700 }}>{servers.length}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "12px", background: "var(--success-glow)", color: "var(--success)" }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Running</span>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 700 }}>{activeCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "12px", background: "var(--danger-glow)", color: "var(--danger)" }}>
            <PowerOff size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Offline</span>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 700 }}>{offlineCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "12px", background: "var(--warning-glow)", color: "var(--warning)" }}>
            <Zap size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Allocated RAM</span>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {(totalRAM / 1024).toFixed(1)} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>GB</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Server Grid / Call-to-action */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Active Instances</h2>
          {servers.length > 0 && (
            <button
              onClick={() => setActiveTab("create")}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem" }}
            >
              <Plus size={16} /> Add Server
            </button>
          )}
        </div>

        {servers.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
              background: "rgba(20, 22, 33, 0.4)",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                border: "1px dashed var(--primary)",
              }}
            >
              <Server size={36} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>No server instances found</h3>
              <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
                Create a new Minecraft server with auto-downloading JARs, customizable RAM, and live console output.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("create")}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Plus size={16} /> Create Your First Server
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {servers.map((server) => (
              <ServerCard key={server.id} server={server} refreshServers={refreshServers} onManage={() => onManageInstance(server.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
