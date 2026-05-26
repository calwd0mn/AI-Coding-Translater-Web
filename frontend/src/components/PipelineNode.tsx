interface PipelineNodeStatus {
  label: string
  cssClass: string
}

interface PipelineNodeProps {
  icon: string
  label: string
  step: number
  status: PipelineNodeStatus
  duration: string
  leftHandle?: 'target' | 'source' | 'none'
  rightHandle?: 'target' | 'source' | 'none'
}

export function PipelineNode({
  icon,
  label,
  step,
  status,
  duration,
  leftHandle = 'none',
  rightHandle = 'none',
}: PipelineNodeProps) {
  const active = status.cssClass === 'active'

  return (
    <div className={`pipeline-node node-${status.cssClass}`}>
      {leftHandle !== 'none' && (
        <div className={`node-handle node-handle-${leftHandle}`}>
          <span className="handle-dot" />
        </div>
      )}

      <div className="node-card">
        <div className="node-top">
          <span className="node-icon">{icon}</span>
          <div className="node-title-group">
            <span className="node-label">{label}</span>
            <span className="node-step">
              STEP {String(step).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="node-bottom">
          <span className={`node-status-badge badge-${status.cssClass}`}>
            {active && <span className="badge-dot" />}
            {status.label}
          </span>
          <span className="node-duration">{duration}</span>
        </div>
      </div>

      {rightHandle !== 'none' && (
        <div className={`node-handle node-handle-${rightHandle}`}>
          <span className="handle-dot" />
        </div>
      )}
    </div>
  )
}
