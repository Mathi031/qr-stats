package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	StatsAPIURL    string
	JWTSecret      string
	AuthUsername   string
	AuthPassword   string
	InternalAPIKey string
	CORSOrigin     string
}

// Load lee la configuración del entorno, aplicando defaults razonables.
func Load() Config {
	return Config{
		Port:           getEnv("PORT", "8080"),
		StatsAPIURL:    normalizeURL(getEnv("STATS_API_URL", "http://localhost:3000")),
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-change-me"),
		AuthUsername:   getEnv("AUTH_USERNAME", "admin"),
		AuthPassword:   getEnv("AUTH_PASSWORD", "admin"),
		InternalAPIKey: getEnv("INTERNAL_API_KEY", "dev-internal-key-change-me"),
		CORSOrigin:     getEnv("CORS_ORIGIN", "*"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

// normalizeURL antepone "http://" si la URL no trae esquema
func normalizeURL(raw string) string {
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	return "http://" + raw
}
