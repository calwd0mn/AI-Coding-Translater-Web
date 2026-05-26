import assert from 'node:assert/strict'
import test from 'node:test'
import type OpenAI from 'openai'
import { AsrService } from './asr.service'
import { OpenAIService } from '../openai/openai.service'

function createAudioFile(): Express.Multer.File {
  return {
    fieldname: 'audioFile',
    originalname: 'sample.wav',
    encoding: '7bit',
    mimetype: 'audio/wav',
    size: 4,
    buffer: Buffer.from([1, 2, 3, 4]),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  }
}

test('transcribe omits language when source language is auto', async () => {
  let capturedRequest:
    | Parameters<OpenAI['audio']['transcriptions']['create']>[0]
    | undefined

  const openAIService = {
    client: {
      audio: {
        transcriptions: {
          create: async (
            request: Parameters<OpenAI['audio']['transcriptions']['create']>[0],
          ): Promise<string> => {
            capturedRequest = request
            return '  transcript  '
          },
        },
      },
    },
  } as unknown as OpenAIService

  const service = new AsrService(openAIService)
  const result = await service.transcribe(createAudioFile(), 'auto')

  assert.equal(result, 'transcript')
  assert.equal(capturedRequest?.model, 'gpt-4o-mini-transcribe')
  assert.equal(capturedRequest?.response_format, 'text')
  assert.equal('language' in (capturedRequest ?? {}), false)
})

test('transcribe forwards explicit source language', async () => {
  let capturedRequest:
    | Parameters<OpenAI['audio']['transcriptions']['create']>[0]
    | undefined

  const openAIService = {
    client: {
      audio: {
        transcriptions: {
          create: async (
            request: Parameters<OpenAI['audio']['transcriptions']['create']>[0],
          ): Promise<string> => {
            capturedRequest = request
            return 'ni hao'
          },
        },
      },
    },
  } as unknown as OpenAIService

  const service = new AsrService(openAIService)
  await service.transcribe(createAudioFile(), 'zh')

  assert.equal(capturedRequest?.language, 'zh')
})
