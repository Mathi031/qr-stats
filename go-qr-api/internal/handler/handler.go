package handler

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/gofiber/fiber/v2"

	"qr-api/internal/auth"
	"qr-api/internal/client"
	"qr-api/internal/config"
	"qr-api/internal/model"
	"qr-api/internal/qr"
)

// statsClient es el subconjunto del cliente de estadísticas del que depende el
// handler. Definirlo como interfaz mantiene el handler testeable con un stub.
type statsClient interface {
	Fetch(ctx context.Context, q, r [][]float64) (json.RawMessage, error)
}

type Handler struct {
	cfg   config.Config
	stats statsClient
}

// New devuelve un Handler cableado con la configuración dada.
func New(cfg config.Config) *Handler {
	return &Handler{
		cfg:   cfg,
		stats: client.New(cfg.StatsAPIURL, cfg.InternalAPIKey),
	}
}

func (h *Handler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"service": "qr-api",
	})
}

// tokenRequest es el cuerpo de POST /api/v1/token.
type tokenRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Token autentica credenciales estáticas y, en caso de éxito, devuelve un JWT
// firmado que el cliente debe presentar como token Bearer en las rutas protegidas.
func (h *Handler) Token(c *fiber.Ctx) error {
	var req tokenRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "cuerpo de peticion invalido: "+err.Error())
	}

	if req.Username != h.cfg.AuthUsername || req.Password != h.cfg.AuthPassword {
		return fiber.NewError(fiber.StatusUnauthorized, "credenciales invalidas")
	}

	token, expiresIn, err := auth.NewToken(h.cfg.JWTSecret, req.Username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "no se pudo emitir el token")
	}

	return c.JSON(fiber.Map{"token": token, "expiresIn": expiresIn})
}

// QR calcula la factorización QR de una matriz de entrada y la une con las
// estadísticas del servicio Node.
func (h *Handler) QR(c *fiber.Ctx) error {
	var req model.QRRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "cuerpo de peticion invalido: "+err.Error())
	}

	q, r, err := qr.Factorize(req.Matrix)
	if err != nil {
		switch {
		case errors.Is(err, qr.ErrRowsLessThanCols):
			return fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
		case errors.Is(err, qr.ErrInvalidMatrix):
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		default:
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
	}

	statistics, err := h.stats.Fetch(c.Context(), q, r)
	if err != nil {
		return fiber.NewError(fiber.StatusBadGateway, "stats-api no disponible: "+err.Error())
	}

	return c.JSON(model.QRResponse{
		Input:      model.InputDims{Rows: len(req.Matrix), Cols: len(req.Matrix[0])},
		Q:          q,
		R:          r,
		Statistics: statistics,
	})
}

// ErrorHandler es el manejador de errores global de Fiber.
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{"error": err.Error()})
}
