package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "unit-test-secret"

func TestNewTokenRoundTrip(t *testing.T) {
	token, expiresIn, err := NewToken(secret, "alice")
	if err != nil {
		t.Fatalf("NewToken: %v", err)
	}
	if expiresIn != 3600 {
		t.Fatalf("expiresIn = %d, want 3600", expiresIn)
	}

	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}
	if claims.Subject != "alice" {
		t.Fatalf("subject = %q, want %q", claims.Subject, "alice")
	}
}

func TestParseTokenWrongSecret(t *testing.T) {
	token, _, err := NewToken(secret, "alice")
	if err != nil {
		t.Fatalf("NewToken: %v", err)
	}
	if _, err := ParseToken("a-different-secret", token); err == nil {
		t.Fatal("expected error when parsing with the wrong secret, got nil")
	}
}

func TestParseTokenExpired(t *testing.T) {
	// Construye un token con expiración en el pasado y confirma que el parseo lo rechaza.
	claims := jwt.RegisteredClaims{
		Subject:   "alice",
		IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign expired token: %v", err)
	}

	if _, err := ParseToken(secret, signed); err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}
