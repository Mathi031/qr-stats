package server

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"qr-api/internal/auth"
	"qr-api/internal/config"
	"qr-api/internal/handler"
)

// New construye una aplicación Fiber completamente configurada.
func New(cfg config.Config) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "qr-api",
		ErrorHandler: handler.ErrorHandler,
	})

	app.Use(recover.New())
	app.Use(logger.New())

	// CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigin,
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type,Authorization",
	}))

	h := handler.New(cfg)

	app.Get("/health", h.Health)

	v1 := app.Group("/api/v1")
	v1.Post("/token", h.Token)
	v1.Post("/qr", auth.RequireJWT(cfg.JWTSecret), h.QR)

	return app
}
