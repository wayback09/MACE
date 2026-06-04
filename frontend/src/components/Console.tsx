import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Terminal, Send, Power } from "lucide-react";
import {
  subscribeConsole,
  unsubscribeConsole,
  onConsoleLog,
  offConsoleLog,
  sendCommand
} from "../ipc/serverAPI";

interface ConsoleProps {
  serverId: string;
  serverName: string;
}

export default function Console({ serverId, serverName }: ConsoleProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    setTimeout(() => {
      if (terminalBodyRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = terminalBodyRef.current;
        if (force || scrollHeight - scrollTop - clientHeight < 100) {
          terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }, 50);
  }, []);

  // Connect / subscribe on mount or when serverId changes
  useEffect(() => {
    mountedRef.current = true;
    setLogs([]);
    setWsStatus("connecting");

    // Tell the backend to subscribe this console and send cached logs
    subscribeConsole(serverId)
      .then(() => {
        if (!mountedRef.current) return;
        setWsStatus("connected");
        setLogs((prev) => [...prev, "[MACE] Console stream connected."]);
        scrollToBottom(true);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setWsStatus("disconnected");
        setLogs((prev) => [...prev, `[MACE] Failed to connect stream: ${err}`]);
      });

    // Listen for live logs
    const unsubscribeFn = onConsoleLog(serverId, (line: string) => {
      if (!mountedRef.current) return;
      setLogs((prev) => {
        const updated = [...prev, line];
        if (updated.length > 1000) {
          return updated.slice(updated.length - 1000);
        }
        return updated;
      });
      scrollToBottom();
    });

    return () => {
      mountedRef.current = false;
      unsubscribeFn();
      offConsoleLog(serverId);
      unsubscribeConsole(serverId).catch(() => { /* ignore */ });
    };
  }, [serverId, scrollToBottom]);

  const handleSendCommand = async (e: FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    if (wsStatus === "connected") {
      const cmdToSend = command;
      setCommand("");
      // Immediately echo command locally
      setLogs((prev) => [...prev, `> ${cmdToSend}`]);
      scrollToBottom(true);
      
      try {
        await sendCommand(serverId, cmdToSend);
      } catch (err: any) {
        setLogs((prev) => [...prev, `[MACE] Failed to execute: ${err.message || err}`]);
        scrollToBottom(true);
      }
    } else {
      setLogs((prev) => [...prev, "[MACE] Cannot send — console is not connected."]);
      scrollToBottom(true);
    }
  };

  // Colorize logs based on severity levels
  const formatLogLine = (line: string) => {
    if (line.startsWith("> ")) {
      return <span style={{ color: "var(--primary-light)", fontWeight: 500 }}>{line}</span>;
    }
    if (line.startsWith("[MACE]")) {
      return <span style={{ color: "#818cf8", fontWeight: 600 }}>{line}</span>;
    }

    const infoMatch = line.match(/\[Server thread\/INFO\]/i) || line.includes("INFO");
    const warnMatch = line.match(/\[Server thread\/WARN\w*\]/i) || line.includes("WARN") || line.includes("WARNING");
    const errMatch = line.match(/\[Server thread\/ERROR\]/i) || line.includes("ERROR") || line.includes("FATAL");

    if (errMatch) {
      return <span style={{ color: "var(--danger)" }}>{line}</span>;
    }
    if (warnMatch) {
      return <span style={{ color: "var(--warning)" }}>{line}</span>;
    }
    if (infoMatch) {
      if (line.includes("Done") || line.includes("started")) {
        return <span style={{ color: "var(--success)" }}>{line}</span>;
      }
      return <span style={{ color: "#e5e7eb" }}>{line}</span>;
    }

    return <span>{line}</span>;
  };

  return (
    <div
      className="glass-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "500px",
        background: "rgba(10, 11, 16, 0.95)",
        border: "1px solid var(--border-glass)",
        overflow: "hidden",
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          background: "rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Terminal size={16} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            {serverName} Terminal
          </span>
        </div>

        {/* Connection Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background:
                wsStatus === "connected"
                  ? "var(--success)"
                  : wsStatus === "connecting"
                  ? "var(--warning)"
                  : "var(--danger)",
            }}
            className={wsStatus === "connecting" ? "status-pulse-starting" : ""}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
            {wsStatus}
          </span>
        </div>
      </div>

      {/* Terminal Log Output Area */}
      <div
        ref={terminalBodyRef}
        style={{
          flex: 1,
          padding: "1.25rem",
          overflowY: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          lineHeight: "1.5",
          wordBreak: "break-all",
        }}
      >
        {logs.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--text-muted)", textAlign: "center" }}>
            <Power size={32} style={{ marginBottom: "0.5rem", opacity: 0.3 }} />
            <p>Console is inactive.</p>
            <p style={{ fontSize: "0.75rem" }}>Start the Minecraft server to capture logs.</p>
          </div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} style={{ minHeight: "18px" }}>
              {formatLogLine(line)}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Command Input Panel */}
      <form
        onSubmit={handleSendCommand}
        style={{
          padding: "0.75rem",
          background: "rgba(0, 0, 0, 0.4)",
          borderTop: "1px solid var(--border-glass)",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={wsStatus !== "connected"}
          placeholder={
            wsStatus === "connected"
              ? "Type command (e.g. op name, say Hello, stop)..."
              : wsStatus === "connecting"
              ? "Connecting to server console..."
              : "Terminal connection unavailable."
          }
          style={{
            flex: 1,
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid var(--border-glass)",
            fontSize: "0.85rem",
            padding: "0.5rem 0.8rem",
          }}
        />
        <button
          type="submit"
          disabled={wsStatus !== "connected" || !command.trim()}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5rem 1rem",
            background: wsStatus === "connected" ? "var(--primary)" : "var(--border-glass-focus)",
            opacity: wsStatus === "connected" && command.trim() ? 1 : 0.6,
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
