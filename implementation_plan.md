# Import Existing Server — "Hook Into" Feature

Allow users to import a Minecraft server directory they already have on disk. MACE scans it, auto-detects the loader type and Minecraft version, and registers it as a fully managed instance — no re-downloading.

## Proposed Changes

### Backend: `servermanager` package

#### [MODIFY] [manager.go](file:///c:/Users/temit/Desktop/Mace/backend/pkg/servermanager/manager.go)

New `ImportServer(path string) (*ServerInstance, error)` function:

1. **Validate path** — confirm directory exists and contains at least a server JAR or run script.
2. **Detect loader type** — scan the directory for fingerprint files:
   | Loader | Detection signal |
   |---|---|
   | **Forge / NeoForge** | `run.bat` or `run.sh` present. Inspect contents for `neoforge` vs `forge` in classpath. |
   | **Fabric** | `.fabric/` directory or `fabric-server-launch.jar` present. |
   | **Quilt** | `quilt-server-launch.jar` present. |
   | **Paper** | `paper-*.jar` or `cache/patched*.jar` present. |
   | **Vanilla** | Only `server.jar` with no other loader artifacts. |

3. **Detect Minecraft version** — read `version.json` in the directory root (Forge/NeoForge produce this), or parse `server.properties` for clues, or fall back to asking the user.
4. **Detect Java** — use existing `FindJavaInstallations()` to pick the best JDK.
5. **Read `server.properties`** — extract `server-port` (default 25565) and `motd` for the instance name.
6. **Register** — generate a MACE ID, create `metadata.json` **in the existing directory** (no copy), and save via `SaveServer`.

> [!IMPORTANT]
> The imported directory is NOT copied into `servers/`. MACE points directly at it via the `Path` field, which already supports arbitrary absolute paths. The server also appears in `ListServers` — we'll add a fallback scan for `metadata.json` in non-standard paths.

#### [MODIFY] [types.go](file:///c:/Users/temit/Desktop/Mace/backend/pkg/servermanager/types.go)

Add `ImportServerPayload`:
```go
type ImportServerPayload struct {
    Path string `json:"path"`
    Name string `json:"name"` // Optional override; auto-detected from directory name if empty
}
```

---

### Backend: Wails bridge

#### [MODIFY] [app.go](file:///c:/Users/temit/Desktop/Mace/app.go)

Add two new methods:
- `BrowseForServerDir() (string, error)` — calls `runtime.OpenDirectoryDialog` to open a native folder picker.
- `ImportServer(payload ImportServerPayload) (*ServerInstance, error)` — validates and calls `servermanager.ImportServer`.

---

### Frontend: IPC layer

#### [MODIFY] [serverAPI.ts](file:///c:/Users/temit/Desktop/Mace/frontend/src/ipc/serverAPI.ts)

Add bindings:
```ts
browseForServerDir(): Promise<string>;
ImportServer(payload: { path: string; name: string }): Promise<ServerInstance>;
```

---

### Frontend: UI

#### [MODIFY] [App.tsx](file:///c:/Users/temit/Desktop/Mace/frontend/src/App.tsx)

Add a new sidebar nav button **"Import Server"** (with a `FolderOpen` icon from lucide-react) that switches to the import page.

#### [NEW] [ImportServer.tsx](file:///c:/Users/temit/Desktop/Mace/frontend/src/pages/ImportServer.tsx)

Simple page with:
1. **Browse button** — opens native directory picker via `browseForServerDir()`.
2. **Path display** — shows the selected directory.
3. **Name field** — auto-populated from the directory name, editable.
4. **Import button** — calls `importServer({ path, name })`.
5. On success, redirect to Instances tab.
6. On error, show the reason (e.g. "No server.jar or run script found").

---

### ListServers update

#### [MODIFY] [manager.go](file:///c:/Users/temit/Desktop/Mace/backend/pkg/servermanager/manager.go)

`ListServers()` currently only scans subdirectories of `GetServerRoot()`. Imported servers live outside this directory. We'll maintain a small `imports.json` registry in the server root that tracks external paths. `ListServers` will load from both sources.

## Open Questions

> [!IMPORTANT]
> **Symlink vs Registry approach** — should imported servers be symlinked into the `servers/` directory, or tracked via a separate `imports.json` file? Symlinks are simpler for `ListServers` but can break on Windows without developer mode. Registry file is more portable. I'm recommending the registry approach.

## Verification Plan

### Automated Tests
```bash
go vet ./...
wails build
```

### Manual Verification
- Import a Forge server directory → verify type detected as `forge`.
- Import a Vanilla server directory → verify type detected as `vanilla`.
- Start an imported server from MACE → verify it launches correctly.
- Delete an imported server in MACE → verify only `metadata.json` is removed, not the user's files.
