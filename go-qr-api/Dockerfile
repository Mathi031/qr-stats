# --- build stage ---
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /qr-api ./cmd/server

# --- runtime stage ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /qr-api /qr-api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/qr-api"]
