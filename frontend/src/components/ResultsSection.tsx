import type { PipelineState } from '../types/pipeline'

interface ResultsSectionProps {
  state: PipelineState
  onDownloadTranscript: () => void
  onDownloadTranslation: () => void
}

export function ResultsSection({
  state,
  onDownloadTranscript,
  onDownloadTranslation,
}: ResultsSectionProps) {
  const transcriptEmpty = !state.transcript
  const translationEmpty = !state.translation

  return (
    <section className="results-grid">
      <article className="result-panel">
        <div className="panel-heading">
          <h2>识别文本</h2>
          <button
            disabled={!state.transcript}
            type="button"
            onClick={onDownloadTranscript}
          >
            下载 TXT
          </button>
        </div>
        <p className={transcriptEmpty ? 'result-placeholder' : undefined}>
          {state.transcript || '等待音频识别结果'}
        </p>
      </article>

      <article className="result-panel">
        <div className="panel-heading">
          <h2>翻译文本</h2>
          <button
            disabled={!state.translation}
            type="button"
            onClick={onDownloadTranslation}
          >
            下载 TXT
          </button>
        </div>
        <p className={translationEmpty ? 'result-placeholder' : undefined}>
          {state.translation || '等待目标语言译文'}
        </p>
      </article>
    </section>
  )
}
