import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { AsrService } from '../asr/asr.service'
import { TranslationService } from '../translation/translation.service'
import { TtsService } from '../tts/tts.service'
import { TranslateAudioDto } from './dto/translate-audio.dto'
import { formatPipelineConnectionError } from './pipeline.error-utils'
import {
  PipelineLogEntry,
  PipelineSSEEvent,
  PipelineStage,
  TranslateAudioResponse,
} from './pipeline.types'

const DEFAULT_SOURCE_LANGUAGE = 'auto'
const DEFAULT_TARGET_LANGUAGE = 'en'

interface TimedResult<T> {
  value: T
  durationMs: number
}

@Injectable()
export class PipelineService {
  constructor(
    private readonly asrService: AsrService,
    private readonly translationService: TranslationService,
    private readonly ttsService: TtsService,
  ) {}

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
        this.asrService.transcribe(audioFile, sourceLanguage),
      )

      const translationResult = await this.runStage(
        'translation',
        logs,
        async () =>
          this.translationService.translate(
            transcriptResult.value,
            sourceLanguage,
            targetLanguage,
          ),
      )

      const speechResult = await this.runStage('tts', logs, async () =>
        this.ttsService.synthesizeSpeech(translationResult.value, targetLanguage),
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
        this.asrService.transcribe(audioFile, sourceLanguage),
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
          this.translationService.translate(
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
        this.ttsService.synthesizeSpeech(translationResult.value, targetLanguage),
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

  private normalizeLanguage(
    value: string | undefined,
    fallback: string,
  ): string {
    const trimmed = value?.trim()
    return trimmed ? trimmed : fallback
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
