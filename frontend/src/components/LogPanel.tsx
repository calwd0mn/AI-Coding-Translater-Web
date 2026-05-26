import { formatDuration, stageLabel } from '../lib/pipeline-utils'
import type { PipelineState } from '../types/pipeline'

export function LogPanel({ state }: { state: PipelineState }) {
  return (
    <section className="log-panel">
      <div className="panel-heading">
        <h2>运行日志</h2>
        <span className="log-summary">
          {state.logs.length > 0 ? `${state.logs.length} 条记录` : '等待运行'}
        </span>
      </div>
      {state.logs.length > 0 ? (
        <ol>
          {state.logs.map((log) => (
            <li key={`${log.stage}-${log.message}`}>
              <span>{stageLabel(log.stage)}</span>
              <strong>{log.message}</strong>
              <em>{formatDuration(log.durationMs)}</em>
            </li>
          ))}
        </ol>
      ) : (
        <p>日志会在流水线运行后显示。</p>
      )}
    </section>
  )
}
