import { useEffect, useReducer } from 'react'
import type {
  PipelineLogEntry,
  PipelineSSEEvent,
  PipelineStage,
  PipelineState,
  TranslateAudioResponse,
} from '../types/pipeline'
import {
  base64ToBlob,
  downloadBlob,
  getErrorMessage,
  parseApiError,
  validateAudioFile,
} from '../lib/pipeline-utils'
import { apiBaseUrl, getApiUrl } from '../lib/api-config'

type PipelineAction =
  | { type: 'fileSelected'; file: File }
  | { type: 'sourceLanguageChanged'; value: string }
  | { type: 'targetLanguageChanged'; value: string }
  | { type: 'runStarted' }
  | { type: 'stageStarted'; stage: PipelineStage }
  | { type: 'stageDone'; stage: string; message: string; durationMs: number }
  | { type: 'runSucceeded'; payload: TranslateAudioResponse; audioUrl: string }
  | { type: 'runFailed'; error: string; logs: PipelineLogEntry[] }
  | { type: 'reset' }

const initialState: PipelineState = {
  file: null,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  status: 'idle',
  activeStage: null,
  transcript: '',
  translation: '',
  audioUrl: '',
  timings: null,
  logs: [],
  error: '',
}

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
        activeStage: null,
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
        activeStage: null,
        transcript: '',
        translation: '',
        audioUrl: '',
        timings: null,
        logs: [],
        error: '',
      }
    case 'stageStarted':
      return { ...state, activeStage: action.stage }
    case 'stageDone':
      return {
        ...state,
        logs: [
          ...state.logs,
          {
            stage: action.stage as PipelineLogEntry['stage'],
            message: action.message,
            durationMs: action.durationMs,
          },
        ],
      }
    case 'runSucceeded':
      return {
        ...state,
        status: 'success',
        activeStage: null,
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
        activeStage: null,
        logs: action.logs,
        error: action.error,
      }
    case 'reset':
      return initialState
  }
}

async function* streamPipeline(
  state: PipelineState,
): AsyncGenerator<PipelineSSEEvent, void, undefined> {
  if (!state.file) {
    throw new PipelineRequestError('请先上传音频文件', [])
  }

  const formData = new FormData()
  formData.append('audioFile', state.file)
  formData.append('sourceLanguage', state.sourceLanguage)
  formData.append('targetLanguage', state.targetLanguage)

  const response = await fetch(
    getApiUrl('/pipeline/translate-audio-stream', apiBaseUrl),
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    const errorBody = parseApiError(await response.json().catch(() => null))
    const message = Array.isArray(errorBody.message)
      ? errorBody.message.join('；')
      : (errorBody.message ?? errorBody.error ?? '流水线处理失败')
    throw new PipelineRequestError(message, errorBody.logs ?? [])
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new PipelineRequestError('浏览器不支持流式响应', [])
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const json = trimmed.slice(6)
        try {
          yield JSON.parse(json) as PipelineSSEEvent
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function usePipeline() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)
  const canRun = state.file !== null && state.status !== 'running'

  useEffect(() => {
    return () => {
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }
    }
  }, [state.audioUrl])

  function selectFile(file: File | null): void {
    if (!file) return

    const validationError = validateAudioFile(file)
    if (validationError) {
      dispatch({ type: 'runFailed', error: validationError, logs: [] })
      return
    }

    dispatch({ type: 'fileSelected', file })
  }

  function setSourceLanguage(value: string): void {
    dispatch({ type: 'sourceLanguageChanged', value })
  }

  function setTargetLanguage(value: string): void {
    dispatch({ type: 'targetLanguageChanged', value })
  }

  async function submitPipeline(): Promise<void> {
    dispatch({ type: 'runStarted' })

    try {
      for await (const event of streamPipeline(state)) {
        switch (event.type) {
          case 'stage:start':
            dispatch({ type: 'stageStarted', stage: event.stage })
            break
          case 'stage:done':
            dispatch({
              type: 'stageDone',
              stage: event.stage,
              message: event.message,
              durationMs: event.durationMs,
            })
            break
          case 'stage:error':
            dispatch({
              type: 'stageDone',
              stage: event.stage,
              message: event.message,
              durationMs: event.durationMs,
            })
            break
          case 'result':
            {
              const audioBlob = base64ToBlob(
                event.data.audioBase64,
                event.data.audioMimeType,
              )
              const audioUrl = URL.createObjectURL(audioBlob)
              dispatch({
                type: 'runSucceeded',
                payload: event.data,
                audioUrl,
              })
            }
            break
          case 'error':
            dispatch({
              type: 'runFailed',
              error: event.message,
              logs: event.logs,
            })
            break
        }
      }
    } catch (error) {
      const logs = error instanceof PipelineRequestError ? error.logs : []
      dispatch({ type: 'runFailed', error: getErrorMessage(error), logs })
    }
  }

  function resetPipeline(): void {
    dispatch({ type: 'reset' })
  }

  function downloadTranslation(): void {
    if (!state.translation) return

    const blob = new Blob([state.translation], {
      type: 'text/plain;charset=utf-8',
    })
    downloadBlob(blob, 'translation.txt')
  }

  function downloadSpeech(): void {
    if (!state.audioUrl) return

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

  function downloadTranscript(): void {
    if (!state.transcript) return

    const blob = new Blob([state.transcript], {
      type: 'text/plain;charset=utf-8',
    })
    downloadBlob(blob, 'transcript.txt')
  }

  return {
    state,
    canRun,
    selectFile,
    setSourceLanguage,
    setTargetLanguage,
    submitPipeline,
    resetPipeline,
    downloadTranscript,
    downloadTranslation,
    downloadSpeech,
  }
}
