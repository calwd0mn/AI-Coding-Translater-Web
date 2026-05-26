import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import type OpenAI from 'openai'
import { OpenAIService } from '../openai/openai.service'
import { TranslationService } from './translation.service'

test('translate rejects empty transcript before calling openai', async () => {
  let called = false
  const openAIService = {
    client: {
      responses: {
        create: async (): Promise<{ output_text: string }> => {
          called = true
          return { output_text: 'unused' }
        },
      },
    },
  } as unknown as OpenAIService

  const service = new TranslationService(openAIService)

  await assert.rejects(
    () => service.translate('   ', 'zh', 'en'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === 'ASR 未识别到有效文本，无法继续翻译',
  )
  assert.equal(called, false)
})

test('translate returns trimmed output text', async () => {
  let capturedRequest: Parameters<OpenAI['responses']['create']>[0] | undefined

  const openAIService = {
    client: {
      responses: {
        create: async (
          request: Parameters<OpenAI['responses']['create']>[0],
        ): Promise<{ output_text: string }> => {
          capturedRequest = request
          return { output_text: '  hello  ' }
        },
      },
    },
  } as unknown as OpenAIService

  const service = new TranslationService(openAIService)
  const result = await service.translate('你好', 'zh', 'en')
  const userInput =
    Array.isArray(capturedRequest?.input) &&
    typeof capturedRequest.input[1] === 'object' &&
    capturedRequest.input[1] !== null &&
    'role' in capturedRequest.input[1]
      ? capturedRequest.input[1]
      : null

  assert.equal(result, 'hello')
  assert.equal(capturedRequest?.model, 'gpt-5-mini')
  assert.equal(userInput?.role, 'user')
})

test('translate throws when openai returns empty text', async () => {
  const openAIService = {
    client: {
      responses: {
        create: async (): Promise<{ output_text: string }> => ({
          output_text: '   ',
        }),
      },
    },
  } as unknown as OpenAIService

  const service = new TranslationService(openAIService)

  await assert.rejects(
    () => service.translate('你好', 'zh', 'en'),
    (error: unknown) =>
      error instanceof InternalServerErrorException &&
      error.message === '翻译服务未返回有效译文',
  )
})
