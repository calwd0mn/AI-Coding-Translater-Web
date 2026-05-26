import { formatDuration } from '../lib/pipeline-utils'
import type { PipelineState } from '../types/pipeline'

interface OutputPanelProps {
  state: PipelineState
  onDownloadSpeech: () => void
}

export function OutputPanel({ state, onDownloadSpeech }: OutputPanelProps) {
  return (
    <section className="output-panel">
      <div>
        <h2>合成音频</h2>
        <p>
          {state.timings
            ? `总耗时 ${formatDuration(state.timings.totalMs)}`
            : '完成后可试听和下载'}
        </p>
      </div>
      <audio controls src={state.audioUrl || undefined} />
      <button
        disabled={!state.audioUrl}
        type="button"
        onClick={onDownloadSpeech}
      >
        下载 MP3
      </button>
    </section>
  )
}
