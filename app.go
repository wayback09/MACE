package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mace/backend/pkg/launcher"
	"mace/backend/pkg/servermanager"
	"mace/backend/pkg/utils"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	doneChannels map[string]chan struct{}
	mu           sync.Mutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		doneChannels: make(map[string]chan struct{}),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// domReady is called when the DOM is fully loaded
func (a *App) domReady(ctx context.Context) {
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for id, done := range a.doneChannels {
		close(done)
		delete(a.doneChannels, id)
	}
}

// ListServers returns a list of all Minecraft servers.
func (a *App) ListServers() ([]servermanager.ServerInstance, error) {
	return servermanager.ListServers()
}

// CreateServer creates a new isolated server directory and downloads the JAR.
func (a *App) CreateServer(payload servermanager.CreateServerPayload) (*servermanager.ServerInstance, error) {
	if payload.Name == "" || payload.Version == "" || payload.Type == "" {
		return nil, fmt.Errorf("missing required fields (name, version, type)")
	}
	if payload.MemoryMB <= 0 {
		payload.MemoryMB = 2048
	}
	return servermanager.CreateServer(payload)
}

// StartServer starts a server instance process.
func (a *App) StartServer(id string) (string, error) {
	return servermanager.StartServer(id)
}

// StopServer stops a server instance process.
func (a *App) StopServer(id string) (string, error) {
	return servermanager.StopServer(id)
}

// RestartServer restarts a server instance process by stopping, waiting, and starting again.
func (a *App) RestartServer(id string) error {
	_, err := servermanager.StopServer(id)
	if err != nil {
		return err
	}

	// Poll launcher status for up to 10 seconds or until it stops running
	for i := 0; i < 20; i++ {
		if !launcher.IsRunning(id) {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	_, err = servermanager.StartServer(id)
	return err
}

// DeleteServer deletes a server instance's folder and processes.
func (a *App) DeleteServer(id string) error {
	return servermanager.DeleteServer(id)
}

// GetConsoleLogs retrieves buffered logs for a server instance.
func (a *App) GetConsoleLogs(id string) ([]string, error) {
	return servermanager.GetConsoleLogs(id)
}

// SendCommand writes a command to the Minecraft server stdin.
func (a *App) SendCommand(id string, command string) error {
	return servermanager.SendCommand(id, command)
}

// GetServerProperties reads raw server.properties contents.
func (a *App) GetServerProperties(id string) (string, error) {
	return servermanager.GetServerProperties(id)
}

// UpdateServerConfig saves updated configuration.
func (a *App) UpdateServerConfig(payload servermanager.UpdateConfigPayload) error {
	return servermanager.UpdateServerConfig(payload)
}

// DetectJava searches for system java paths.
func (a *App) DetectJava() ([]utils.JavaInstall, error) {
	return servermanager.DetectJava()
}

// GetAvailableVersions aggregates available versions for all loaders.
func (a *App) GetAvailableVersions() (map[string][]string, error) {
	return servermanager.GetAvailableVersions()
}

// GetServerResources returns live CPU/memory/uptime for a running server process.
func (a *App) GetServerResources(id string) (map[string]interface{}, error) {
	usage, err := servermanager.GetServerResources(id)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"cpuPercent": usage.CPUPercent,
		"memoryMB":   usage.MemoryMB,
		"uptime":     usage.Uptime,
	}, nil
}

// SubscribeConsole starts streaming logs for a server instance.
func (a *App) SubscribeConsole(id string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// If already subscribed, do nothing
	if _, ok := a.doneChannels[id]; ok {
		return
	}

	done := make(chan struct{})
	a.doneChannels[id] = done

	// Fetch existing logs first
	logs, _ := servermanager.GetConsoleLogs(id)
	for _, line := range logs {
		runtime.EventsEmit(a.ctx, "console-log-"+id, line)
	}

	ch := servermanager.SubscribeLogs(id)

	go func() {
		defer servermanager.UnsubscribeLogs(id, ch)
		for {
			select {
			case logLine, ok := <-ch:
				if !ok {
					return
				}
				runtime.EventsEmit(a.ctx, "console-log-"+id, logLine)
			case <-done:
				return
			}
		}
	}()
}

// UnsubscribeConsole stops streaming logs for a server instance.
func (a *App) UnsubscribeConsole(id string) {
	a.mu.Lock()
	if done, ok := a.doneChannels[id]; ok {
		close(done)
		delete(a.doneChannels, id)
	}
	a.mu.Unlock()
}
