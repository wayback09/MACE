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
          background: "var(--secondary-color)",
          borderRight: "4px solid var(--hr-top-color)",
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
                background: "var(--btn-primary-inner-color)",
                width: "40px",
                height: "40px",
                border: "2px solid var(--btn-primary-border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 2px 2px 0 var(--btn-primary-inner-border-lt-color), inset -2px -2px 0 var(--btn-primary-inner-border-br-color)",
              }}
            >
              <Cpu size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.5px" }}>
                MACE
              </h2>
              <span style={{ fontSize: "0.7rem", color: "var(--success-color)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", background: "var(--success-color)" }}></span>
                Engine Ready
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={activeTab === "dashboard" ? "button-primary" : "button-normal"}
              style={{ width: "100%", justifyContent: "flex-start", gap: "1rem", padding: "0.75rem 1rem", margin: 0 }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("instances")}
              className={activeTab === "instances" ? "button-primary" : "button-normal"}
              style={{ width: "100%", justifyContent: "flex-start", gap: "1rem", padding: "0.75rem 1rem", margin: 0 }}
            >
              <Server size={18} />
              Instances
              {servers.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "var(--primary-color)",
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    color: "white",
                  }}
                >
                  {servers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={activeTab === "create" ? "button-primary" : "button-normal"}
              style={{ width: "100%", justifyContent: "flex-start", gap: "1rem", padding: "0.75rem 1rem", margin: 0 }}
            >
              <PlusCircle size={18} />
              New Instance
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={activeTab === "settings" ? "button-primary" : "button-normal"}
              style={{ width: "100%", justifyContent: "flex-start", gap: "1rem", padding: "0.75rem 1rem", margin: 0 }}
            >
              <SettingsIcon size={18} />
              Settings
            </button>
          </nav>
        </div>

        {/* Java Status Footer */}
        <div
          className="card"
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            fontSize: "0.8rem",
            background: "var(--primary-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={14} color={javaDetected ? "var(--success-color)" : "var(--error-color)"} />
            <span style={{ fontWeight: 700 }}>Java Status</span>
          </div>
          <p style={{ color: "var(--accent-color)", fontSize: "0.75rem", margin: 0 }}>
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
                  border: "4px solid var(--hr-bottom-color)",
                  borderTop: "4px solid var(--btn-primary-inner-color)",
                  width: "40px",
                  height: "40px",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 1rem",
                }}
              />
              <p style={{ color: "var(--accent-color)" }}>Connecting to control engine...</p>
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
