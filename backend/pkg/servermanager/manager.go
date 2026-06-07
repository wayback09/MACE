package servermanager

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"mace/backend/pkg/downloader"
	"mace/backend/pkg/launcher"
	"mace/backend/pkg/utils"
)

var (
	statuses   = make(map[string]string)
	statusesMu sync.RWMutex
)

// Helper to resolve the root servers directory dynamically
func GetServerRoot() string {
	// If current directory has a "servers" folder, use it
	if _, err := os.Stat("servers"); err == nil {
		abs, _ := filepath.Abs("servers")
		return abs
	}
	// Otherwise look up in parent directory (e.g., if run from backend/)
	if _, err := os.Stat("../servers"); err == nil {
		abs, _ := filepath.Abs("../servers")
		return abs
	}
	// Check if run from backend/cmd/mace/
	if _, err := os.Stat("../../../servers"); err == nil {
		abs, _ := filepath.Abs("../../../servers")
		return abs
	}
	// Fallback to creating a "servers" folder in parent directory if inside backend
	cwd, _ := os.Getwd()
	if filepath.Base(cwd) == "backend" || filepath.Base(cwd) == "cmd" || filepath.Base(cwd) == "mace" {
		dir := filepath.Join(cwd, "..", "servers")
		if filepath.Base(cwd) == "mace" {
			dir = filepath.Join(cwd, "..", "..", "..", "servers")
		}
		utils.EnsureDir(dir)
		abs, _ := filepath.Abs(dir)
		return abs
	}
	// Default to local folder
	dir := "./servers"
	utils.EnsureDir(dir)
	abs, _ := filepath.Abs(dir)
	return abs
}

func getStatus(id string) string {
	statusesMu.RLock()
	defer statusesMu.RUnlock()
	if status, ok := statuses[id]; ok {
		return status
	}
	return "offline"
}

func setStatus(id string, status string) {
	statusesMu.Lock()
	statuses[id] = status
	statusesMu.Unlock()
}

// LoadServer loads instance metadata from disk.
func LoadServer(id string) (*ServerInstance, error) {
	metaFile := filepath.Join(GetServerRoot(), id, "metadata.json")
	if !utils.FileExists(metaFile) {
		return nil, fmt.Errorf("server %s metadata not found", id)
	}

	data, err := os.ReadFile(metaFile)
	if err != nil {
		return nil, err
	}

	var inst ServerInstance
	if err := json.Unmarshal(data, &inst); err != nil {
		return nil, err
	}

	// Dynamic status resolution
	if launcher.IsRunning(id) {
		inst.Status = getStatus(id)
		if inst.Status == "offline" {
			inst.Status = "online"
		}
	} else {
		inst.Status = "offline"
	}

	return &inst, nil
}

// SaveServer saves instance metadata to disk.
func SaveServer(inst *ServerInstance) error {
	dir := filepath.Join(GetServerRoot(), inst.ID)
	if err := utils.EnsureDir(dir); err != nil {
		return err
	}

	metaFile := filepath.Join(dir, "metadata.json")
	data, err := json.MarshalIndent(inst, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(metaFile, data, 0644)
}

// ListServers scans the servers directory and loads all metadata.
func ListServers() ([]ServerInstance, error) {
	root := GetServerRoot()
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}

	var list []ServerInstance
	for _, entry := range entries {
		if entry.IsDir() {
			inst, err := LoadServer(entry.Name())
			if err == nil && inst != nil {
				list = append(list, *inst)
			}
		}
	}

	// Return empty list instead of null if none found
	if list == nil {
		list = []ServerInstance{}
	}

	return list, nil
}

