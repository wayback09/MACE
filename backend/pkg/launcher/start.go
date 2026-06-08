package launcher

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"mace/backend/pkg/utils"
)

var (
	processes   = make(map[string]*exec.Cmd)
	processesMu sync.Mutex
)

// IsRunning checks if a server instance is currently active.
func IsRunning(id string) bool {
	processesMu.Lock()
	defer processesMu.Unlock()
	cmd, ok := processes[id]
	if !ok || cmd == nil {
		return false
	}
	// Check if process has finished
	if cmd.ProcessState != nil && cmd.ProcessState.Exited() {
		return false
	}
	// Check if we can find the process (on Windows, standard check)
	if cmd.Process != nil {
		return true
	}
	return false
}

// StartServer launches the Minecraft server jar/scripts.
func StartServer(id string, dir string, javaPath string, memoryMB int, watchdogEnabled bool, statusCallback func(string, string)) (string, error) {
	if IsRunning(id) {
		return "running", nil
	}

	processesMu.Lock()
	defer processesMu.Unlock()

	// Clear logs of previous session
	ClearLogs(id)

	var cmd *exec.Cmd

	// Accept Minecraft EULA automatically if not present
	eulaFile := filepath.Join(dir, "eula.txt")
	if _, err := os.Stat(eulaFile); os.IsNotExist(err) {
		os.WriteFile(eulaFile, []byte("eula=true\n"), 0644)
	}

	// Check if modern Forge run script exists
	var useScript bool
	var scriptPath string
	if runtime.GOOS == "windows" {
		scriptPath = filepath.Join(dir, "run.bat")
		if _, err := os.Stat(scriptPath); err == nil {
			useScript = true
		}
	} else {
		scriptPath = filepath.Join(dir, "run.sh")
		if _, err := os.Stat(scriptPath); err == nil {
			useScript = true
		}
	}

	if useScript {
		// Modern Forge (1.17+) uses launch scripts.
		// Set memory configuration in user_jvm_args.txt
		jvmArgsFile := filepath.Join(dir, "user_jvm_args.txt")
		jvmArgsContent := fmt.Sprintf("-Xmx%dM\n-Xms%dM\n", memoryMB, memoryMB)
		os.WriteFile(jvmArgsFile, []byte(jvmArgsContent), 0644)

		if runtime.GOOS == "windows" {
			// Extract java arguments from run.bat to avoid cmd.exe swallowing stdin
			batData, err := os.ReadFile(scriptPath)
			if err == nil {
				lines := strings.Split(string(batData), "\n")
				var args []string
				for _, line := range lines {
					line = strings.TrimSpace(line)
					if strings.HasPrefix(line, "java ") || strings.HasPrefix(line, "%JAVA% ") {
						parts := strings.Split(line, " ")[1:]
						for _, p := range parts {
							p = strings.TrimSpace(p)
							if p != "" && p != "%*" {
								args = append(args, p)
							}
						}
						break
					}
				}
				if len(args) > 0 {
					args = append(args, "nogui")
					cmd = exec.Command(javaPath, args...)
				} else {
					cmd = exec.Command("cmd.exe", "/c", "run.bat")
				}
			} else {
				cmd = exec.Command("cmd.exe", "/c", "run.bat")
			}
		} else {
			cmd = exec.Command("sh", "run.sh")
		}
	} else {
		// Classic server.jar execution
		args := []string{
			fmt.Sprintf("-Xmx%dM", memoryMB),
			fmt.Sprintf("-Xms%dM", memoryMB),
			"-jar", "server.jar", "nogui",
		}
		cmd = exec.Command(javaPath, args...)
	}

	cmd.Dir = dir

	// Setup stdin
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdin pipe: %w", err)
	}
	RegisterStdin(id, stdin)

	// Setup stdout/stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		UnregisterStdin(id)
		return "", fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		UnregisterStdin(id)
		return "", fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Capture outputs in goroutines
	go CaptureConsole(id, stdout)
	go CaptureConsole(id, stderr)

	// Hide window on Windows
	utils.HideWindow(cmd)

	// Start the command
	if err := cmd.Start(); err != nil {
		UnregisterStdin(id)
		return "", fmt.Errorf("failed to start process: %w", err)
	}

	processes[id] = cmd
	startTimes[id] = time.Now()

	// Start Watchdog monitor
	go RunWatchdog(id, cmd, dir, javaPath, memoryMB, watchdogEnabled, statusCallback)

	return "started", nil
}

// StopServer stops a running Minecraft server.
func StopServer(id string) (string, error) {
	if !IsRunning(id) {
		return "stopped", nil
	}

	// Send "stop" command to Minecraft server stdin
	WriteLog(id, "[MACE] Sending stop command to server...")
	err := WriteCommand(id, "stop")
	if err != nil {
		// Fallback to killing process if stdin write fails
		WriteLog(id, "[MACE] Stdin stop failed, forcing process termination...")
		return KillServer(id)
	}

	return "stopping", nil
}

// KillServer forcefully terminates the process.
func KillServer(id string) (string, error) {
	processesMu.Lock()
	cmd, ok := processes[id]
	processesMu.Unlock()

	if !ok || cmd == nil || cmd.Process == nil {
		return "stopped", nil
	}

	err := cmd.Process.Kill()
	if err != nil {
		return "", fmt.Errorf("failed to kill process: %w", err)
	}

	return "killed", nil
}

// DeregisterProcess removes a process from the tracked map.
func DeregisterProcess(id string) {
	processesMu.Lock()
	delete(processes, id)
	delete(startTimes, id)
	processesMu.Unlock()
	UnregisterStdin(id)
}
