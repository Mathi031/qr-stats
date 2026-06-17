package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"qr-api/internal/config"
	"qr-api/internal/server"
)

func main() {
	cfg := config.Load()

	app := server.New(cfg)

	// El servidor escucha en una goroutine para no bloquear el hilo principal,
	// que queda libre para esperar las señales de apagado.
	go func() {
		log.Printf("qr-api listening on :%s (stats backend: %s)", cfg.Port, cfg.StatsAPIURL)
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("server stopped: %v", err)
		}
	}()

	// Apagado ordenado: Render (y Docker) envían SIGTERM al re-desplegar o escalar.
	// Drenamos las peticiones en vuelo con un timeout antes de salir.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("apagando qr-api...")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("error en el apagado: %v", err)
	}
}