// CreateServer creates a new isolated server directory and downloads the JAR.
func CreateServer(payload CreateServerPayload) (*ServerInstance, error) {
	// 1. Create a safe ID slug
	safeName := strings.ToLower(payload.Name)
	safeName = strings.ReplaceAll(safeName, " ", "-")
	
	// Strip special characters
	var sb strings.Builder
	for _, r := range safeName {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			sb.WriteRune(r)
		}
	}
	id := fmt.Sprintf("%s-%d", sb.String(), time.Now().Unix()%100000)

	serverDir := filepath.Join(GetServerRoot(), id)
	if err := utils.EnsureDir(serverDir); err != nil {
		return nil, err
	}

	// Find default java
	javaPath := "java"
	if RequiresJava25(ServerType(payload.Type), payload.Version) {
		if j25Path, found := utils.FindJava25(); found {
			javaPath = j25Path
		}
	} else {
		javas := utils.FindJavaInstallations()
		if len(javas) > 0 {
			javaPath = javas[0].Path
		}
	}

	// 2. Perform Jar Downloading / Installation in background
	setStatus(id, "installing")

	// Pre-create properties so it shows up in UI
	port := 25565
	servers, _ := ListServers()
	usedPorts := make(map[int]bool)
	for _, s := range servers {
		usedPorts[s.Port] = true
	}
	for usedPorts[port] {
		port++
	}

	inst := &ServerInstance{
		ID:        id,
		Name:      payload.Name,
		Version:   payload.Version,
		Type:      ServerType(payload.Type),
		Path:      serverDir,
		Status:    "installing",
		JavaPath:  javaPath,
		MemoryMB:  payload.MemoryMB,
		World:     "world",
		IPAddress: "127.0.0.1",
		Port:      port,
		Watchdog:  false,
	}

	if err := SaveServer(inst); err != nil {
		os.RemoveAll(serverDir)
		setStatus(id, "offline")
		return nil, err
	}

	go func() {
		launcher.WriteLog(id, "[MACE] Starting server installation...")
		err := downloader.InstallServer(id, payload.Type, payload.Version, serverDir, javaPath)
		if err != nil {
			launcher.WriteLog(id, "[MACE] Installation failed: " + err.Error())
			setStatus(id, "offline") // Or handle error state
			return
		}

		// Write default properties file
		props := fmt.Sprintf("server-port=%d\nquery.port=%d\nmotd=MACE Server: %s\ndifficulty=easy\npvp=true\nmax-players=20\nonline-mode=true\n", port, port, payload.Name)
		os.WriteFile(filepath.Join(serverDir, "server.properties"), []byte(props), 0644)

		// Write EULA
		os.WriteFile(filepath.Join(serverDir, "eula.txt"), []byte("eula=true\n"), 0644)

		launcher.WriteLog(id, "[MACE] Installation complete!")
		setStatus(id, "offline")
	}()

	return inst, nil
}

// ImportServer registers an external server directory as a managed instance.
func ImportServer(payload ImportServerPayload) (*ServerInstance, error) {
	absPath, err := filepath.Abs(payload.Path)
	if err != nil {
		return nil, fmt.Errorf("invalid path: %v", err)
	}

	info, err := os.Stat(absPath)
	if err != nil || !info.IsDir() {
		return nil, fmt.Errorf("invalid directory: %s", absPath)
	}

	// Basic validation: ensure there's at least a jar or script
	files, err := os.ReadDir(absPath)
	if err != nil {
		return nil, err
	}

	var hasJarOrScript bool
	var detectedType ServerType = Vanilla
	
	for _, f := range files {
		name := strings.ToLower(f.Name())
		if strings.HasSuffix(name, ".jar") || strings.HasSuffix(name, ".bat") || strings.HasSuffix(name, ".sh") {
			hasJarOrScript = true
		}
		
		if name == "run.bat" || name == "run.sh" {
			// Read script to detect forge vs neoforge
			content, _ := os.ReadFile(filepath.Join(absPath, f.Name()))
			if strings.Contains(strings.ToLower(string(content)), "neoforge") {
				detectedType = NeoForge
			} else {
				detectedType = Forge
			}
		} else if strings.HasPrefix(name, "quilt-server") {
			detectedType = Quilt
		} else if strings.HasPrefix(name, "fabric-server") || name == ".fabric" {
			detectedType = Fabric
		} else if strings.HasPrefix(name, "paper") || strings.HasPrefix(name, "patched") {
			detectedType = Paper
		} else if strings.HasPrefix(name, "spigot") {
			detectedType = Spigot
		}
	}

	if !hasJarOrScript {
		return nil, fmt.Errorf("no server jars or run scripts found in directory")
	}

	// Create a safe ID slug
	name := payload.Name
	if name == "" {
		name = filepath.Base(absPath)
	}
	
	safeName := strings.ToLower(name)
	safeName = strings.ReplaceAll(safeName, " ", "-")
	var sb strings.Builder
	for _, r := range safeName {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			sb.WriteRune(r)
		}
	}
	id := fmt.Sprintf("%s-import-%d", sb.String(), time.Now().Unix()%100000)

	// Java path
	javaPath := "java"
	javas := utils.FindJavaInstallations()
	if len(javas) > 0 {
		javaPath = javas[0].Path
	}

	// Try extracting motd and port
	port := 25565
	propsFile := filepath.Join(absPath, "server.properties")
	if utils.FileExists(propsFile) {
		if content, err := os.ReadFile(propsFile); err == nil {
			lines := strings.Split(string(content), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "server-port=") {
					fmt.Sscanf(line, "server-port=%d", &port)
				}
				if strings.HasPrefix(line, "motd=") && payload.Name == "" {
					name = strings.TrimPrefix(line, "motd=")
				}
			}
		}
	}

	inst := &ServerInstance{
		ID:        id,
		Name:      name,
		Version:   "imported",
		Type:      detectedType,
		Path:      absPath, // Use external path
		Status:    "offline",
		JavaPath:  javaPath,
		MemoryMB:  2048,
		World:     "world",
		IPAddress: "127.0.0.1",
		Port:      port,
		Watchdog:  false,
	}

	if err := SaveServer(inst); err != nil {
		return nil, err
	}

	return inst, nil
}

