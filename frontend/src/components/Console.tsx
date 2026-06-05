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

  useEffect(() => {
    mountedRef.current = true;
    setLogs([]);
    setWsStatus("connecting");

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

    const unsubscribeFn = onConsoleLog(serverId, (line: string) => {
      if (!mountedRef.current) return;
      setLogs((prev) => {
        const updated = [...prev, line];
        return updated.length > 1000 ? updated.slice(updated.length - 1000) : updated;
      });
      scrollToBottom();
    });

    return () => {
      mountedRef.current = false;
      unsubscribeFn();
      offConsoleLog(serverId);
      unsubscribeConsole(serverId).catch(() => {});
    };
  }, [serverId, scrollToBottom]);

  const handleSendCommand = async (e: FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    if (wsStatus === "connected") {
      const cmdToSend = command;
      setCommand("");
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

  const getStatusColor = () => {
    if (wsStatus === "connected") return "var(--success-color)";
    if (wsStatus === "connecting") return "var(--warning-color)";
    return "var(--error-color)";
  };

  const formatLogLine = (line: string) => {
    if (line.startsWith("> "))
      return <span style={{ color: "var(--btn-primary-inner-color)", fontWeight: 600 }}>{line}</span>;
    if (line.startsWith("[MACE]"))
      return <span style={{ color: "#818cf8", fontWeight: 600 }}>{line}</span>;

    const errMatch = line.includes("ERROR") || line.includes("FATAL");
    const warnMatch = line.includes("WARN") || line.includes("WARNING");
    const doneMatch = line.includes("Done") || line.includes("started");
    const infoMatch = line.includes("INFO");

    if (errMatch) return <span style={{ color: "var(--error-color)" }}>{line}</span>;
    if (warnMatch) return <span style={{ color: "var(--warning-color)" }}>{line}</span>;
    if (doneMatch) return <span style={{ color: "var(--success-color)" }}>{line}</span>;
    if (infoMatch) return <span style={{ color: "#e5e7eb" }}>{line}</span>;
    return <span>{line}</span>;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "500px",
        background: "#0a0c0a",
        border: "3px solid var(--hr-top-color)",
        overflow: "hidden",
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          background: "var(--primary-color)",
          borderBottom: "3px solid var(--hr-top-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Terminal size={16} style={{ color: "var(--btn-primary-inner-color)" }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{serverName} Terminal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", background: getStatusColor() }} />
          <span style={{ fontSize: "0.75rem", color: "var(--accent-color)", textTransform: "capitalize" }}>
            {wsStatus}
          </span>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={terminalBodyRef}
        style={{
          flex: 1,
          padding: "1rem 1.25rem",
          overflowY: "auto",
          fontFamily: "MinecraftRegular, monospace",
          fontSize: "0.82rem",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          lineHeight: "1.6",
          wordBreak: "break-all",
          background: "#0d100d",
        }}
      >
        {logs.length === 0 ? (
          <div style={{ margin: "auto", color: "var(--accent-color)", textAlign: "center" }}>
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

      {/* Command input */}
      <form
        onSubmit={handleSendCommand}
        style={{
          padding: "0.5rem",
          background: "var(--primary-color)",
          borderTop: "3px solid var(--hr-top-color)",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          className="form-input"
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={wsStatus !== "connected"}
          placeholder={
            wsStatus === "connected"
              ? "Type a command (e.g. op name, say Hello, stop)..."
              : wsStatus === "connecting"
              ? "Connecting to server console..."
              : "Terminal connection unavailable."
          }
          style={{ flex: 1, height: "36px", fontSize: "0.82rem" }}
        />
        <button
          type="submit"
          disabled={wsStatus !== "connected" || !command.trim()}
          className="button-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.4rem 0.9rem",
            margin: 0,
            opacity: wsStatus === "connected" && command.trim() ? 1 : 0.5,
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
