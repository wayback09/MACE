import type { ServerInstance, JavaInstall } from "./types";

// Type for the Wails Go App bindings and runtime helper
declare global {
  interface Window {
    go: {
      main: {
        App: {
          ListServers(): Promise<ServerInstance[]>;
          CreateServer(payload: {
            name: string;
            version: string;
            type: string;
            memoryMB: number;
          }): Promise<ServerInstance>;
          StartServer(id: string): Promise<string>;
          StopServer(id: string): Promise<string>;
          RestartServer(id: string): Promise<void>;
          DeleteServer(id: string): Promise<void>;
          GetConsoleLogs(id: string): Promise<string[]>;
          SendCommand(id: string, command: string): Promise<void>;
          GetServerProperties(id: string): Promise<string>;
          UpdateServerConfig(payload: {
            id: string;
            name: string;
            javaPath: string;
            memoryMB: number;
            port: number;
            watchdog: boolean;
            rawProps: string;
          }): Promise<void>;
          DetectJava(): Promise<JavaInstall[]>;
          GetAvailableVersions(): Promise<Record<string, string[]>>;
          SubscribeConsole(id: string): Promise<void>;
          UnsubscribeConsole(id: string): Promise<void>;
        };
      };
    };
    runtime: {
      EventsOn(eventName: string, callback: (...data: any[]) => void): () => void;
      EventsOff(eventName: string): void;
    };
  }
}

export async function listServers(): Promise<ServerInstance[]> {
  return window.go.main.App.ListServers();
}

export async function createServer(payload: {
  name: string;
  version: string;
  type: string;
  memoryMB: number;
}): Promise<ServerInstance> {
  return window.go.main.App.CreateServer(payload);
}

export async function startServer(id: string): Promise<{ status: string }> {
  const status = await window.go.main.App.StartServer(id);
  return { status };
}

export async function stopServer(id: string): Promise<{ status: string }> {
  const status = await window.go.main.App.StopServer(id);
  return { status };
}

export async function restartServer(id: string): Promise<void> {
  return window.go.main.App.RestartServer(id);
}

export async function getConsole(id: string): Promise<string[]> {
  return window.go.main.App.GetConsoleLogs(id);
}

export async function sendCommand(id: string, command: string): Promise<{ result: string }> {
  await window.go.main.App.SendCommand(id, command);
  return { result: "sent" };
}

export async function getServerProperties(id: string): Promise<{ properties: string }> {
  const properties = await window.go.main.App.GetServerProperties(id);
  return { properties };
}

export async function updateServerConfig(payload: {
  id: string;
  name: string;
  javaPath: string;
  memoryMB: number;
  port: number;
  watchdog: boolean;
  rawProps: string;
}): Promise<{ result: string }> {
  await window.go.main.App.UpdateServerConfig(payload);
  return { result: "updated" };
}

export async function deleteServer(id: string): Promise<{ result: string }> {
  await window.go.main.App.DeleteServer(id);
  return { result: "deleted" };
}

export async function detectJava(): Promise<JavaInstall[]> {
  return window.go.main.App.DetectJava();
}

export async function getAvailableVersions(): Promise<Record<string, string[]>> {
  return window.go.main.App.GetAvailableVersions();
}

// Console subscription helpers using Wails events
export async function subscribeConsole(id: string): Promise<void> {
  return window.go.main.App.SubscribeConsole(id);
}

export async function unsubscribeConsole(id: string): Promise<void> {
  return window.go.main.App.UnsubscribeConsole(id);
}

// Register callback for live log events from Wails runtime
export function onConsoleLog(id: string, callback: (line: string) => void): () => void {
  if (window.runtime && window.runtime.EventsOn) {
    return window.runtime.EventsOn(`console-log-${id}`, callback);
  }
  return () => {};
}

// Clean up log event subscription
export function offConsoleLog(id: string): void {
  if (window.runtime && window.runtime.EventsOff) {
    window.runtime.EventsOff(`console-log-${id}`);
  }
}
