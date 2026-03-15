import { ConsultaStatus, Speaker } from '../types'

interface Props {
  status: ConsultaStatus
  duration: number
  currentSpeaker: Speaker
  isSupported: boolean
  error: string | null
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onToggleSpeaker: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingControls({
  status, duration, currentSpeaker, isSupported,
  error, onStart, onPause, onResume, onStop, onToggleSpeaker,
}: Props) {
  if (!isSupported) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-4 text-center text-sm text-amber-800">
        Transcrição de voz não suportada. Use <strong>Chrome ou Edge</strong>.
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center gap-3">
      {/* Recording indicator */}
      {status === 'recording' && (
        <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium min-w-[6rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          {formatDuration(duration)}
        </span>
      )}
      {status === 'paused' && (
        <span className="flex items-center gap-1.5 text-sm text-stone-500 min-w-[6rem]">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          {formatDuration(duration)}
        </span>
      )}
      {(status === 'idle' || status === 'ended') && (
        <span className="min-w-[6rem]" />
      )}

      {/* Main action buttons */}
      <div className="flex items-center gap-2">
        {status === 'idle' || status === 'ended' ? (
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {status === 'ended' ? 'Nova Consulta' : 'Iniciar Consulta'}
          </button>
        ) : null}

        {status === 'recording' && (
          <>
            <button
              onClick={onPause}
              className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
            >
              Pausar
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Encerrar
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={onResume}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Encerrar
            </button>
          </>
        )}
      </div>

      {/* Speaker toggle — visible during active recording or paused */}
      {(status === 'recording' || status === 'paused') && (
        <button
          onClick={onToggleSpeaker}
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            currentSpeaker === 'doctor'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {currentSpeaker === 'doctor' ? 'Médico' : 'Paciente'}
        </button>
      )}

      {/* Error toast */}
      {error && (
        <p className="ml-auto text-xs text-red-600 max-w-xs text-right">{error}</p>
      )}
    </div>
  )
}
