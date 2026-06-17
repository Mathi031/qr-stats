package qr

import (
	"errors"
	"math"
	"testing"
)

// matMul multiplica dos matrices [][]float64 (a es p×q, b es q×r).
func matMul(a, b [][]float64) [][]float64 {
	p := len(a)
	q := len(a[0])
	r := len(b[0])
	out := make([][]float64, p)
	for i := 0; i < p; i++ {
		out[i] = make([]float64, r)
		for j := 0; j < r; j++ {
			var sum float64
			for k := 0; k < q; k++ {
				sum += a[i][k] * b[k][j]
			}
			out[i][j] = sum
		}
	}
	return out
}

// transpose devuelve la transpuesta de m.
func transpose(m [][]float64) [][]float64 {
	rows := len(m)
	cols := len(m[0])
	out := make([][]float64, cols)
	for j := 0; j < cols; j++ {
		out[j] = make([]float64, rows)
		for i := 0; i < rows; i++ {
			out[j][i] = m[i][j]
		}
	}
	return out
}

// assertClose falla si algún elemento correspondiente de got y want difiere en
// más de Epsilon.
func assertClose(t *testing.T, name string, got, want [][]float64) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%s: row count mismatch: got %d want %d", name, len(got), len(want))
	}
	for i := range got {
		if len(got[i]) != len(want[i]) {
			t.Fatalf("%s: col count mismatch at row %d", name, i)
		}
		for j := range got[i] {
			if math.Abs(got[i][j]-want[i][j]) >= Epsilon {
				t.Fatalf("%s: element [%d][%d] = %v, want %v", name, i, j, got[i][j], want[i][j])
			}
		}
	}
}

// identity devuelve la matriz identidad n×n.
func identity(n int) [][]float64 {
	out := make([][]float64, n)
	for i := 0; i < n; i++ {
		out[i] = make([]float64, n)
		out[i][i] = 1
	}
	return out
}

func TestFactorizeProperties(t *testing.T) {
	cases := []struct {
		name   string
		matrix [][]float64
	}{
		{"square", [][]float64{{1, 2}, {3, 4}}},
		{"tall (m>n)", [][]float64{{1, 2}, {3, 4}, {5, 6}}},
		{"1x1", [][]float64{{7}}},
		{"3x3", [][]float64{{12, -51, 4}, {6, 167, -68}, {-4, 24, -41}}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			q, r, err := Factorize(tc.matrix)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			m := len(tc.matrix)

			// Q debe ser m×m.
			if len(q) != m || len(q[0]) != m {
				t.Fatalf("Q has wrong shape: got %dx%d, want %dx%d", len(q), len(q[0]), m, m)
			}

			// Ortogonalidad: Q^T · Q ≈ I.
			assertClose(t, "Q^T·Q", matMul(transpose(q), q), identity(m))

			// Reconstrucción: Q · R ≈ A.
			assertClose(t, "Q·R", matMul(q, r), tc.matrix)

			// R debe ser triangular superior: las entradas bajo la diagonal son cero.
			for i := range r {
				for j := 0; j < i && j < len(r[i]); j++ {
					if math.Abs(r[i][j]) >= Epsilon {
						t.Fatalf("R not upper triangular: R[%d][%d] = %v", i, j, r[i][j])
					}
				}
			}
		})
	}
}

func TestFactorizeRejectsInvalid(t *testing.T) {
	cases := []struct {
		name    string
		matrix  [][]float64
		wantErr error
	}{
		{"empty", [][]float64{}, ErrInvalidMatrix},
		{"empty row", [][]float64{{}}, ErrInvalidMatrix},
		{"jagged", [][]float64{{1, 2}, {3}}, ErrInvalidMatrix},
		{"rows < cols", [][]float64{{1, 2, 3}}, ErrRowsLessThanCols},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := Factorize(tc.matrix)
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("got error %v, want %v", err, tc.wantErr)
			}
		})
	}
}
