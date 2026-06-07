package servermanager

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

var (
	importsMu sync.Mutex
)

// getImportsFile returns the path to the imports.json registry file.
func getImportsFile() string {
	return filepath.Join(GetServerRoot(), "imports.json")
}

// loadImports reads the imports.json registry and returns a list of external server paths.
func loadImports() []string {
	importsMu.Lock()
	defer importsMu.Unlock()

	file := getImportsFile()
	if _, err := os.Stat(file); os.IsNotExist(err) {
		return []string{}
	}

	data, err := os.ReadFile(file)
	if err != nil {
		return []string{}
	}

	var paths []string
	if err := json.Unmarshal(data, &paths); err != nil {
		return []string{}
	}

	return paths
}

// saveImports writes the list of external server paths to imports.json.
func saveImports(paths []string) error {
	importsMu.Lock()
	defer importsMu.Unlock()

	data, err := json.MarshalIndent(paths, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(getImportsFile(), data, 0644)
}

// addImport adds a new external server path to the registry.
func addImport(path string) error {
	paths := loadImports()
	for _, p := range paths {
		if p == path {
			return nil // Already imported
		}
	}
	paths = append(paths, path)
	return saveImports(paths)
}

// removeImport removes an external server path from the registry.
func removeImport(path string) error {
	paths := loadImports()
	var newPaths []string
	for _, p := range paths {
		if p != path {
			newPaths = append(newPaths, p)
		}
	}
	return saveImports(newPaths)
}
