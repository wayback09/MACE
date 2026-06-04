package launcher

import (
	"fmt"
	"os/exec"
	"time"
)

// RunWatchdog monitors a running Minecraft server process and auto-restarts on crash.
func RunWatchdog(
	id string, 
	cmd *exec.Cmd, 
	dir string, 
	javaPath string, 
	memoryMB int, 
	watchdogEnabled bool, 
	statusCallback func(string, string),
) {
	// Block until process exits
	err := cmd.Wait()
	
	DeregisterProcess(id)
	
	exitCode := -1
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
	}

	WriteLog(id, fmt.Sprintf("[MACE] Server process terminated with exit code %d (err: %v)", exitCode, err))

	// If exitCode == 0, it was a clean stop command
	if exitCode == 0 || exitCode == 130 { // 130 is SIGINT
		statusCallback(id, "offline")
		WriteLog(id, "[MACE] Server stopped cleanly.")
		return
	}

	// Abnormal exit - crash
	if watchdogEnabled {
		statusCallback(id, "restarting")
		WriteLog(id, "[MACE] Watchdog: Crash detected! Auto-restarting server in 5 seconds...")
		time.Sleep(5 * time.Second)

		// Attempt restart
		_, err := StartServer(id, dir, javaPath, memoryMB, watchdogEnabled, statusCallback)
		if err != nil {
			WriteLog(id, fmt.Sprintf("[MACE] Watchdog: Auto-restart failed: %v", err))
			statusCallback(id, "offline")
		} else {
			statusCallback(id, "online")
			WriteLog(id, "[MACE] Watchdog: Server restarted successfully.")
		}
	} else {
		statusCallback(id, "offline")
		WriteLog(id, "[MACE] Server crashed/stopped unexpectedly. Auto-restart is disabled.")
	}
}
