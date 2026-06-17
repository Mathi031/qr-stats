package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// bearerPrefix es el prefijo de esquema requerido en la cabecera Authorization.
const bearerPrefix = "Bearer "

// RequireJWT devuelve un middleware de Fiber que rechaza toda petición sin una
// cabecera "Authorization: Bearer <token>" válida.
func RequireJWT(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		if !strings.HasPrefix(header, bearerPrefix) {
			return fiber.NewError(fiber.StatusUnauthorized, "cabecera Authorization ausente o mal formada")
		}

		raw := strings.TrimSpace(header[len(bearerPrefix):])
		claims, err := ParseToken(secret, raw)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "token invalido o expirado")
		}

		c.Locals("user", claims.Subject)
		return c.Next()
	}
}
