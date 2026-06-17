# frontend

Aplicación de página única (React + TypeScript + Vite + Tailwind CSS v4) que consume
el servicio `qr-api`: inicia sesión para obtener un JWT, envía una matriz y renderiza la
factorización QR (`Q`, `R`) y las estadísticas que devuelve el backend.

El JWT se mantiene solo en memoria (estado de React) — nunca se escribe en
`localStorage`/`sessionStorage`.

## Scripts

```bash
npm install      # instala las dependencias
npm run dev      # arranca el servidor de desarrollo (http://localhost:5173)
npm run build    # type-check (tsc -b) y build a dist/
npm run preview  # sirve el build de producción localmente
npm run lint     # ejecuta ESLint
```

## Uso

1. Configura la **API base URL** (por defecto apunta al `qr-api` desplegado; usa
   `http://localhost:8080` para un backend local).
2. **Inicia sesión** con las credenciales de la API (defaults de desarrollo: `admin` / `admin`) para obtener un token.
3. Pega una matriz como JSON (p. ej. `[[1,2],[3,4],[5,6]]`) y pulsa **Compute QR**.
4. Lee las dimensiones de entrada, las matrices `Q` y `R`, y las tablas de estadísticas.

## Notas del stack

- **Tailwind CSS v4** a través del plugin `@tailwindcss/vite` (sin `tailwind.config.js`,
  sin PostCSS). Las utilidades se importan en `src/index.css` con `@import "tailwindcss"`.
- **tailwind-animations** aporta las utilidades de entrada/`fade-in` usadas para
  transiciones sutiles de la UI.
- La salida del build es `dist/` (assets estáticos); el proyecto se hospeda en Render como
  sitio estático (ver el `render.yaml` a nivel de repositorio).
