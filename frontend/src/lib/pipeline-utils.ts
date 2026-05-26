import type {
  ApiErrorResponse,
  PipelineLogEntry,
  PipelineStage,
} from '../types/pipeline'
import { maxAudioBytes, supportedAudioTypes } from './pipeline-options'

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`
  }

  return `${(ms / 1000).toFixed(1)} s`
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '处理失败，请稍后重试'
}

export function validateAudioFile(file: File): string | null {
  if (!supportedAudioTypes.has(file.type)) {
    return '请上传 WAV、MP3、M4A、WEBM 或 OGG 音频文件'
  }

  if (file.size > maxAudioBytes) {
    return '音频文件不能超过 25 MB'
  }

  return null
}

export function stageLabel(stage: PipelineStage): string {
  const labels: Record<PipelineStage, string> = {
    asr: 'ASR 语音识别',
    translation: 'MT 文本翻译',
    tts: 'TTS 语音合成',
  }

  return labels[stage]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPipelineStage(value: unknown): value is PipelineStage {
  return value === 'asr' || value === 'translation' || value === 'tts'
}

export function isPipelineLogEntry(value: unknown): value is PipelineLogEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    isPipelineStage(value.stage) &&
    typeof value.message === 'string' &&
    typeof value.durationMs === 'number'
  )
}

export function parseApiError(value: unknown): ApiErrorResponse {
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
