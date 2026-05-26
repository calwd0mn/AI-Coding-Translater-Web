import { formatDuration, stageLabel } from '../lib/pipeline-utils'
import type { PipelineStage, PipelineState } from '../types/pipeline'
import { PipelineNode } from './PipelineNode'

const stages: PipelineStage[] = ['asr', 'translation', 'tts']

const stageIcons: Record<PipelineStage, string> = {
  asr: '🎙️',
  translation: '🌐',
  tts: '🔊',
}

const handleConfig: Record<
  number,
  { left: 'target' | 'source' | 'none'; right: 'target' | 'source' | 'none' }
> = {
  0: { left: 'none', right: 'source' },
  1: { left: 'target', right: 'source' },
  2: { left: 'target', right: 'none' },
}

function stageStatus(
  stage: PipelineStage,
  state: PipelineState,
): { label: string; cssClass: string } {
  if (state.status === 'success') return { label: '完成', cssClass: 'done' }
  if (state.status === 'running' && state.activeStage === stage)
    return { label: '运行中', cssClass: 'active' }
  if (state.status === 'running' && state.logs.some((l) => l.stage === stage))
    return { label: '完成', cssClass: 'done' }
  if (state.status === 'failed' && state.logs.some((l) => l.stage === stage))
    return { label: '失败', cssClass: 'error' }
  return { label: '等待', cssClass: 'idle' }
}

function stageDuration(
  stage: PipelineStage,
  state: PipelineState,
): string {
  const log = state.logs.find((l) => l.stage === stage)
  if (log) return formatDuration(log.durationMs)
  if (!state.timings) return '--'
  const ms =
    stage === 'asr'
      ? state.timings.asrMs
      : stage === 'translation'
        ? state.timings.translationMs
        : state.timings.ttsMs
  return formatDuration(ms)
}

export function PipelineStrip({ state }: { state: PipelineState }) {
  const live = state.status === 'running'

  return (
    <section className="pipeline-workflow" aria-label="流水线阶段">
      {/* SVG edge layer */}
      <svg
        className="pipeline-edges"
        viewBox="0 0 760 56"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="edge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id="edge-grad-live" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Edge 1: ASR → MT */}
        <g>
          <line
            x1="194" y1="28" x2="320" y2="28"
            stroke={live ? 'url(#edge-grad-live)' : 'url(#edge-grad)'}
            strokeWidth="2"
            strokeDasharray={live ? '0' : '5 4'}
            strokeLinecap="round"
          />
          {live && (
            <line
              x1="194" y1="28" x2="320" y2="28"
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="6 18"
              strokeLinecap="round"
              className="edge-flow"
            />
          )}
          <polygon
            points="316,23 330,28 316,33"
            fill={live ? '#6366f1' : '#d1d5db'}
            className={live ? 'edge-arrow-live' : ''}
          />
        </g>

        {/* Edge 2: MT → TTS */}
        <g>
          <line
            x1="426" y1="28" x2="552" y2="28"
            stroke={live ? 'url(#edge-grad-live)' : 'url(#edge-grad)'}
            strokeWidth="2"
            strokeDasharray={live ? '0' : '5 4'}
            strokeLinecap="round"
          />
          {live && (
            <line
              x1="426" y1="28" x2="552" y2="28"
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="6 18"
              strokeLinecap="round"
              className="edge-flow"
            />
          )}
          <polygon
            points="548,23 562,28 548,33"
            fill={live ? '#6366f1' : '#d1d5db'}
            className={live ? 'edge-arrow-live' : ''}
          />
        </g>
      </svg>

      {/* Nodes */}
      <div className="pipeline-nodes">
        {stages.map((stage, index) => {
          const status = stageStatus(stage, state)
          const handles = handleConfig[index]

          return (
            <PipelineNode
              key={stage}
              icon={stageIcons[stage]}
              label={stageLabel(stage)}
              step={index + 1}
              status={status}
              duration={stageDuration(stage, state)}
              leftHandle={handles.left}
              rightHandle={handles.right}
            />
          )
        })}
      </div>
    </section>
  )
}
