import type { QRResponse } from '../api/types'
import { formatNumber } from '../lib/matrix'
import { MatrixTable } from './MatrixTable'

interface ResultsProps {
  data: QRResponse
}

const cell = 'px-3 py-2 text-right tabular-nums'
const headCell = 'px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400'

// Results renderiza la respuesta QR completa: dimensiones de entrada, las matrices
// Q y R, y el bloque de estadísticas (por matriz, agregado, anyDiagonal).
export function Results({ data }: ResultsProps) {
  const { input, q, r, statistics } = data
  const perMatrixNames = Object.keys(statistics.perMatrix)

  return (
    <section className="animate-fade-in-up rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-xl">Resultados</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Entrada: <strong className="text-zinc-700 dark:text-zinc-200">{input.rows}</strong> filas
        &times; <strong className="text-zinc-700 dark:text-zinc-200">{input.cols}</strong> columnas
      </p>

      <div className="mt-4 flex flex-wrap gap-8">
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Q ({q.length}&times;{q[0]?.length ?? 0})
          </h3>
          <MatrixTable matrix={q} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            R ({r.length}&times;{r[0]?.length ?? 0})
          </h3>
          <MatrixTable matrix={r} />
        </div>
      </div>

      <h3 className="mt-6 mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Estadísticas
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-md border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                Matriz
              </th>
              <th className={headCell}>Máx</th>
              <th className={headCell}>Mín</th>
              <th className={headCell}>Promedio</th>
              <th className={headCell}>Suma</th>
              <th className={headCell}>Diagonal</th>
            </tr>
          </thead>
          <tbody>
            {perMatrixNames.map((name) => {
              const m = statistics.perMatrix[name]
              return (
                <tr key={name} className="border-b border-zinc-100 dark:border-zinc-700/50">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className={cell}>{formatNumber(m.max)}</td>
                  <td className={cell}>{formatNumber(m.min)}</td>
                  <td className={cell}>{formatNumber(m.average)}</td>
                  <td className={cell}>{formatNumber(m.sum)}</td>
                  <td className={cell}>{m.isDiagonal ? 'sí' : 'no'}</td>
                </tr>
              )
            })}
            <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
              <td className="px-3 py-2">Agregado</td>
              <td className={cell}>{formatNumber(statistics.aggregate.max)}</td>
              <td className={cell}>{formatNumber(statistics.aggregate.min)}</td>
              <td className={cell}>{formatNumber(statistics.aggregate.average)}</td>
              <td className={cell}>{formatNumber(statistics.aggregate.sum)}</td>
              <td className={cell}>&mdash;</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Alguna matriz diagonal:{' '}
        <strong className="text-zinc-700 dark:text-zinc-200">
          {statistics.anyDiagonal ? 'sí' : 'no'}
        </strong>
      </p>
    </section>
  )
}