// StartServer handles starting a server instance process.
func StartServer(id string) (string, error) {
	inst, err := LoadServer(id)
	if err != nil {
		return "", err
	}

	// Validate Java 25 requirement
	if RequiresJava25(inst.Type, inst.Version) {
		currentVer := utils.GetJavaVersion(inst.JavaPath)
		if !utils.IsJava25(currentVer) {
			if j25Path, found := utils.FindJava25(); found {
				inst.JavaPath = j25Path
				SaveServer(inst)
				launcher.WriteLog(id, "[MACE] Auto-aligned server Java runtime to Java 25: "+j25Path)
			} else {
				return "", fmt.Errorf("this server version requires a Java 25 runtime environment, but only Java %s was configured and no Java 25 was detected on the system", currentVer)
			}
		}
	}

	statusCallback := func(instanceID string, status string) {
		setStatus(instanceID, status)
	}

	setStatus(id, "starting")
	state, err := launcher.StartServer(inst.ID, inst.Path, inst.JavaPath, inst.MemoryMB, inst.Watchdog, statusCallback)
	if err != nil {
		setStatus(id, "offline")
		return "", err
	}

	setStatus(id, "online")
	return state, nil
}

// StopServer requests the server process to exit.
func StopServer(id string) (string, error) {
	setStatus(id, "stopping")
	state, err := launcher.StopServer(id)
	if err != nil {
		return "", err
	}
	return state, nil
}

// GetConsoleLogs retrieves buffered logs.
func GetConsoleLogs(id string) ([]string, error) {
	return launcher.GetLogs(id), nil
}

// SendCommand writes a command to the server stdin.
func SendCommand(id string, cmd string) error {
	return launcher.WriteCommand(id, cmd)
}

// GetServerProperties reads raw server.properties contents.
func GetServerProperties(id string) (string, error) {
	inst, err := LoadServer(id)
	if err != nil {
		return "", err
	}

	propsFile := filepath.Join(inst.Path, "server.properties")
	if !utils.FileExists(propsFile) {
		return "", nil
	}

	data, err := os.ReadFile(propsFile)
	return string(data), err
}

// UpdateServerConfig saves updated configuration.
func UpdateServerConfig(payload UpdateConfigPayload) error {
	inst, err := LoadServer(payload.ID)
	if err != nil {
		return err
	}

	inst.Name = payload.Name
	inst.JavaPath = payload.JavaPath
	inst.MemoryMB = payload.MemoryMB
	inst.Port = payload.Port
	inst.Watchdog = payload.Watchdog

	// Save server properties file
	propsFile := filepath.Join(inst.Path, "server.properties")
	if payload.RawProps != "" {
		if err := os.WriteFile(propsFile, []byte(payload.RawProps), 0644); err != nil {
			return err
		}
	}

	return SaveServer(inst)
}

