package qr

import (
	"errors"
	// El álgebra lineal se delega en gonum (gonum.org/v1/gonum/mat), probado en
	// producción; este paquete solo se encarga de la validación y de la conversión
	// entre matrices [][]float64 planas y el mat.Dense de gonum
	"gonum.org/v1/gonum/mat"
)

// Epsilon es la tolerancia usada en las comparaciones de punto flotante
const Epsilon = 1e-9

// Errores de validación
var (
	ErrInvalidMatrix    = errors.New("la matriz debe ser no vacia y rectangular (todas las filas con igual longitud)")
	ErrRowsLessThanCols = errors.New("la matriz debe tener filas >= columnas para la factorización QR")
)

// Factorize devuelve la factorización QR completa de matrix: Q es m×m ortonormal
// y R es m×n triangular superior, tal que matrix = Q · R.
//
// Valida primero la entrada (devolviendo ErrInvalidMatrix o ErrRowsLessThanCols)
// para que gonum nunca se llame con una forma que provocaría panic.
func Factorize(matrix [][]float64) (q, r [][]float64, err error) {
	rows, cols, err := validate(matrix)
	if err != nil {
		return nil, nil, err
	}

	if rows < cols {
		return nil, nil, ErrRowsLessThanCols
	}

	a := mat.NewDense(rows, cols, flatten(matrix, rows, cols))

	var factor mat.QR
	factor.Factorize(a)

	var qDense, rDense mat.Dense
	factor.QTo(&qDense) // m×m
	factor.RTo(&rDense) // m×n

	q = toRows(&qDense)
	r = toRows(&rDense)

	for i := range r {
		for j := 0; j < i && j < len(r[i]); j++ {
			r[i][j] = 0
		}
	}

	return q, r, nil
}

// validate comprueba que matrix sea no vacía y rectangular, devolviendo sus
// dimensiones.
func validate(matrix [][]float64) (rows, cols int, err error) {
	if len(matrix) == 0 {
		return 0, 0, ErrInvalidMatrix
	}
	cols = len(matrix[0])
	if cols == 0 {
		return 0, 0, ErrInvalidMatrix
	}
	for _, row := range matrix {
		if len(row) != cols {
			return 0, 0, ErrInvalidMatrix
		}
	}
	return len(matrix), cols, nil
}

// flatten dispone un [][]float64 en orden row-major para mat.NewDense.
func flatten(matrix [][]float64, rows, cols int) []float64 {
	data := make([]float64, 0, rows*cols)
	for _, row := range matrix {
		data = append(data, row...)
	}
	return data
}

// toRows convierte una matriz densa de gonum en un [][]float64.
func toRows(m *mat.Dense) [][]float64 {
	rows, cols := m.Dims()
	out := make([][]float64, rows)
	for i := 0; i < rows; i++ {
		out[i] = make([]float64, cols)
		for j := 0; j < cols; j++ {
			out[i][j] = m.At(i, j)
		}
	}
	return out
}
