import { formatNumber } from '../lib/matrix'

interface MatrixTableProps {
  matrix: number[][]
}

// MatrixTable renderiza un array 2D de números como una tabla HTML compacta y monoespaciada.
export function MatrixTable({ matrix }: MatrixTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse font-mono text-sm">
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) => (
                <td
                  key={j}
                  className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums dark:border-zinc-700"
                >
                  {formatNumber(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
