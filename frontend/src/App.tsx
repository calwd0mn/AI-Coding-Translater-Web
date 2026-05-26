import { useEffect, useReducer } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type PipelineStage = 'asr' | 'translation' | 'tts'
type PipelineStatus = 'idle' | 'ready' | 'running' | 'success' | 'failed'

interface PipelineLogEntry {
  stage: PipelineStage
  message: string
  durationMs: number
}

interface PipelineTimings {
  asrMs: number
  translationMs: number
  ttsMs: number
  totalMs: number
}

interface TranslateAudioResponse {
  sourceLanguage: string
  targetLanguage: string
  transcript: string
  translation: string
  audioBase64: string
  audioMimeType: 'audio/mpeg'
  timings: PipelineTimings
  logs: PipelineLogEntry[]
}

interface PipelineState {
  file: File | null
  sourceLanguage: string
  targetLanguage: string
  status: PipelineStatus
  transcript: string
  translation: string
  audioUrl: string
  timings: PipelineTimings | null
  logs: PipelineLogEntry[]
  error: string
}

type PipelineAction =
  | { type: 'fileSelected'; file: File }
  | { type: 'sourceLanguageChanged'; value: string }
  | { type: 'targetLanguageChanged'; value: string }
  | { type: 'runStarted' }
  | { type: 'runSucceeded'; payload: TranslateAudioResponse; audioUrl: string }
  | { type: 'runFailed'; error: string; logs: PipelineLogEntry[] }
  | { type: 'reset' }

interface ApiErrorResponse {
  message?: string | string[]
  error?: string
  logs?: PipelineLogEntry[]
}

const initialState: PipelineState = {
  file: null,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  status: 'idle',
  transcript: '',
  translation: '',
  audioUrl: '',
  timings: null,
  logs: [],
  error: '',
}

const languages = [
  { value: 'auto', label: '自动识别' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'ja', label: '日文' },
  { value: 'ko', label: '韩文' },
  { value: 'fr', label: '法文' },
  { value: 'de', label: '德文' },
  { value: 'es', label: '西班牙文' },
]

const targetLanguages = languages.filter(
  (language) => language.value !== 'auto',
)
const supportedAudioTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
])

const maxAudioBytes = 25 * 1024 * 1024

class PipelineRequestError extends Error {
  readonly logs: PipelineLogEntry[]

  constructor(message: string, logs: PipelineLogEntry[]) {
    super(message)
    this.name = 'PipelineRequestError'
    this.logs = logs
  }
}

