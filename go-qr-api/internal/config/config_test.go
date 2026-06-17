package config

import "testing"

// Verifica la normalización de STATS_API_URL: las URLs con
// esquema se respetan, las que llegan sin esquema reciben "http://", y el valor vacío cae al default.
func TestLoadStatsAPIURL(t *testing.T) {
	cases := []struct {
		name string
		set  bool
		env  string
		want string
	}{
		{
			name: "con esquema https se respeta",
			set:  true,
			env:  "https://api.example.com",
			want: "https://api.example.com",
		},
		{
			name: "con esquema http se respeta",
			set:  true,
			env:  "http://stats:3000",
			want: "http://stats:3000",
		},
		{
			name: "sin esquema antepone http",
			set:  true,
			env:  "stats-api:3000",
			want: "http://stats-api:3000",
		},
		{
			name: "vacio usa el default",
			set:  true,
			env:  "",
			want: "http://localhost:3000",
		},
		{
			name: "no seteado usa el default",
			set:  false,
			want: "http://localhost:3000",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.set {
				t.Setenv("STATS_API_URL", tc.env)
			}

			got := Load().StatsAPIURL
			if got != tc.want {
				t.Errorf("StatsAPIURL = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestLoadCORSOrigin verifica que CORS_ORIGIN cae al wildcard "*" cuando no se
// setea (o se setea vacío) y que respeta un valor explícito en caso contrario.
func TestLoadCORSOrigin(t *testing.T) {
	cases := []struct {
		name string
		set  bool
		env  string
		want string
	}{
		{
			name: "no seteado usa el wildcard",
			set:  false,
			want: "*",
		},
		{
			name: "vacio usa el wildcard",
			set:  true,
			env:  "",
			want: "*",
		},
		{
			name: "valor explicito se respeta",
			set:  true,
			env:  "https://qr-frontend.onrender.com",
			want: "https://qr-frontend.onrender.com",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.set {
				t.Setenv("CORS_ORIGIN", tc.env)
			}

			got := Load().CORSOrigin
			if got != tc.want {
				t.Errorf("CORSOrigin = %q, want %q", got, tc.want)
			}
		})
	}
}
