# QR Stats Challenge

Dos microservicios que, a partir de una matriz rectangular, calculan su factorización QR
y devuelven estadísticas sobre las matrices resultantes. El punto de entrada (`qr-api`, en
Go) valida la matriz y calcula `Q` y `R`; el cálculo estadístico se delega a un segundo
servicio (`stats-api`, en Node) que recibe esas matrices y responde con máximo, mínimo,
promedio, suma y si alguna es diagonal. Sobre ambas APIs hay un frontend que permite probar
todo el flujo desde el navegador.

## Qué hace

El flujo típico tiene dos pasos: primero se obtiene un token y luego se llama al endpoint de
factorización con ese token.

```bash
# 1) Obtener un token (credenciales por defecto en local: admin / admin).
curl -s -X POST http://localhost:8080/api/v1/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}'
# -> { "token": "<JWT>", "expiresIn": 3600 }

# 2) Factorizar una matriz, enviando el token como Bearer.
curl -s -X POST http://localhost:8080/api/v1/qr \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <JWT>" \
  -d '{"matrix":[[1,2],[3,4],[5,6]]}'
```

La respuesta incluye las dimensiones de entrada, las dos matrices y el bloque de
estadísticas que `qr-api` obtuvo de `stats-api` y reenvía sin modificar:

```jsonc
{
  "input": { "rows": 3, "cols": 2 },
  "q": [[ /* ... */ ]],        // m×m, ortonormal
  "r": [[ /* ... */ ]],        // m×n, triangular superior
  "statistics": {
    "perMatrix": {
      "Q": { "max": 0, "min": 0, "average": 0, "sum": 0, "isDiagonal": false },
      "R": { "max": 0, "min": 0, "average": 0, "sum": 0, "isDiagonal": false }
    },
    "aggregate": { "max": 0, "min": 0, "average": 0, "sum": 0 },
    "anyDiagonal": false
  }
}
```

El frontend (`frontend/`) hace exactamente esto desde el navegador: pide el token con las
credenciales, envía la matriz como JSON y muestra `Q`, `R` y las estadísticas en tablas.

## Arquitectura

```
cliente ──POST /api/v1/qr──▶ qr-api (Go)
                               │  calcula Q, R
                               │
                               └──POST /api/v1/statistics──▶ stats-api (Node)
                                                               │ max/min/avg/sum
                                                               │ isDiagonal
                               ◀── estadísticas ──────────────┘
cliente ◀── { q, r, statistics } ── qr-api
```

Los dos servicios son stateless y se comunican por HTTP/JSON de forma síncrona. Toda la
configuración entra por variables de entorno, de modo que la misma imagen sirve para
desarrollo, Docker o Render sin recompilar.

### qr-api (Go + Fiber)

El servicio está organizado por paquetes, cada uno con una responsabilidad acotada y sin
dependencias circulares entre ellos:

- `config` lee la configuración del entorno y aplica defaults razonables. Normaliza
  `STATS_API_URL` anteponiendo `http://` cuando llega sin esquema, un caso que se da cuando
  Render inyecta un `host:port` pelado.
- `server` cablea la aplicación Fiber: registra el middleware (recover, logger, CORS antes
  de las rutas para responder los preflight) y monta los endpoints, dejando `/health` y
  `/api/v1/token` abiertos y `/api/v1/qr` tras la verificación del JWT.
- `handler` contiene los handlers HTTP. Traduce el cuerpo de la petición, llama a la lógica
  de factorización, decide los códigos de error y delega las estadísticas. Depende del
  cliente de estadísticas a través de una interfaz, no de un tipo concreto, lo que permite
  inyectar un stub en los tests.
- `client` es el cliente HTTP hacia `stats-api`. Acota cada llamada con un timeout de 5
  segundos y añade la cabecera interna de autenticación; cualquier fallo, timeout o estado
  no-2xx se propaga como error para que el handler responda 502.
- `qr` calcula la factorización. La parte numérica se delega en gonum; el paquete se encarga
  de validar la entrada y de convertir entre matrices `[][]float64` y el `mat.Dense` de
  gonum.
- `auth` emite y valida los JWT HS256, fijando el algoritmo a HMAC al parsear para descartar
  ataques de tipo `alg: none` y de confusión de clave.
- `model` define los DTO de petición y respuesta. El bloque de estadísticas viaja como
  `json.RawMessage`, así que `qr-api` lo reenvía verbatim sin necesidad de conocer su
  esquema.

### stats-api (Node + Express)

La estructura separa el armado de la app del arranque y aísla la lógica pura:

- `app.js` construye la aplicación Express con `createApp()` pero sin escuchar en ningún
  puerto, de modo que los tests la instancian directamente con supertest.
- `index.js` toma esa app y la pone a escuchar; también gestiona el apagado ordenado.
- `routes/` define los endpoints (`/health` y `/api/v1/statistics`).
- `middleware/internalKey.js` rechaza con 401 cualquier petición a estadísticas que no
  presente la clave interna correcta.
- `stats.js` reúne las funciones de cálculo, escritas sin nada de HTTP (validación de la
  entrada, estadísticas por matriz, agregado y chequeo de diagonal) para poder probarlas de
  forma aislada.

### frontend (React + Vite + Tailwind)

SPA en React con TypeScript, empaquetada con Vite y estilada con Tailwind CSS v4. Llama a
`qr-api` con `fetch`: obtiene el token en el login y lo usa como Bearer en la factorización.
El JWT se mantiene solo en memoria (estado de React), nunca en `localStorage` ni
`sessionStorage`. La factorización y las estadísticas las hace el backend; el frontend solo
presenta el resultado.

