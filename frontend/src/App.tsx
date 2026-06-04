import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Instances from "./pages/Instances";
import CreateServer from "./pages/CreateServer";
import Settings from "./pages/Settings";
import { Server, PlusCircle, Settings as SettingsIcon, LayoutDashboard, Cpu, Database } from "lucide-react";
import { listServers, detectJava } from "./ipc/serverAPI";
import type { ServerInstance } from "./ipc/types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "instances" | "create" | "settings">("dashboard");
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [javaDetected, setJavaDetected] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // Poll server configurations every 3 seconds to keep UI synced
  const refreshServers = () => {
    listServers()
      .then((data) => {
        setServers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch servers", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshServers();
    const interval = setInterval(refreshServers, 3000);
    
    // Check Java installation
    detectJava().then((javas) => {
      setJavaDetected(javas.length > 0 && javas[0].version !== "Default System (java)");
    }).catch(console.error);

    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard servers={servers} setActiveTab={setActiveTab} refreshServers={refreshServers} onManageInstance={(id) => { setSelectedInstanceId(id); setActiveTab("instances"); }} />;
      case "instances":
        return <Instances servers={servers} refreshServers={refreshServers} initialSelectedId={selectedInstanceId} onSelectionChange={setSelectedInstanceId} />;
      case "create":
        return <CreateServer refreshServers={refreshServers} setActiveTab={setActiveTab} />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard servers={servers} setActiveTab={setActiveTab} refreshServers={refreshServers} onManageInstance={(id) => { setSelectedInstanceId(id); setActiveTab("instances"); }} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside
        style={{
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-glass)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          padding: "2rem 1.5rem",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* Logo Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--success))",
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Cpu size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.5px" }}>
                MACE
              </h2>
              <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)" }} className="status-pulse-online"></span>
                Engine Ready
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("dashboard")}
              className="btn-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                borderRadius: "10px",
                background: activeTab === "dashboard" ? "var(--primary)" : "transparent",
                color: activeTab === "dashboard" ? "white" : "var(--text-muted)",
                textAlign: "left",
                fontWeight: 500,
                boxShadow: activeTab === "dashboard" ? "0 4px 12px var(--primary-glow)" : "none",
              }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("instances")}
              className="btn-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                borderRadius: "10px",
                background: activeTab === "instances" ? "var(--primary)" : "transparent",
                color: activeTab === "instances" ? "white" : "var(--text-muted)",
                textAlign: "left",
                fontWeight: 500,
                boxShadow: activeTab === "instances" ? "0 4px 12px var(--primary-glow)" : "none",
              }}
            >
              <Server size={18} />
              Instances
              {servers.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "rgba(255, 255, 255, 0.15)",
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    color: "white",
                  }}
                >
                  {servers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className="btn-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                borderRadius: "10px",
                background: activeTab === "create" ? "var(--primary)" : "transparent",
                color: activeTab === "create" ? "white" : "var(--text-muted)",
                textAlign: "left",
                fontWeight: 500,
                boxShadow: activeTab === "create" ? "0 4px 12px var(--primary-glow)" : "none",
              }}
            >
              <PlusCircle size={18} />
              New Instance
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className="btn-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                borderRadius: "10px",
                background: activeTab === "settings" ? "var(--primary)" : "transparent",
                color: activeTab === "settings" ? "white" : "var(--text-muted)",
                textAlign: "left",
                fontWeight: 500,
                boxShadow: activeTab === "settings" ? "0 4px 12px var(--primary-glow)" : "none",
              }}
            >
              <SettingsIcon size={18} />
              Settings
            </button>
          </nav>
        </div>

        {/* Java Status Footer */}
        <div
          className="glass-panel"
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            fontSize: "0.8rem",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={14} color={javaDetected ? "var(--success)" : "var(--danger)"} />
            <span style={{ fontWeight: 500 }}>Java Status</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {javaDetected ? "Auto-detected JDK on PATH" : "No JDK found! Set path in Settings."}
          </p>
        </div>
      </aside>

      {/* Main Page Area */}
      <main style={{ padding: "2.5rem", overflowY: "auto", maxHeight: "100vh" }}>
        {loading ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  border: "3px solid var(--border-glass)",
                  borderTop: "3px solid var(--primary)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 1rem",
                }}
              />
              <p style={{ color: "var(--text-muted)" }}>Connecting to control engine...</p>
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}
