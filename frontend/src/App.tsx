import { useState } from 'react'
import { ApiError, ResponseFormatError, computeQR, requestToken } from './api/client'
import type { QRResponse } from './api/types'
import { Results } from './components/Results'
import { parseMatrix } from './lib/matrix'


const DEFAULT_API_BASE = 'https://qr-api-qzrt.onrender.com'
const DEFAULT_MATRIX = '[[1, 2], [3, 4], [5, 6]]'

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
const cardClass =
  'rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800'

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  )
}

// describeError convierte cualquier valor lanzado en un mensaje mapeando 
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401:
        return 'No autorizado (401). Obtén un token nuevo desde Acceso e inténtalo de nuevo.'
      case 400:
        return `Petición incorrecta (400): ${err.message}`
      case 422:
        return `Error de validación (422): ${err.message}`
      case 502:
        return `Servicio de estadísticas no disponible (502): ${err.message}`
      default:
        return `La petición falló (${err.status}): ${err.message}`
    }
  }
  if (err instanceof ResponseFormatError) {
    return err.message
  }
  if (err instanceof Error) {
    return `Error de red: ${err.message}. Revisa la URL base de la API y el CORS.`
  }
  return 'Error desconocido.'
}

function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [matrixText, setMatrixText] = useState(DEFAULT_MATRIX)

  const [authStatus, setAuthStatus] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  const [result, setResult] = useState<QRResponse | null>(null)
  const [computeError, setComputeError] = useState<string | null>(null)
  const [computeLoading, setComputeLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthStatus(null)
    try {
      const res = await requestToken(apiBase, username, password)
      setToken(res.token)
      setAuthStatus(`Token obtenido (expira en ${res.expiresIn}s).`)
    } catch (err) {
      setToken(null)
      setAuthError(describeError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleCompute(e: React.FormEvent) {
    e.preventDefault()
    setComputeError(null)
    setResult(null)

    if (!token) {
      setComputeError('Aún no hay token. Usa Acceso para obtener uno primero.')
      return
    }

    let matrix: number[][]
    try {
      matrix = parseMatrix(matrixText)
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : 'Matriz inválida.')
      return
    }

    setComputeLoading(true)
    try {
      const res = await computeQR(apiBase, token, matrix)
      setResult(res)
    } catch (err) {
      setComputeError(describeError(err))
    } finally {
      setComputeLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="animate-fade-in-down">
        <h1 className="text-3xl font-bold tracking-tight">QR Stats</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Factorización QR y estadísticas de matrices sobre el servicio qr-api.
        </p>
      </header>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">URL base de la API</h2>
        <input
          type="text"
          className={`mt-3 ${inputClass}`}
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          placeholder="https://qr-api-qzrt.onrender.com"
          aria-label="URL base de la API"
        />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Apúntala a tu qr-api desplegado o a http://localhost:8080.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Acceso</h2>
        <form onSubmit={handleLogin} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            aria-label="Usuario"
            autoComplete="username"
          />
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin"
            aria-label="Contraseña"
            autoComplete="current-password"
          />
          <button type="submit" className={`shrink-0 ${buttonClass}`} disabled={authLoading}>
            {authLoading && <Spinner />}
            {authLoading ? 'Solicitando...' : 'Obtener token'}
          </button>
        </form>
        {authStatus && (
          <p className="animate-fade-in mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
            {authStatus}
          </p>
        )}
        {authError && (
          <p className="animate-fade-in mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {authError}
          </p>
        )}
        {!authStatus && !authError && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            El token se mantiene solo en memoria (no se almacena).
          </p>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Matriz</h2>
        <form onSubmit={handleCompute} className="mt-3 flex flex-col gap-3">
          <textarea
            className={`${inputClass} font-mono`}
            value={matrixText}
            onChange={(e) => setMatrixText(e.target.value)}
            rows={5}
            spellCheck={false}
            aria-label="Matriz JSON"
          />
          <button
            type="submit"
            className={`self-start ${buttonClass}`}
            disabled={computeLoading}
          >
            {computeLoading && <Spinner />}
            {computeLoading ? 'Calculando...' : 'Calcular QR'}
          </button>
        </form>
        {computeError && (
          <p className="animate-fade-in mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {computeError}
          </p>
        )}
      </section>

      {result && <Results data={result} />}
    </main>
  )
}

export default App
