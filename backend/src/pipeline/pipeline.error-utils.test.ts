import test from 'node:test'
import assert from 'node:assert/strict'
import { APIConnectionTimeoutError } from 'openai'
import {
  DEFAULT_OPENAI_TIMEOUT_MS,
  formatPipelineConnectionError,
  parseOpenAITimeoutMs,
} from './pipeline.error-utils'

test('formats timeout errors with actionable guidance', () => {
  const message = formatPipelineConnectionError(
    new APIConnectionTimeoutError({ message: 'Request timed out.' }),
  )

  assert.equal(
    message,
    '连接 OpenAI 服务超时，请检查代理配置、网络连通性，或在 backend/.env 中增大 OPENAI_TIMEOUT_MS 后重试',
  )
})

test('falls back to the default timeout when env is missing', () => {
  assert.equal(parseOpenAITimeoutMs(undefined), DEFAULT_OPENAI_TIMEOUT_MS)
})

test('uses a valid env timeout value', () => {
  assert.equal(parseOpenAITimeoutMs('900000'), 900000)
})
