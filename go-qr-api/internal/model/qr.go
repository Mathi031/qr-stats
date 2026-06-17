package model

import "encoding/json"

// QRRequest es el cuerpo de POST /api/v1/qr.
type QRRequest struct {
	Matrix [][]float64 `json:"matrix"`
}

// InputDims describe las dimensiones de la matriz de entrada.
type InputDims struct {
	Rows int `json:"rows"`
	Cols int `json:"cols"`
}

// QRResponse es la respuesta exitosa de POST /api/v1/qr.
type QRResponse struct {
	Input      InputDims       `json:"input"`
	Q          [][]float64     `json:"q"`
	R          [][]float64     `json:"r"`
	Statistics json.RawMessage `json:"statistics"`
}
