import type { CvScore, AtsCheck } from '../api/cvs'

const STATUS_COLOR: Record<AtsCheck['status'], string> = {
  pass: 'text-green-700',
  partial: 'text-amber-600',
  fail: 'text-red-600',
  na: 'opacity-50',
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? 'bg-green-500/15 text-green-700' : value >= 50 ? 'bg-amber-500/15 text-amber-700' : 'bg-red-500/15 text-red-700'
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${color}`}>
      <div className="text-2xl font-bold" data-testid={`score-${label}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  )
}

/** T047: total + breakdown + tabla de requisitos con evidencia y sugerencias */
export function ScoreReport({ score }: { score: CvScore }) {
  return (
    <section className="border rounded p-3 flex flex-col gap-3" data-testid="score-report">
      <div className="grid grid-cols-3 gap-2">
        <ScoreBadge label="total" value={score.total} />
        <ScoreBadge label="mecanica" value={score.mechanical.score} />
        <ScoreBadge label="semantica" value={score.semantic.score} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1">Checks mecánicos</h4>
        <ul className="text-sm flex flex-col gap-0.5">
          {score.mechanical.checks.map((c) => (
            <li key={c.id}>
              <span className={STATUS_COLOR[c.status]}>
                {c.status === 'pass' ? '✓' : c.status === 'partial' ? '~' : c.status === 'na' ? '·' : '✗'}
              </span>{' '}
              {c.label}
              {c.detail && <span className="opacity-60"> — {c.detail}</span>}
              {c.evidence && c.evidence.length > 0 && (
                <ul className="ml-5 text-xs opacity-70">
                  {c.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-1">Rúbrica semántica</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-60">
              <th>Criterio</th>
              <th>Score</th>
              <th>Evidencia</th>
            </tr>
          </thead>
          <tbody>
            {score.semantic.rubric.map((r) => (
              <tr key={r.criterion} className="border-t">
                <td className="py-1 pr-2">{r.criterion}</td>
                <td className="pr-2">{r.score}/10</td>
                <td className="opacity-80">{r.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(score.topSuggestions?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Sugerencias accionables</h4>
          <ol className="list-decimal ml-5 text-sm flex flex-col gap-0.5" data-testid="top-suggestions">
            {score.topSuggestions!.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
