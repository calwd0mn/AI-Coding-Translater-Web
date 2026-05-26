import type { ChangeEvent, FormEvent } from 'react'
import { languages, targetLanguages } from '../lib/pipeline-options'
import { formatBytes } from '../lib/pipeline-utils'
import type { PipelineState } from '../types/pipeline'

interface ControlPanelProps {
  state: PipelineState
  canRun: boolean
  onFileChange: (file: File | null) => void
  onSourceLanguageChange: (value: string) => void
  onTargetLanguageChange: (value: string) => void
  onSubmit: () => Promise<void>
}

export function ControlPanel({
  state,
  canRun,
  onFileChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSubmit,
}: ControlPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void onSubmit()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onFileChange(event.target.files?.[0] ?? null)
  }

  return (
    <form className="control-panel" onSubmit={handleSubmit}>
      <label className="upload-zone">
        <input accept="audio/*" type="file" onChange={handleFileChange} />
        <span className="upload-kicker">主输入</span>
        <span className="upload-title">
          {state.file ? state.file.name : '选择一段音频开始运行'}
        </span>
        <span className="upload-meta">
          {state.file
            ? `${formatBytes(state.file.size)} · ${state.file.type || 'audio'}`
            : '支持 WAV、MP3、M4A、WEBM、OGG，最大 25 MB'}
        </span>
      </label>

      <div className="language-panel">
        <label>
          源语言
          <select
            value={state.sourceLanguage}
            onChange={(event) => onSourceLanguageChange(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          目标语言
          <select
            value={state.targetLanguage}
            onChange={(event) => onTargetLanguageChange(event.target.value)}
          >
            {targetLanguages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button className="primary-button" disabled={!canRun} type="submit">
        {state.status === 'running' ? '处理中...' : '运行流水线'}
      </button>
    </form>
  )
}
