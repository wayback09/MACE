# Mace

Mace is a lightweight, cross-platform desktop application for managing Minecraft server instances. It is built using the Wails framework with a Go backend and a React/TypeScript frontend.

## Features

- **Isolated Server Instances**: Create and manage multiple isolated server instances in separate directories.
- **Multiple Loaders Supported**: Automatic download and setup of Vanilla, Paper, Fabric, Quilt, and Forge servers.
- **Automatic Java Detection**: Scans the system for installed Java versions to ensure compatibility.
- **Real-Time Console**: Interactive terminal console with support for sending commands directly to the server input stream.
- **Resource Monitoring**: Live tracking of CPU usage, RAM utilization, and server uptime.
- **Config Editor**: Edit `server.properties` directly from the interface.

## Prerequisites

To run or build the application from source, you need:

- **Go**: 1.22.0 or higher
- **Node.js & npm**: For frontend assets compilation
- **Wails CLI**: Install via `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Java**: Java Development Kit (JDK) installed and configured on your path (relevant version depending on the Minecraft version you plan to run).

## Project Structure

- `backend/pkg/`: Core Go logic
  - `downloader/`: Fetches version manifests, installer URLs, and handles async jar downloads.
  - `launcher/`: Manages Java execution processes, stdin/stdout piping, and process logs.
  - `servermanager/`: High-level CRUD operations for managing server configs and resource states.
- `frontend/src/`: Frontend React application
  - `components/`: UI components (Console, ConfigEditor, ResourceMonitor, ServerCard).
  - `pages/`: Application screens (Instances list, Create Server, Settings).

## Getting Started

### Development

To run the application in live-development mode with hot-reloading:

```bash
wails dev
```

### Build

To package the application into a production executable:

```bash
wails build
```

The compiled binary will be located in the `build/bin/` folder.
