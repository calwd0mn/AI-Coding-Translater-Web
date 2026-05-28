import type { ChangeEvent } from 'react'
import { formatBytes } from '../lib/pipeline-utils'
import type { PipelineState } from '../types/pipeline'

interface ControlPanelProps {
  state: PipelineState
  onFileChange: (file: File | null) => void
  compact?: boolean
}

export function ControlPanel({ state, onFileChange, compact = false }: ControlPanelProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onFileChange(event.target.files?.[0] ?? null)
  }

  return (
    <div className="upload-area">
      <label className="upload-zone">
        <input accept="audio/*" type="file" onChange={handleFileChange} />
        <span className="upload-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4M12 4L8 8M12 4L16 8" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        </span>
        <span className="upload-title">
          {state.file
            ? state.file.name
            : compact
              ? '点击上传音频文件'
              : '拖拽音频文件到此处，或点击上传'}
        </span>
        <span className="upload-meta">
          {state.file
            ? `${formatBytes(state.file.size)} · ${state.file.type || '音频文件'}`
            : '支持 WAV、MP3、M4A、WEBM、OGG，最大 25 MB'}
        </span>
      </label>
    </div>
  )
}
