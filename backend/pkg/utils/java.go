package utils

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"syscall"
)

type JavaInstall struct {
	Path    string `json:"path"`
	Version string `json:"version"`
}

// FindJavaInstallations searches for java.exe in standard paths and the system PATH.
func FindJavaInstallations() []JavaInstall {
	paths := make(map[string]bool)

	// 1. Look in PATH
	if p, err := exec.LookPath("java"); err == nil {
		if abs, err := filepath.Abs(p); err == nil {
			paths[abs] = true
		}
	}

	// 2. Scan standard Windows Program Files directories
	roots := []string{
		`C:\Program Files\Java`,
		`C:\Program Files (x86)\Java`,
		`C:\Program Files\Eclipse Foundation`,
		`C:\Program Files\Amazon Corretto`,
		`C:\Program Files\Zulu`,
		`C:\Program Files\Semeru`,
	}

	for _, root := range roots {
		filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if !info.IsDir() && (info.Name() == "java.exe" || info.Name() == "java") {
				if abs, err := filepath.Abs(path); err == nil {
					// We only want paths that contain bin/java.exe to avoid duplicate sub-bin/DLL paths
					if strings.Contains(strings.ToLower(abs), "bin") {
						paths[abs] = true
					}
				}
			}
			return nil
		})
	}

	var installs []JavaInstall
	for path := range paths {
		ver := GetJavaVersion(path)
		if ver != "" {
			installs = append(installs, JavaInstall{
				Path:    path,
				Version: ver,
			})
		}
	}

	// If nothing found, return a default fallback
	if len(installs) == 0 {
		installs = append(installs, JavaInstall{
			Path:    "java",
			Version: "Default System (java)",
		})
	}

	return installs
}

// GetJavaVersion executes java -version and extracts the version string.
func GetJavaVersion(javaPath string) string {
	cmd := exec.Command(javaPath, "-version")
	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{
			HideWindow: true,
		}
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return ""
	}

	output := stderr.String()
	// Matches patterns like `version "21.0.1"` or `version "1.8.0_391"`
	re := regexp.MustCompile(`version "([^"]+)"`)
	matches := re.FindStringSubmatch(output)
	if len(matches) > 1 {
		return matches[1]
	}

	// Fallback for some non-standard outputs
	lines := strings.Split(output, "\n")
	if len(lines) > 0 {
		return strings.TrimSpace(lines[0])
	}

	return "Unknown"
}

// IsJava25 returns true if the Java version string matches Java 25.
func IsJava25(version string) bool {
	return strings.HasPrefix(version, "25.") || version == "25" || strings.HasPrefix(version, "25-")
}

// FindJava25 searches detected Java installations for a Java 25 path.
func FindJava25() (string, bool) {
	installs := FindJavaInstallations()
	for _, inst := range installs {
		if IsJava25(inst.Version) {
			return inst.Path, true
		}
	}
	return "", false
}