function pipelineReducer(
  state: PipelineState,
  action: PipelineAction,
): PipelineState {
  switch (action.type) {
    case 'fileSelected':
      return {
        ...state,
        file: action.file,
        status: 'ready',
        transcript: '',
        translation: '',
        audioUrl: '',
        timings: null,
        logs: [],
        error: '',
      }
    case 'sourceLanguageChanged':
      return { ...state, sourceLanguage: action.value }
    case 'targetLanguageChanged':
      return { ...state, targetLanguage: action.value }
    case 'runStarted':
      return {
        ...state,
        status: 'running',
        transcript: '',
        translation: '',
        audioUrl: '',
        timings: null,
        logs: [],
        error: '',
      }
    case 'runSucceeded':
      return {
        ...state,
        status: 'success',
        sourceLanguage: action.payload.sourceLanguage,
        targetLanguage: action.payload.targetLanguage,
        transcript: action.payload.transcript,
        translation: action.payload.translation,
        audioUrl: action.audioUrl,
        timings: action.payload.timings,
        logs: action.payload.logs,
        error: '',
      }
    case 'runFailed':
      return {
        ...state,
        status: 'failed',
        logs: action.logs,
        error: action.error,
      }
    case 'reset':
      return initialState
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`
  }

  return `${(ms / 1000).toFixed(1)} s`
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '处理失败，请稍后重试'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseApiError(value: unknown): ApiErrorResponse {
  if (!isRecord(value)) {
    return {}
  }

  const response: ApiErrorResponse = {}

  if (typeof value.message === 'string') {
    response.message = value.message
  } else if (
    Array.isArray(value.message) &&
    value.message.every((item) => typeof item === 'string')
  ) {
    response.message = value.message
  }

  if (typeof value.error === 'string') {
    response.error = value.error
  }

  if (Array.isArray(value.logs)) {
    response.logs = value.logs.filter(isPipelineLogEntry)
  }

  return response
}

function isPipelineLogEntry(value: unknown): value is PipelineLogEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    isPipelineStage(value.stage) &&
    typeof value.message === 'string' &&
    typeof value.durationMs === 'number'
  )
}

function isPipelineStage(value: unknown): value is PipelineStage {
  return value === 'asr' || value === 'translation' || value === 'tts'
}

async function requestPipeline(
  state: PipelineState,
): Promise<TranslateAudioResponse> {
  if (!state.file) {
    throw new PipelineRequestError('请先上传音频文件', [])
  }

  const formData = new FormData()
  formData.append('audioFile', state.file)
  formData.append('sourceLanguage', state.sourceLanguage)
  formData.append('targetLanguage', state.targetLanguage)

  const response = await fetch('/api/pipeline/translate-audio', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = parseApiError(await response.json().catch(() => null))
    const message = Array.isArray(errorBody.message)
      ? errorBody.message.join('；')
      : (errorBody.message ?? errorBody.error ?? '流水线处理失败')
    throw new PipelineRequestError(message, errorBody.logs ?? [])
  }

  return response.json() as Promise<TranslateAudioResponse>
}

function stageLabel(stage: PipelineStage): string {
  const labels: Record<PipelineStage, string> = {
    asr: 'ASR 语音识别',
    translation: 'MT 文本翻译',
    tts: 'TTS 语音合成',
  }

  return labels[stage]
}

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

function App() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)
  const canRun = state.file !== null && state.status !== 'running'

  useEffect(() => {
    return () => {
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }
    }
  }, [state.audioUrl])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    if (!supportedAudioTypes.has(selectedFile.type)) {
      dispatch({
        type: 'runFailed',
        error: '请上传 WAV、MP3、M4A、WEBM 或 OGG 音频文件',
        logs: [],
      })
      return
    }

    if (selectedFile.size > maxAudioBytes) {
      dispatch({
        type: 'runFailed',
        error: '音频文件不能超过 25 MB',
        logs: [],
      })
      return
    }

    dispatch({ type: 'fileSelected', file: selectedFile })
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    dispatch({ type: 'runStarted' })

    try {
      const result = await requestPipeline(state)
      const audioBlob = base64ToBlob(result.audioBase64, result.audioMimeType)
      const audioUrl = URL.createObjectURL(audioBlob)
      dispatch({ type: 'runSucceeded', payload: result, audioUrl })
    } catch (error) {
      const logs = error instanceof PipelineRequestError ? error.logs : []
      dispatch({ type: 'runFailed', error: getErrorMessage(error), logs })
    }
  }

  function downloadTranslation(): void {
    const blob = new Blob([state.translation], {
      type: 'text/plain;charset=utf-8',
    })
    downloadBlob(blob, 'translation.txt')
  }

  function downloadSpeech(): void {
    if (!state.audioUrl) {
      return
    }

    fetch(state.audioUrl)
      .then((response) => response.blob())
      .then((blob) => downloadBlob(blob, 'translated-speech.mp3'))
      .catch(() => {
        dispatch({
          type: 'runFailed',
          error: '音频下载失败，请重新运行流水线',
          logs: state.logs,
        })
      })
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">AI Coding Demo</p>
            <h1>语音翻译流水线</h1>
            <p className="subtitle">
              上传一段音频，依次完成识别、翻译和语音合成。
            </p>
          </div>
          <button
            className="ghost-button"
            disabled={state.status === 'running'}
            type="button"
            onClick={() => dispatch({ type: 'reset' })}
          >
            重置
          </button>
        </header>

        <form className="control-panel" onSubmit={handleSubmit}>
          <label className="upload-zone">
            <input accept="audio/*" type="file" onChange={handleFileChange} />
            <span className="upload-title">
              {state.file ? state.file.name : '选择音频文件'}
            </span>
            <span className="upload-meta">
              {state.file
                ? `${formatBytes(state.file.size)} · ${state.file.type || 'audio'}`
                : '支持 WAV、MP3、M4A、WEBM、OGG，最大 25 MB'}
            </span>
          </label>

          <div className="language-grid">
            <label>
              源语言
              <select
                value={state.sourceLanguage}
                onChange={(event) =>
                  dispatch({
                    type: 'sourceLanguageChanged',
                    value: event.target.value,
                  })
                }
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
                onChange={(event) =>
                  dispatch({
                    type: 'targetLanguageChanged',
                    value: event.target.value,
                  })
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

          <button className="primary-button" disabled={!canRun} type="submit">
            {state.status === 'running' ? '处理中...' : '运行流水线'}
          </button>
        </form>

        {state.error && <p className="error-banner">{state.error}</p>}

        <section className="pipeline-strip" aria-label="流水线阶段">
          {(['asr', 'translation', 'tts'] as const).map((stage) => (
            <article className="stage-item" key={stage}>
              <span className="stage-name">{stageLabel(stage)}</span>
              <strong>{stageStatus(stage, state)}</strong>
              <span>
                {state.timings
                  ? formatDuration(
                      stage === 'asr'
                        ? state.timings.asrMs
                        : stage === 'translation'
                          ? state.timings.translationMs
                          : state.timings.ttsMs,
                    )
                  : '--'}
              </span>
            </article>
          ))}
        </section>

        <section className="results-grid">
          <article className="result-panel">
            <div className="panel-heading">
              <h2>识别文本</h2>
            </div>
            <p>{state.transcript || '等待音频识别结果'}</p>
          </article>

          <article className="result-panel">
            <div className="panel-heading">
              <h2>翻译文本</h2>
              <button
                disabled={!state.translation}
                type="button"
                onClick={downloadTranslation}
              >
                下载 TXT
              </button>
            </div>
            <p>{state.translation || '等待目标语言译文'}</p>
          </article>
        </section>

        <section className="output-panel">
          <div>
            <h2>合成音频</h2>
            <p>
              {state.timings
                ? `总耗时 ${formatDuration(state.timings.totalMs)}`
                : '完成后可试听和下载'}
            </p>
          </div>
          <audio controls src={state.audioUrl} />
          <button
            disabled={!state.audioUrl}
            type="button"
            onClick={downloadSpeech}
          >
            下载 MP3
          </button>
        </section>

        <section className="log-panel">
          <h2>运行日志</h2>
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
      </section>
    </main>
  )
}

export default App
