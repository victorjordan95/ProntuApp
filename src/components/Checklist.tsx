import { ChecklistItem } from '../types'

interface Props {
  items: ChecklistItem[]
  onToggle: (id: string) => void
}

export function Checklist({ items, onToggle }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-stone-400 text-sm text-center mt-6">
        Nenhum item inferido ainda.
        <br />
        <span className="text-xs">Os itens aparecem conforme a consulta avança.</span>
      </p>
    )
  }

  const pending   = items.filter(i => !i.done)
  const completed = items.filter(i =>  i.done)

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Pendentes
          </p>
          <ul className="space-y-2">
            {pending.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={item.done}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor={item.id} className="text-sm text-stone-800 cursor-pointer">
                  {item.text}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Concluídos
          </p>
          <ul className="space-y-2">
            {completed.map(item => (
              <li key={item.id} className="flex items-center gap-2 opacity-60">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={item.done}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor={item.id} className="text-sm text-stone-500 line-through cursor-pointer">
                  {item.text}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
