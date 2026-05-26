import assert from 'node:assert/strict'
import test from 'node:test'
import { AsrService } from '../asr/asr.service'
import { PipelineService } from './pipeline.service'
import { TranslateAudioDto } from './dto/translate-audio.dto'
import { TranslationService } from '../translation/translation.service'
import { TtsService } from '../tts/tts.service'

class FakeAsrService {
  calls: Array<{ fileName: string; sourceLanguage: string }> = []

  async transcribe(
    audioFile: Express.Multer.File,
    sourceLanguage: string,
  ): Promise<string> {
    this.calls.push({
      fileName: audioFile.originalname,
      sourceLanguage,
    })

    return '你好'
  }
}

class FakeTranslationService {
  calls: Array<{
    transcript: string
    sourceLanguage: string
    targetLanguage: string
  }> = []

  async translate(
    transcript: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    this.calls.push({
      transcript,
      sourceLanguage,
      targetLanguage,
    })

    return 'hello'
  }
}

class FakeTtsService {
  calls: Array<{ text: string; targetLanguage: string }> = []

  async synthesizeSpeech(
    text: string,
    targetLanguage: string,
  ): Promise<ArrayBuffer> {
    this.calls.push({ text, targetLanguage })
    return Uint8Array.from([1, 2, 3]).buffer
  }
}

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

test('translateAudio orchestrates asr translation and tts services', async () => {
  process.env.OPENAI_API_KEY = 'test-key'

  const asrService = new FakeAsrService()
  const translationService = new FakeTranslationService()
  const ttsService = new FakeTtsService()
  const service = new PipelineService(
    asrService as unknown as AsrService,
    translationService as unknown as TranslationService,
    ttsService as unknown as TtsService,
  )
  const dto: TranslateAudioDto = {
    sourceLanguage: 'zh',
    targetLanguage: 'en',
  }

  const result = await service.translateAudio(createAudioFile(), dto)

  assert.equal(result.transcript, '你好')
  assert.equal(result.translation, 'hello')
  assert.equal(result.audioBase64, Buffer.from([1, 2, 3]).toString('base64'))
  assert.deepEqual(asrService.calls, [
    { fileName: 'sample.wav', sourceLanguage: 'zh' },
  ])
  assert.deepEqual(translationService.calls, [
    {
      transcript: '你好',
      sourceLanguage: 'zh',
      targetLanguage: 'en',
    },
  ])
  assert.deepEqual(ttsService.calls, [
    { text: 'hello', targetLanguage: 'en' },
  ])
  assert.deepEqual(
    result.logs.map((entry) => entry.stage),
    ['asr', 'translation', 'tts'],
  )
})

test('translateAudioStream emits stage events in order', async () => {
  process.env.OPENAI_API_KEY = 'test-key'

  const service = new PipelineService(
    new FakeAsrService() as unknown as AsrService,
    new FakeTranslationService() as unknown as TranslationService,
    new FakeTtsService() as unknown as TtsService,
  )

  const events = []
  for await (const event of service.translateAudioStream(createAudioFile(), {})) {
    events.push(event.type === 'stage:start' ? `${event.type}:${event.stage}` : event.type)
  }

  assert.deepEqual(events, [
    'stage:start:asr',
    'stage:done',
    'stage:start:translation',
    'stage:done',
    'stage:start:tts',
    'stage:done',
    'result',
  ])
})
