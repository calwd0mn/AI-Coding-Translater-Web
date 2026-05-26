interface WorkspaceHeaderProps {
  disabled: boolean
  onReset: () => void
}

export function WorkspaceHeader({
  disabled,
  onReset,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="hero-copy">
        <p className="eyebrow">AI Voice Pipeline</p>
        <h1>把一段声音，变成另一种语言的完整表达。</h1>
        <p className="subtitle">
          上传音频后，系统会依次完成识别、翻译和语音合成。整条链路集中展示，方便调试、演示和结果复查。
        </p>
      </div>
      <div className="hero-aside">
        <div className="hero-note">
          <span>Pipeline</span>
          <strong>ASR → MT → TTS</strong>
          <p>保留现有流程，只把界面和结构整理得更清楚。</p>
        </div>
        <button
          className="ghost-button"
          disabled={disabled}
          type="button"
          onClick={onReset}
        >
          重置
        </button>
      </div>
    </header>
  )
}
