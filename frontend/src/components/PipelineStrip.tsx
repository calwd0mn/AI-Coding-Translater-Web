import { formatDuration, stageLabel } from '../lib/pipeline-utils'
import type { PipelineStage, PipelineState } from '../types/pipeline'

const stages: PipelineStage[] = ['asr', 'translation', 'tts']

function stageStatus(stage: PipelineStage, state: PipelineState): string {
  if (state.status === 'success') {
    return '完成'
  }

  if (
    state.status === 'failed' &&
    state.logs.some((log) => log.stage === stage)
  ) {
    return '已停止'
  }

  if (state.status === 'running' && stage === 'asr') {
    return '运行中'
  }

  return '等待'
}

function stageDuration(stage: PipelineStage, state: PipelineState): string {
  if (!state.timings) {
    return '--'
  }

  const durationMs =
    stage === 'asr'
      ? state.timings.asrMs
      : stage === 'translation'
        ? state.timings.translationMs
        : state.timings.ttsMs

  return formatDuration(durationMs)
}

export function PipelineStrip({ state }: { state: PipelineState }) {
  return (
    <section className="pipeline-strip" aria-label="流水线阶段">
      {stages.map((stage, index) => (
        <article className="stage-item" key={stage}>
          <span className="stage-index">0{index + 1}</span>
          <span className="stage-name">{stageLabel(stage)}</span>
          <strong>{stageStatus(stage, state)}</strong>
          <span>{stageDuration(stage, state)}</span>
        </article>
      ))}
    </section>
  )
}
