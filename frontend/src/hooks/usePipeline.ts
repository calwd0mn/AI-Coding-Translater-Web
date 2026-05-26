import { useEffect, useReducer } from 'react'
import type {
  PipelineLogEntry,
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

type PipelineAction =
  | { type: 'fileSelected'; file: File }
  | { type: 'sourceLanguageChanged'; value: string }
  | { type: 'targetLanguageChanged'; value: string }
  | { type: 'runStarted' }
  | { type: 'runSucceeded'; payload: TranslateAudioResponse; audioUrl: string }
  | { type: 'runFailed'; error: string; logs: PipelineLogEntry[] }
  | { type: 'reset' }

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
    if (!file) {
      return
    }

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
      const result = await requestPipeline(state)
      const audioBlob = base64ToBlob(result.audioBase64, result.audioMimeType)
      const audioUrl = URL.createObjectURL(audioBlob)
      dispatch({ type: 'runSucceeded', payload: result, audioUrl })
    } catch (error) {
      const logs = error instanceof PipelineRequestError ? error.logs : []
      dispatch({ type: 'runFailed', error: getErrorMessage(error), logs })
    }
  }

  function resetPipeline(): void {
    dispatch({ type: 'reset' })
  }

  function downloadTranslation(): void {
    if (!state.translation) {
      return
    }

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

  return {
    state,
    canRun,
    selectFile,
    setSourceLanguage,
    setTargetLanguage,
    submitPipeline,
    resetPipeline,
    downloadTranslation,
    downloadSpeech,
  }
}
