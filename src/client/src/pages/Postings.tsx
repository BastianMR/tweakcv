import { useState } from 'react'
import {
  useCreatePosting,
  useDeletePosting,
  usePostings,
  useUpdatePosting,
} from '../api/postings'
import type { PostingRow } from '../api/postings'

const btn = 'border rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-50'

/** editor de parsed_json (FR-014): corrección manual del parseo IA */
function ParsedEditor({ posting }: { posting: PostingRow }) {
  const update = useUpdatePosting()
  const [text, setText] = useState(() => JSON.stringify(posting.parsed ?? {}, null, 2))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function save() {
    try {
      const parsed = JSON.parse(text)
      update.mutate(
        { id: posting.id, ...parsed },
        { onSuccess: () => setSaved(true), onError: (e) => setError(String(e)) },
      )
    } catch {
      setError('JSON inválido')
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        className="border rounded px-2 py-1 font-mono text-xs"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}
      <button className={btn} onClick={save} data-testid={`save-posting-${posting.id}`}>
        Guardar corrección
      </button>
      {saved && !error && <p className="text-green-700 text-xs">Guardado ✓</p>}
    </div>
  )
}

export function PostingsPage() {
  const postings = usePostings()
  const create = useCreatePosting()
  const remove = useDeletePosting()
  const [rawText, setRawText] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4" data-testid="postings-page">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!rawText.trim()) return
          void create.mutateAsync(rawText).then(() => setRawText(''))
        }}
      >
        <textarea
          placeholder="Pegá acá el texto de la postulación…"
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          data-testid="posting-text"
        />
        {create.error && (
          <p role="alert" className="text-red-600 text-sm">
            {String(create.error)}
          </p>
        )}
        <button disabled={create.isPending || !rawText.trim()} data-testid="parse-posting-btn">
          {create.isPending ? 'Parseando…' : 'Parsear con IA'}
        </button>
      </form>

      {postings.data?.map((p) => (
        <article key={p.id} className="border rounded p-3" data-testid={`posting-${p.id}`}>
          <header className="flex items-center justify-between gap-2">
            <div>
              <strong>{p.parsed?.title ?? '(sin parsear)'}</strong>
              {p.parsed?.company && <span> · {p.parsed.company}</span>}
            </div>
            <div className="flex gap-2">
              <button
                className={btn}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                aria-expanded={expanded === p.id}
              >
                Editar
              </button>
              <button className={`${btn} text-red-600`} onClick={() => remove.mutate(p.id)}>
                ×
              </button>
            </div>
          </header>
          {p.parsed && (
            <ul className="text-sm mt-1 flex flex-wrap gap-x-4 opacity-70">
              <li>{p.parsed.hardRequirements.length} requisitos</li>
              <li>{p.parsed.niceToHave.length} deseables</li>
              <li>{p.parsed.keywords.length} keywords</li>
              <li>{p.parsed.language}</li>
            </ul>
          )}
          {expanded === p.id && <ParsedEditor posting={p} />}
        </article>
      ))}
    </div>
  )
}
