import {
  APIConnectionError,
  APIConnectionTimeoutError,
} from 'openai'

export const DEFAULT_OPENAI_TIMEOUT_MS = 600000

const TIMEOUT_ERROR_MESSAGE =
  '连接 OpenAI 服务超时，请检查代理配置、网络连通性，或在 backend/.env 中增大 OPENAI_TIMEOUT_MS 后重试'
const CONNECTION_ERROR_MESSAGE =
  '连接 OpenAI 服务失败，请检查代理配置和网络连通性后重试'

export function parseOpenAITimeoutMs(value: string | undefined): number {
  const trimmed = value?.trim()
  if (!trimmed) {
    return DEFAULT_OPENAI_TIMEOUT_MS
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OPENAI_TIMEOUT_MS
  }

  return parsed
}

export function formatPipelineConnectionError(error: unknown): string | null {
  if (error instanceof APIConnectionTimeoutError) {
    return TIMEOUT_ERROR_MESSAGE
  }

  if (error instanceof APIConnectionError) {
    return CONNECTION_ERROR_MESSAGE
  }

  return null
}
