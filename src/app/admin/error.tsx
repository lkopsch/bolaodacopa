'use client'

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center p-4">
      <div className="bg-red-950/50 border border-red-800 rounded-2xl p-8 max-w-lg w-full text-center">
        <p className="text-3xl mb-4">⚠️</p>
        <h2 className="text-lg font-bold text-red-400 mb-2">Erro na página Admin</h2>
        <p className="text-sm text-red-300/80 mb-6 font-mono bg-black/30 rounded-lg p-3 text-left overflow-auto">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm transition-all"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
