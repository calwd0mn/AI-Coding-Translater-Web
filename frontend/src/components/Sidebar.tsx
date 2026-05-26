import type { FormEvent } from 'react'
import { languages, targetLanguages } from '../lib/pipeline-options'
import type { PipelineState } from '../types/pipeline'

interface SidebarProps {
  state: PipelineState
  canRun: boolean
  onSourceLanguageChange: (value: string) => void
  onTargetLanguageChange: (value: string) => void
  onSubmit: () => Promise<void>
  onReset: () => void
}

export function Sidebar({
  state,
  canRun,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSubmit,
  onReset,
}: SidebarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">&#9830;</span>
        <span className="sidebar-title">AI 语音翻译</span>
      </div>

      <p className="sidebar-desc">
        上传音频，自动完成语音识别、文本翻译与语音合成
      </p>

      <form className="sidebar-form" onSubmit={handleSubmit}>
        <div className="sidebar-fields">
          <label className="sidebar-label">
            <span>源语言</span>
            <select
              value={state.sourceLanguage}
              onChange={(event) =>
                onSourceLanguageChange(event.target.value)
              }
            >
              {languages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>

          <label className="sidebar-label">
            <span>目标语言</span>
            <select
              value={state.targetLanguage}
              onChange={(event) =>
                onTargetLanguageChange(event.target.value)
              }
            >
              {targetLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="sidebar-run-btn"
          disabled={!canRun}
          type="submit"
        >
          {state.status === 'running' ? '处理中...' : '开始翻译'}
        </button>
      </form>

      <button
        className="sidebar-reset-btn"
        disabled={state.status === 'running'}
        type="button"
        onClick={onReset}
      >
        重置
      </button>

      {state.file && (
        <p className="sidebar-file-info">
          已选择：{state.file.name}
        </p>
      )}
    </aside>
  )
}