// DeleteServer kills the process and deletes the server directory.
func DeleteServer(id string) error {
	inst, err := LoadServer(id)
	if err != nil {
		return err
	}

	if launcher.IsRunning(id) {
		launcher.KillServer(id)
		time.Sleep(500 * time.Millisecond) // Give time to exit
	}

	// For managed servers, inst.Path == GetServerRoot()/id
	// For imported servers, inst.Path is external.
	// Only delete the actual files if it's a managed server.
	managedPath := filepath.Clean(filepath.Join(GetServerRoot(), id))
	if filepath.Clean(inst.Path) == managedPath {
		return os.RemoveAll(inst.Path)
	}
	
	// External server, just delete the MACE metadata wrapper
	return os.RemoveAll(managedPath)
}

// DetectJava searches for system java paths.
func DetectJava() ([]utils.JavaInstall, error) {
	return utils.FindJavaInstallations(), nil
}

// SubscribeLogs forwards subscription to launcher
func SubscribeLogs(id string) chan string {
	return launcher.SubscribeLogs(id)
}

// UnsubscribeLogs forwards unsubscription to launcher
func UnsubscribeLogs(id string, ch chan string) {
	launcher.UnsubscribeLogs(id, ch)
}

var (
	versionsCache     map[string][]string
	versionsCacheMu   sync.Mutex
	versionsCacheTime time.Time
)

// GetAvailableVersions aggregates available versions for all loaders in parallel, with in-memory caching and resilient error handling.
func GetAvailableVersions() (map[string][]string, error) {
	versionsCacheMu.Lock()
	defer versionsCacheMu.Unlock()

	// If cache is fresh (less than 1 hour old), return it
	if versionsCache != nil && time.Since(versionsCacheTime) < 1*time.Hour {
		return versionsCache, nil
	}

	type res struct {
		loader string
		vers   []string
		err    error
	}

	ch := make(chan res, 6)

	go func() {
		v, err := downloader.FetchVanillaVersions()
		ch <- res{"vanilla", v, err}
	}()
	go func() {
		v, err := downloader.FetchPaperVersions()
		ch <- res{"paper", v, err}
	}()
	go func() {
		v, err := downloader.FetchFabricVersions()
		ch <- res{"fabric", v, err}
	}()
	go func() {
		v, err := downloader.FetchQuiltVersions()
		ch <- res{"quilt", v, err}
	}()
	go func() {
		v, err := downloader.FetchForgeVersions()
		ch <- res{"forge", v, err}
	}()
	go func() {
		v, err := downloader.FetchNeoForgeVersions()
		ch <- res{"neoforge", v, err}
	}()

	results := make(map[string][]string)
	var firstErr error

	for i := 0; i < 6; i++ {
		r := <-ch
		if r.err != nil {
			if firstErr == nil {
				firstErr = r.err
			}
			results[r.loader] = []string{}
		} else {
			results[r.loader] = r.vers
		}
	}

	if firstErr != nil {
		// If there is an error but we have an old cache, return it to ensure resilience
		if versionsCache != nil {
			versionsCacheTime = time.Now() // Delay next fetch attempt by 1 hour
			return versionsCache, nil
		}
		// If vanilla is empty and we have no cache, we cannot proceed
		if len(results["vanilla"]) == 0 {
			return nil, fmt.Errorf("failed to fetch versions: %w", firstErr)
		}
	}

	versionsCache = results
	versionsCacheTime = time.Now()

	return results, nil
}

// GetServerResources returns live resource usage for a running server.
func GetServerResources(id string) (*launcher.ResourceUsage, error) {
	return launcher.GetResourceUsage(id)
}

// RequiresJava25 returns true if the server type or minecraft version requires Java 25.
func RequiresJava25(serverType ServerType, mcVersion string) bool {
	parts := strings.Split(mcVersion, ".")
	if len(parts) == 0 {
		return false
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return false
	}
	return major >= 26
}
