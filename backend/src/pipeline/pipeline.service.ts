import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { TranslateAudioDto } from './dto/translate-audio.dto'
import {
  formatPipelineConnectionError,
  parseOpenAITimeoutMs,
} from './pipeline.error-utils'
import {
  PipelineLogEntry,
  PipelineSSEEvent,
  PipelineStage,
  TranslateAudioResponse,
} from './pipeline.types'

const ASR_MODEL = 'gpt-4o-mini-transcribe'
const TRANSLATION_MODEL = 'gpt-5-mini'
const TTS_MODEL = 'gpt-4o-mini-tts'
const DEFAULT_SOURCE_LANGUAGE = 'auto'
const DEFAULT_TARGET_LANGUAGE = 'en'

interface TimedResult<T> {
  value: T
  durationMs: number
}

@Injectable()
export class PipelineService {
  private readonly openai: OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      this.openai = new OpenAI({ apiKey: 'missing-key' })
      return
    }

    const proxyUrl = this.getProxyUrl()

    if (proxyUrl) {
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: parseOpenAITimeoutMs(process.env.OPENAI_TIMEOUT_MS),
    })
  }

  async translateAudio(
    audioFile: Express.Multer.File,
    dto: TranslateAudioDto,
  ): Promise<TranslateAudioResponse> {
    this.assertConfigured()

    const sourceLanguage = this.normalizeLanguage(
      dto.sourceLanguage,
      DEFAULT_SOURCE_LANGUAGE,
    )
    const targetLanguage = this.normalizeLanguage(
      dto.targetLanguage,
      DEFAULT_TARGET_LANGUAGE,
    )
    const totalStart = performance.now()
    const logs: PipelineLogEntry[] = []

    try {
      const transcriptResult = await this.runStage('asr', logs, async () =>
        this.transcribe(audioFile, sourceLanguage),
      )

      const translationResult = await this.runStage(
        'translation',
        logs,
        async () =>
          this.translate(
            transcriptResult.value,
            sourceLanguage,
            targetLanguage,
          ),
      )

      const speechResult = await this.runStage('tts', logs, async () =>
        this.synthesizeSpeech(translationResult.value, targetLanguage),
      )

      return {
        sourceLanguage,
        targetLanguage,
        transcript: transcriptResult.value,
        translation: translationResult.value,
        audioBase64: Buffer.from(speechResult.value).toString('base64'),
        audioMimeType: 'audio/mpeg',
        timings: {
          asrMs: transcriptResult.durationMs,
          translationMs: translationResult.durationMs,
          ttsMs: speechResult.durationMs,
          totalMs: Math.round(performance.now() - totalStart),
        },
        logs,
      }
    } catch (error) {
      throw this.toPipelineException(error, logs)
    }
  }

  async *translateAudioStream(
    audioFile: Express.Multer.File,
    dto: TranslateAudioDto,
  ): AsyncGenerator<PipelineSSEEvent, void, undefined> {
    this.assertConfigured()

    const sourceLanguage = this.normalizeLanguage(
      dto.sourceLanguage,
      DEFAULT_SOURCE_LANGUAGE,
    )
    const targetLanguage = this.normalizeLanguage(
      dto.targetLanguage,
      DEFAULT_TARGET_LANGUAGE,
    )
    const totalStart = performance.now()
    const logs: PipelineLogEntry[] = []

    try {
      yield { type: 'stage:start', stage: 'asr' }
      const transcriptResult = await this.runStage('asr', logs, async () =>
        this.transcribe(audioFile, sourceLanguage),
      )
      yield {
        type: 'stage:done',
        stage: 'asr',
        message: '语音识别完成',
        durationMs: transcriptResult.durationMs,
      }

      yield { type: 'stage:start', stage: 'translation' }
      const translationResult = await this.runStage(
        'translation',
        logs,
        async () =>
          this.translate(
            transcriptResult.value,
            sourceLanguage,
            targetLanguage,
          ),
      )
      yield {
        type: 'stage:done',
        stage: 'translation',
        message: '文本翻译完成',
        durationMs: translationResult.durationMs,
      }

      yield { type: 'stage:start', stage: 'tts' }
      const speechResult = await this.runStage('tts', logs, async () =>
        this.synthesizeSpeech(translationResult.value, targetLanguage),
      )
      yield {
        type: 'stage:done',
        stage: 'tts',
        message: '语音合成完成',
        durationMs: speechResult.durationMs,
      }

      yield {
        type: 'result',
        data: {
          sourceLanguage,
          targetLanguage,
          transcript: transcriptResult.value,
          translation: translationResult.value,
          audioBase64: Buffer.from(speechResult.value).toString('base64'),
          audioMimeType: 'audio/mpeg',
          timings: {
            asrMs: transcriptResult.durationMs,
            translationMs: translationResult.durationMs,
            ttsMs: speechResult.durationMs,
            totalMs: Math.round(performance.now() - totalStart),
          },
          logs,
        },
      }
    } catch (error) {
      const httpError = this.toPipelineException(error, logs)
      const response = httpError.getResponse()
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? String((response as { message: unknown }).message)
          : httpError.message

      yield { type: 'error', message, logs }
    }
  }

  private assertConfigured(): void {
    if (!process.env.OPENAI_API_KEY) {
      throw new BadRequestException(
        '后端未配置 OPENAI_API_KEY，请在 backend/.env 中设置后重启服务',
      )
    }
  }

  private getProxyUrl(): string | null {
    const proxyCandidates = [
      process.env.HTTPS_PROXY,
      process.env.HTTP_PROXY,
      process.env.https_proxy,
      process.env.http_proxy,
    ]

    for (const candidate of proxyCandidates) {
      const value = candidate?.trim()
      if (value) {
        return value
      }
    }

    return null
  }

  private normalizeLanguage(
    value: string | undefined,
    fallback: string,
  ): string {
    const trimmed = value?.trim()
    return trimmed ? trimmed : fallback
  }

  private async transcribe(
    audioFile: Express.Multer.File,
    sourceLanguage: string,
  ): Promise<string> {
    const file = await toFile(audioFile.buffer, audioFile.originalname, {
      type: audioFile.mimetype,
    })

    const transcript = await this.openai.audio.transcriptions.create({
      file,
      model: ASR_MODEL,
      response_format: 'text',
      ...(sourceLanguage === DEFAULT_SOURCE_LANGUAGE
        ? {}
        : { language: sourceLanguage }),
    })

    return transcript.trim()
  }

  private async translate(
    transcript: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    if (!transcript.trim()) {
      throw new BadRequestException('ASR 未识别到有效文本，无法继续翻译')
    }

    const response = await this.openai.responses.create({
      model: TRANSLATION_MODEL,
      input: [
        {
          role: 'system',
          content:
            'You are a translation engine. Return only the translated text, without explanations.',
        },
        {
          role: 'user',
          content: `Translate this text from ${sourceLanguage} to ${targetLanguage}:\n\n${transcript}`,
        },
      ],
    })

    const translatedText = response.output_text.trim()
    if (!translatedText) {
      throw new InternalServerErrorException('翻译服务未返回有效译文')
    }

    return translatedText
  }

  private async synthesizeSpeech(
    text: string,
    targetLanguage: string,
  ): Promise<ArrayBuffer> {
    const speech = await this.openai.audio.speech.create({
      model: TTS_MODEL,
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
      instructions: `Speak naturally in ${targetLanguage}.`,
    })

    return speech.arrayBuffer()
  }

  private async runStage<T>(
    stage: PipelineStage,
    logs: PipelineLogEntry[],
    action: () => Promise<T>,
  ): Promise<TimedResult<T>> {
    const startedAt = performance.now()

    try {
      const value = await action()
      const durationMs = Math.round(performance.now() - startedAt)
      logs.push({
        stage,
        message: this.successMessage(stage),
        durationMs,
      })

      return { value, durationMs }
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt)
      logs.push({
        stage,
        message: this.failureMessage(stage, error),
        durationMs,
      })

      throw error
    }
  }

  private successMessage(stage: PipelineStage): string {
    const messages: Record<PipelineStage, string> = {
      asr: '语音识别完成',
      translation: '文本翻译完成',
      tts: '语音合成完成',
    }

    return messages[stage]
  }

  private failureMessage(stage: PipelineStage, error: unknown): string {
    const messages: Record<PipelineStage, string> = {
      asr: '语音识别失败',
      translation: '文本翻译失败',
      tts: '语音合成失败',
    }

    const detail = error instanceof Error ? error.message : '未知错误'
    return `${messages[stage]}：${detail}`
  }

  private toPipelineException(
    error: unknown,
    logs: PipelineLogEntry[],
  ): HttpException {
    const connectionMessage = formatPipelineConnectionError(error)
    if (connectionMessage) {
      return new HttpException(
        { message: connectionMessage, logs },
        HttpStatus.GATEWAY_TIMEOUT,
      )
    }

    if (error instanceof HttpException) {
      const response = error.getResponse()
      const message = this.extractExceptionMessage(response, error.message)
      return new HttpException({ message, logs }, error.getStatus())
    }

    const message = error instanceof Error ? error.message : '流水线处理失败'
    return new HttpException(
      { message, logs },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }

  private extractExceptionMessage(
    response: string | object,
    fallback: string,
  ): string {
    if (typeof response === 'string') {
      return response
    }

    if ('message' in response) {
      const value = response.message

      if (typeof value === 'string') {
        return value
      }

      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
      ) {
        return value.join('；')
      }
    }

    return fallback
  }
}
