'use client'

import clsx from 'clsx'
import { calcularPontos } from '@/types'
import type { Palpite, Resultado } from '@/types'
import { getFaseLabel } from '@/lib/excel-parser'
import { TeamWithFlag } from '@/lib/countryFlags'
import { ScoreBadge } from './ScoreBadge'

interface MatchCardProps {
  palpite: Palpite
  resultado?: Resultado
  showPoints?: boolean
  compact?: boolean
}

export function MatchCard({ palpite, resultado, showPoints = true, compact = false }: MatchCardProps) {
  const pontos = resultado ? calcularPontos(palpite, resultado) : null
  const temPenalti = resultado?.penalti_a !== null && resultado?.penalti_a !== undefined

  return (
    <div className={clsx(
      'group relative bg-stone-900 border border-stone-800 rounded-xl overflow-hidden transition-all duration-200',
      'hover:border-stone-700 hover:bg-stone-850',
      compact ? 'p-3' : 'p-4',
      pontos === 10 && 'border-amber-500/30 bg-amber-950/20',
      pontos !== null && pontos >= 5 && pontos < 10 && 'border-emerald-500/20',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-0.5 rounded">
            #{palpite.jogo_numero}
          </span>
          <span className="text-xs text-stone-500">{getFaseLabel(palpite.fase)}</span>
          {palpite.grupo && (
            <span className="text-xs text-stone-600">Grupo {palpite.grupo}</span>
          )}
        </div>
        {showPoints && <ScoreBadge pontos={pontos} size="sm" />}
      </div>

      {/* Palpite Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right">
          <p className="font-bold text-white text-sm leading-tight"><TeamWithFlag name={palpite.pais_a} /></p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-lg font-mono font-black text-lg',
            pontos === 10 ? 'bg-amber-400/20 text-amber-300' : 'bg-stone-800 text-white'
          )}>
            {palpite.gol_a}
          </span>
          <span className="text-stone-600 font-bold text-xs">×</span>
          <span className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-lg font-mono font-black text-lg',
            pontos === 10 ? 'bg-amber-400/20 text-amber-300' : 'bg-stone-800 text-white'
          )}>
            {palpite.gol_b}
          </span>
        </div>

        <div className="flex-1 text-left">
          <p className="font-bold text-white text-sm leading-tight"><TeamWithFlag name={palpite.pais_b} /></p>
        </div>
      </div>

      {/* Penalties */}
      {(palpite.penalti_a !== null || palpite.penalti_b !== null) && (
        <div className="mt-1 text-center text-xs text-stone-500">
          Pênaltis: {palpite.penalti_a} × {palpite.penalti_b}
        </div>
      )}

      {/* Official result */}
      {resultado && (
        <div className="mt-3 pt-3 border-t border-stone-800">
          <p className="text-xs text-stone-500 mb-1.5 text-center">Resultado oficial</p>
          <div className="flex items-center justify-center gap-1">
            <span className="w-7 h-7 flex items-center justify-center rounded font-mono font-black text-base bg-emerald-900/30 text-emerald-300">
              {resultado.gol_a}
            </span>
            <span className="text-stone-600 text-xs">×</span>
            <span className="w-7 h-7 flex items-center justify-center rounded font-mono font-black text-base bg-emerald-900/30 text-emerald-300">
              {resultado.gol_b}
            </span>
          </div>
          {temPenalti && (
            <div className="text-center text-xs text-stone-500 mt-0.5">
              Pên: {resultado.penalti_a} × {resultado.penalti_b}
            </div>
          )}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-stone-800">
        <p className="text-xs text-stone-500 mb-1.5 text-center">{palpite.nome_participante}</p>
      </div>
    </div>
  )
}
