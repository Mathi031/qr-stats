package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// requestTimeout acota cada llamada a stats-api para que una dependencia lenta
// o inalcanzable nunca deje colgada la petición de qr-api.
const requestTimeout = 5 * time.Second

// StatsClient llama al endpoint POST /api/v1/statistics de stats-api.
type StatsClient struct {
	baseURL     string
	internalKey string
	httpClient  *http.Client
}

// namedMatrix es una entrada del payload de la petición de estadísticas.
type namedMatrix struct {
	Name string      `json:"name"`
	Data [][]float64 `json:"data"`
}

type statisticsRequest struct {
	Matrices []namedMatrix `json:"matrices"`
}

// New devuelve un StatsClient apuntando a la base URL dada. El internalKey se
// envía en cada petición para que stats-api pueda
// rechazar llamadas que no provengan de qr-api.
func New(baseURL, internalKey string) *StatsClient {
	return &StatsClient{
		baseURL:     strings.TrimRight(baseURL, "/"),
		internalKey: internalKey,
		httpClient:  &http.Client{},
	}
}

// Fetch envía las matrices Q y R a stats-api y devuelve su cuerpo de respuesta
// como JSON crudo.
func (c *StatsClient) Fetch(ctx context.Context, q, r [][]float64) (json.RawMessage, error) {
	payload := statisticsRequest{
		Matrices: []namedMatrix{
			{Name: "Q", Data: q},
			{Name: "R", Data: r},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("codificar peticion de estadisticas: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()

	url := c.baseURL + "/api/v1/statistics"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("construir peticion de estadisticas: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Key", c.internalKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("llamar a stats-api: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("leer respuesta de stats-api: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("stats-api devolvio estado %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	return json.RawMessage(respBody), nil
}
