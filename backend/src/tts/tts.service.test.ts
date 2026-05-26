import assert from 'node:assert/strict'
import test from 'node:test'
import type OpenAI from 'openai'
import { OpenAIService } from '../openai/openai.service'
import { TtsService } from './tts.service'

test('synthesizeSpeech forwards tts options and returns audio buffer', async () => {
  let capturedRequest: Parameters<OpenAI['audio']['speech']['create']>[0] | undefined

  const openAIService = {
    client: {
      audio: {
        speech: {
          create: async (
            request: Parameters<OpenAI['audio']['speech']['create']>[0],
          ): Promise<{ arrayBuffer: () => Promise<ArrayBuffer> }> => {
            capturedRequest = request
            return {
              arrayBuffer: async () => Uint8Array.from([9, 8, 7]).buffer,
            }
          },
        },
      },
    },
  } as unknown as OpenAIService

  const service = new TtsService(openAIService)
  const result = await service.synthesizeSpeech('hello', 'en')

  assert.deepEqual(Array.from(new Uint8Array(result)), [9, 8, 7])
  assert.equal(capturedRequest?.model, 'gpt-4o-mini-tts')
  assert.equal(capturedRequest?.voice, 'alloy')
  assert.equal(capturedRequest?.response_format, 'mp3')
  assert.equal(capturedRequest?.instructions, 'Speak naturally in en.')
})
