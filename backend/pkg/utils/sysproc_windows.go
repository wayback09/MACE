//go:build windows
// +build windows

package utils

import (
	"os/exec"
	"syscall"
)

// HideWindow applies the necessary SysProcAttr to hide the command window on Windows.
func HideWindow(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	cmd.SysProcAttr.CreationFlags = 0x08000000
}