## Puesta en marcha local

### Con Docker

```bash
docker compose up --build
```

`qr-api` queda expuesto en `http://localhost:8080`. `stats-api` es interno: lo consume
`qr-api` por la red del compose y no se publica al host.

### Sin Docker

```bash
# Terminal 1 — stats-api
cd node-stats-api && npm install && npm start

# Terminal 2 — qr-api
cd go-qr-api && go mod tidy   # solo en el primer checkout, para generar go.sum
STATS_API_URL=http://localhost:3000 go run ./cmd/server
```

El `go mod tidy` solo hace falta la primera vez, para resolver dependencias y escribir
`go.sum`. Con Docker no es necesario: el build de la imagen lo resuelve.

### Frontend

```bash
cd frontend
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
```

La URL base de la API viene precargada en la interfaz y es editable, así que se puede
apuntar a `http://localhost:8080` para usar el backend local. Para que el navegador pueda
llamar a ese `qr-api` local hace falta CORS habilitado, que ya viene puesto en
`docker-compose.yml` y por defecto (`*`) en el binario.

## Variables de entorno

| Variable           | Servicio | Default                      | Descripción                                                                 |
| ------------------ | -------- | ---------------------------- | --------------------------------------------------------------------------- |
| `PORT`             | ambos    | `8080` / `3000`              | Puerto HTTP del servicio.                                                   |
| `STATS_API_URL`    | qr-api   | `http://localhost:3000`      | URL base del servicio de estadísticas.                                      |
| `JWT_SECRET`       | qr-api   | `dev-secret-change-me`       | Secreto HMAC para firmar y validar los JWT.                                 |
| `AUTH_USERNAME`    | qr-api   | `admin`                      | Usuario aceptado por `POST /api/v1/token`.                                  |
| `AUTH_PASSWORD`    | qr-api   | `admin`                      | Contraseña aceptada por `POST /api/v1/token`.                               |
| `INTERNAL_API_KEY` | ambos    | `dev-internal-key-change-me` | Secreto compartido qr-api → stats-api (header `X-Internal-Key`). Debe coincidir en ambos. |
| `CORS_ORIGIN`      | qr-api   | `*`                          | Origen(es) permitido(s) por CORS para el frontend en el navegador.         |

Los valores por defecto son solo para desarrollo. En producción se sobrescriben; en Render
se generan o se setean según `render.yaml`.

## Contratos de la API

### `POST /api/v1/qr` — qr-api

Recibe `{ "matrix": [[...], ...] }` y devuelve `{ input, q, r, statistics }` (ver el ejemplo
de la sección anterior). Requiere un Bearer válido.

| Código | Cuándo                                                            |
| ------ | ---------------------------------------------------------------- |
| `200`  | Factorización correcta.                                          |
| `400`  | Matriz vacía, con filas de distinta longitud o con valores no numéricos. |
| `422`  | `rows < cols`: gonum requiere al menos tantas filas como columnas, y la validación es previa para evitar su panic. |
| `502`  | `stats-api` no responde, falla o supera el timeout de 5 segundos. |

Se devuelve la QR completa: `Q` es `m×m` y `R` es `m×n` triangular superior. La subdiagonal
de `R` se fuerza a cero exacto para una salida limpia, ya que gonum puede dejar ruido
numérico por debajo de la diagonal.

### `POST /api/v1/statistics` — stats-api (interno)

Recibe `{ "matrices": [ { "name": "Q", "data": [[...]] }, { "name": "R", "data": [[...]] } ] }`
y devuelve `perMatrix`, `aggregate` y `anyDiagonal`. Una matriz se considera diagonal cuando
todo elemento fuera de la diagonal (`i != j`) cumple `|x| < 1e-9`, lo que funciona también
para matrices rectangulares. Responde 400 ante entradas mal formadas y 401 sin la clave
interna.

### `GET /health` — ambos

```json
{ "status": "ok", "service": "qr-api" }
```

## Autenticación

La seguridad tiene dos capas independientes. Hacia fuera, los clientes se autentican con un
JWT HS256: obtienen el token en `POST /api/v1/token` con usuario y contraseña, y lo envían
como `Authorization: Bearer <token>` en `POST /api/v1/qr`. El token vive una hora
(`expiresIn: 3600`) y lleva el usuario en el claim `sub`. `/health` y `/api/v1/token` quedan
abiertos.

Hacia dentro, la comunicación entre servicios usa un secreto compartido: `qr-api` añade la
cabecera `X-Internal-Key` en su llamada a `stats-api`, y este rechaza con 401 cualquier
petición a `/api/v1/statistics` que no la traiga correcta. El cliente externo nunca ve esta
cabecera; la gestiona `qr-api` de forma transparente.

## Tests, CI y despliegue

Los tests se corren con el `Makefile` de la raíz:

```bash
make test        # Go + Node
make test-go
make test-node
```

El frontend se valida con su propio build (`cd frontend && npm run build`), que incluye el
type-check con `tsc`.

El workflow de GitHub Actions (`.github/workflows/ci.yml`) corre en cada push y pull request
a `main`, con tres jobs en paralelo: `go vet` + `go test` en `go-qr-api`, `npm ci` + `npm test`
en `node-stats-api`, y `npm ci` + `npm run build` en `frontend`.

