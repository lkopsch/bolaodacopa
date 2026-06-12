'use client'

import clsx from 'clsx'

interface ScoreBadgeProps {
  pontos: number | null
  size?: 'sm' | 'md'
}

export function ScoreBadge({ pontos, size = 'md' }: ScoreBadgeProps) {
  if (pontos === null) {
    return (
      <span className={clsx(
        'inline-flex items-center rounded font-mono font-bold text-stone-400',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}>
        —
      </span>
    )
  }

  return (
    <span className={clsx(
      'inline-flex items-center rounded font-mono font-bold',
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
      pontos === 10 && 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40',
      pontos >= 5 && pontos < 10 && 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40',
      pontos === 1 && 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-400/30',
      pontos === 0 && 'bg-stone-800 text-stone-500 ring-1 ring-stone-700',
    )}>
      {pontos === 10 && '⚽ '}
      {pontos >= 5 && pontos < 10 && '✓ '}
      {pontos === 1 && '❶ '}
      {pontos}pts
    </span>
  )
}
