package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTTL = time.Hour

// ErrInvalidToken se devuelve cuando un token falta, está mal formado, ha expirado
var ErrInvalidToken = errors.New("token invalido o expirado")

// NewToken emite un token firmado
func NewToken(secret, username string) (string, int, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   username,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", 0, err
	}

	return signed, int(tokenTTL.Seconds()), nil
}

// ParseToken valida la firma y la expiración de tokenString usando secret.
func ParseToken(secret, tokenString string) (*jwt.RegisteredClaims, error) {
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
