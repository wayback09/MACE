package servermanager

type ServerType string

const (
	Vanilla ServerType = "vanilla"
	Spigot  ServerType = "spigot"
	Paper   ServerType = "paper"
	Fabric  ServerType = "fabric"
	Quilt   ServerType = "quilt"
	Forge   ServerType = "forge"
	NeoForge ServerType = "neoforge"
)

type ServerInstance struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Version    string     `json:"version"`
	Type       ServerType `json:"type"`
	Path       string     `json:"path"`
	Status     string     `json:"status"`
	JavaPath   string     `json:"javaPath"`
	MemoryMB   int        `json:"memoryMB"`
	World      string     `json:"world"`
	IPAddress  string     `json:"ipAddress"`
	Port       int        `json:"port"`
	Watchdog   bool       `json:"watchdog"`
}

type CreateServerPayload struct {
	Name     string `json:"name"`
	Version  string `json:"version"`
	Type     string `json:"type"`
	MemoryMB int    `json:"memoryMB"`
}

type ImportServerPayload struct {
	Path string `json:"path"`
	Name string `json:"name"`
}


type UpdateConfigPayload struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	JavaPath  string `json:"javaPath"`
	MemoryMB  int    `json:"memoryMB"`
	Port      int    `json:"port"`
	Watchdog  bool   `json:"watchdog"`
	RawProps  string `json:"rawProps"` // For raw server.properties editing
}
