package utils

import "testing"

func TestParseMajorJavaVersion(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"1.8.0_391", 8},
		{"1.8.0", 8},
		{"17.0.2", 17},
		{"21.0.1", 21},
		{"21-ea", 21},
		{"11.0.18", 11},
		{"16.0.1", 16},
		{"invalid", 0},
	}

	for _, tt := range tests {
		actual := ParseMajorJavaVersion(tt.input)
		if actual != tt.expected {
			t.Errorf("ParseMajorJavaVersion(%q) = %d; want %d", tt.input, actual, tt.expected)
		}
	}
}

func TestGetRequiredJavaVersion(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"1.20.6", 21},
		{"1.20.5", 21},
		{"1.20.4", 17},
		{"1.20", 17},
		{"1.19.4", 17},
		{"1.18.2", 17},
		{"1.17.1", 16},
		{"1.16.5", 8},
		{"1.12.2", 8},
		{"1.8.9", 8},
		{"invalid", 8},
	}

	for _, tt := range tests {
		actual := GetRequiredJavaVersion(tt.input)
		if actual != tt.expected {
			t.Errorf("GetRequiredJavaVersion(%q) = %d; want %d", tt.input, actual, tt.expected)
		}
	}
}
