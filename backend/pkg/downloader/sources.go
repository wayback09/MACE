package downloader

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Mojang JSON Types
type MojangManifest struct {
	Latest struct {
		Release  string `json:"release"`
		Snapshot string `json:"snapshot"`
	} `json:"latest"`
	Versions []struct {
		ID   string `json:"id"`
		Type string `json:"type"`
		URL  string `json:"url"`
	} `json:"versions"`
}

type MojangVersionDetail struct {
	Downloads struct {
		Server struct {
			URL string `json:"url"`
		} `json:"server"`
	} `json:"downloads"`
}

// Paper JSON Types
type PaperVersionsResponse struct {
	Builds []int `json:"builds"`
}

// Fabric JSON Types
type FabricInstallerVersion struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}

// Quilt JSON Types
type QuiltInstallerVersion struct {
	Version string `json:"version"`
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// CompareVersions compares two version strings. Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if v1 == v2.
func CompareVersions(v1, v2 string) int {
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var p1, p2 int
		if i < len(parts1) {
			p1, _ = strconv.Atoi(parts1[i])
		}
		if i < len(parts2) {
			p2, _ = strconv.Atoi(parts2[i])
		}

		if p1 != p2 {
			if p1 < p2 {
				return -1
			}
			return 1
		}
	}
	return 0
}

// FetchVanillaVersions fetches release versions from Mojang manifest.
func FetchVanillaVersions() ([]string, error) {
	resp, err := httpClient.Get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var manifest MojangManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return nil, err
	}

	var list []string
	for _, v := range manifest.Versions {
		if v.Type == "release" && strings.HasPrefix(v.ID, "1.") {
			list = append(list, v.ID)
		}
	}
	return list, nil
}

// FetchPaperVersions fetches all available Paper versions.
func FetchPaperVersions() ([]string, error) {
	resp, err := httpClient.Get("https://api.papermc.io/v2/projects/paper")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data struct {
		Versions []string `json:"versions"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var list []string
	for _, v := range data.Versions {
		if strings.HasPrefix(v, "1.") {
			list = append(list, v)
		}
	}

	// Reverse list to show newest first
	for i, j := 0, len(list)-1; i < j; i, j = i+1, j-1 {
		list[i], list[j] = list[j], list[i]
	}

	return list, nil
}

// FetchFabricVersions fetches stable Fabric game versions.
func FetchFabricVersions() ([]string, error) {
	resp, err := httpClient.Get("https://meta.fabricmc.net/v2/versions/game")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var versions []struct {
		Version string `json:"version"`
		Stable  bool   `json:"stable"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&versions); err != nil {
		return nil, err
	}

	var list []string
	for _, v := range versions {
		if v.Stable && strings.HasPrefix(v.Version, "1.") {
			list = append(list, v.Version)
		}
	}
	return list, nil
}

// FetchQuiltVersions fetches stable Quilt game versions.
func FetchQuiltVersions() ([]string, error) {
	resp, err := httpClient.Get("https://meta.quiltmc.org/v3/versions/game")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var versions []struct {
		Version string `json:"version"`
		Stable  bool   `json:"stable"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&versions); err != nil {
		return nil, err
	}

	var list []string
	for _, v := range versions {
		if v.Stable && strings.HasPrefix(v.Version, "1.") {
			list = append(list, v.Version)
		}
	}
	return list, nil
}

// FetchForgeVersions fetches unique Minecraft versions from Forge promotions_slim.json.
func FetchForgeVersions() ([]string, error) {
	resp, err := httpClient.Get("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data struct {
		Promos map[string]string `json:"promos"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	versionMap := make(map[string]bool)
	for key := range data.Promos {
		// Key is like "1.20.1-latest" or "1.20.1-recommended"
		idx := strings.Index(key, "-")
		if idx != -1 {
			mcVer := key[:idx]
			if strings.HasPrefix(mcVer, "1.") {
				versionMap[mcVer] = true
			}
		}
	}

	var list []string
	for v := range versionMap {
		list = append(list, v)
	}

	sort.Slice(list, func(i, j int) bool {
		return CompareVersions(list[i], list[j]) > 0 // Descending (newest first)
	})

	return list, nil
}

// FetchVanillaURL fetches the Mojang server jar URL for a specific version.
func FetchVanillaURL(version string) (string, error) {
	resp, err := httpClient.Get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var manifest MojangManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return "", err
	}

	var detailURL string
	for _, v := range manifest.Versions {
		if v.ID == version {
			detailURL = v.URL
			break
		}
	}

	if detailURL == "" {
		return "", fmt.Errorf("version %s not found in Mojang manifest", version)
	}

	respDetail, err := httpClient.Get(detailURL)
	if err != nil {
		return "", err
	}
	defer respDetail.Body.Close()

	var detail MojangVersionDetail
	if err := json.NewDecoder(respDetail.Body).Decode(&detail); err != nil {
		return "", err
	}

	if detail.Downloads.Server.URL == "" {
		return "", fmt.Errorf("server jar download URL not found for version %s", version)
	}

	return detail.Downloads.Server.URL, nil
}

// FetchPaperURL fetches the latest build download URL for PaperMC for a specific version.
func FetchPaperURL(version string) (string, error) {
	// 1. Get builds for the version
	url := fmt.Sprintf("https://api.papermc.io/v2/projects/paper/versions/%s", version)
	resp, err := httpClient.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", fmt.Errorf("paper version %s not supported or not found", version)
	}

	var paperRes PaperVersionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&paperRes); err != nil {
		return "", err
	}

	if len(paperRes.Builds) == 0 {
		return "", fmt.Errorf("no builds found for Paper version %s", version)
	}

	latestBuild := paperRes.Builds[len(paperRes.Builds)-1]
	downloadName := fmt.Sprintf("paper-%s-%d.jar", version, latestBuild)
	downloadURL := fmt.Sprintf("https://api.papermc.io/v2/projects/paper/versions/%s/builds/%d/downloads/%s", version, latestBuild, downloadName)

	return downloadURL, nil
}

// FetchLatestFabricInstaller fetches the latest stable Fabric installer version.
func FetchLatestFabricInstaller() (string, error) {
	resp, err := httpClient.Get("https://meta.fabricmc.net/v2/versions/installer")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var installers []FabricInstallerVersion
	if err := json.NewDecoder(resp.Body).Decode(&installers); err != nil {
		return "", err
	}

	for _, inst := range installers {
		if inst.Stable {
			return inst.Version, nil
		}
	}

	if len(installers) > 0 {
		return installers[0].Version, nil
	}

	return "1.0.1", nil // Fallback
}

// FetchLatestQuiltInstaller fetches the latest Quilt installer version.
func FetchLatestQuiltInstaller() (string, error) {
	resp, err := httpClient.Get("https://meta.quiltmc.org/v3/versions/installer")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var installers []QuiltInstallerVersion
	if err := json.NewDecoder(resp.Body).Decode(&installers); err != nil {
		return "", err
	}

	if len(installers) > 0 {
		return installers[0].Version, nil
	}

	return "0.9.2", nil // Fallback
}
