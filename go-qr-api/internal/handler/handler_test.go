package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"

	"qr-api/internal/auth"
	"qr-api/internal/client"
	"qr-api/internal/config"
)

const (
	testSecret      = "test-secret"
	testInternalKey = "test-internal-key"
	testUsername    = "admin"
	testPassword    = "admin"
)

// newTestApp construye una app Fiber cableada igual que producción: /api/v1/token
// es abierta y /api/v1/qr queda tras el middleware JWT, con el ErrorHandler global
func newTestApp(statsURL string) *fiber.App {
	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler})
	cfg := config.Config{
		StatsAPIURL:    statsURL,
		JWTSecret:      testSecret,
		AuthUsername:   testUsername,
		AuthPassword:   testPassword,
		InternalAPIKey: testInternalKey,
	}
	h := &Handler{
		cfg:   cfg,
		stats: client.New(statsURL, testInternalKey),
	}
	v1 := app.Group("/api/v1")
	v1.Post("/token", h.Token)
	v1.Post("/qr", auth.RequireJWT(cfg.JWTSecret), h.QR)
	return app
}

// mockStats devuelve un httptest.Server que responde un payload de estadísticas prefabricado.
func mockStats(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"anyDiagonal":false,"aggregate":{"sum":1}}`)
	}))
}

// mintToken devuelve un token válido para el usuario de prueba, firmado con testSecret.
func mintToken(t *testing.T) string {
	t.Helper()
	token, _, err := auth.NewToken(testSecret, testUsername)
	if err != nil {
		t.Fatalf("mint token: %v", err)
	}
	return token
}

// doRequest hace POST de body a path con las cabeceras dadas y devuelve la respuesta.
func doRequest(t *testing.T, app *fiber.App, path, body string, headers map[string]string) (*http.Response, []byte) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	data, _ := io.ReadAll(resp.Body)
	return resp, data
}

// doPost hace POST de una petición QR con un token Bearer válido, de modo que los
// tests QR existentes ejercitan la ruta protegida igual que lo haría un cliente
// autenticado real.
func doPost(t *testing.T, app *fiber.App, body string) (*http.Response, []byte) {
	t.Helper()
	return doRequest(t, app, "/api/v1/qr", body, map[string]string{
		"Authorization": "Bearer " + mintToken(t),
	})
}

func TestQRHandlerSuccess(t *testing.T) {
	stats := mockStats(t)
	defer stats.Close()

	app := newTestApp(stats.URL)
	resp, data := doPost(t, app, `{"matrix":[[1,2],[3,4],[5,6]]}`)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", resp.StatusCode, data)
	}

	var out struct {
		Input      struct{ Rows, Cols int } `json:"input"`
		Q          [][]float64              `json:"q"`
		R          [][]float64              `json:"r"`
		Statistics json.RawMessage          `json:"statistics"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("unmarshal response: %v; body=%s", err, data)
	}
	if out.Input.Rows != 3 || out.Input.Cols != 2 {
		t.Fatalf("input dims = %dx%d, want 3x2", out.Input.Rows, out.Input.Cols)
	}
	if len(out.Q) != 3 || len(out.Q[0]) != 3 {
		t.Fatalf("Q shape = %dx%d, want 3x3", len(out.Q), len(out.Q[0]))
	}
	if len(out.R) != 3 || len(out.R[0]) != 2 {
		t.Fatalf("R shape = %dx%d, want 3x2", len(out.R), len(out.R[0]))
	}
	if len(out.Statistics) == 0 {
		t.Fatalf("statistics missing from response")
	}
}

func TestQRHandlerBadRequestJagged(t *testing.T) {
	stats := mockStats(t)
	defer stats.Close()

	app := newTestApp(stats.URL)
	resp, _ := doPost(t, app, `{"matrix":[[1,2],[3]]}`)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestQRHandlerUnprocessableRowsLessThanCols(t *testing.T) {
	stats := mockStats(t)
	defer stats.Close()

	app := newTestApp(stats.URL)
	resp, _ := doPost(t, app, `{"matrix":[[1,2,3]]}`)
	if resp.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", resp.StatusCode)
	}
}

func TestQRHandlerBadGatewayWhenStatsFails(t *testing.T) {
	// stats-api devuelve 500 -> el handler debe responder 502.
	stats := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer stats.Close()

	app := newTestApp(stats.URL)
	resp, _ := doPost(t, app, `{"matrix":[[1,2],[3,4],[5,6]]}`)
	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502", resp.StatusCode)
	}
}

func TestTokenEndpointValidCredentials(t *testing.T) {
	app := newTestApp("http://unused")
	resp, data := doRequest(t, app, "/api/v1/token",
		`{"username":"admin","password":"admin"}`, nil)

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", resp.StatusCode, data)
	}
	var out struct {
		Token     string `json:"token"`
		ExpiresIn int    `json:"expiresIn"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		t.Fatalf("unmarshal response: %v; body=%s", err, data)
	}
	if out.Token == "" {
		t.Fatalf("token missing from response: %s", data)
	}
	if out.ExpiresIn != 3600 {
		t.Fatalf("expiresIn = %d, want 3600", out.ExpiresIn)
	}
}

func TestTokenEndpointInvalidCredentials(t *testing.T) {
	app := newTestApp("http://unused")
	resp, _ := doRequest(t, app, "/api/v1/token",
		`{"username":"admin","password":"wrong"}`, nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestQRRequiresAuthMissingToken(t *testing.T) {
	app := newTestApp("http://unused")
	resp, _ := doRequest(t, app, "/api/v1/qr", `{"matrix":[[1,2],[3,4],[5,6]]}`, nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

func TestQRRequiresAuthBadToken(t *testing.T) {
	app := newTestApp("http://unused")
	resp, _ := doRequest(t, app, "/api/v1/qr", `{"matrix":[[1,2],[3,4],[5,6]]}`,
		map[string]string{"Authorization": "Bearer not-a-real-token"})
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}
