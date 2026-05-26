import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { memoryStorage } from 'multer'
import { TranslateAudioDto } from './dto/translate-audio.dto'
import { PipelineService } from './pipeline.service'
import { TranslateAudioResponse } from './pipeline.types'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
])

@Controller('pipeline')
export class PipelineController {
  constructor(
    @Inject(PipelineService)
    private readonly pipelineService: PipelineService,
  ) {}

  @Post('translate-audio')
  @UseInterceptors(
    FileInterceptor('audioFile', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              '请上传 WAV、MP3、M4A、WEBM 或 OGG 音频文件',
            ),
            false,
          )
          return
        }

        callback(null, true)
      },
    }),
  )
  translateAudio(
    @UploadedFile() audioFile: Express.Multer.File | undefined,
    @Body() dto: TranslateAudioDto,
  ): Promise<TranslateAudioResponse> {
    if (!audioFile) {
      throw new BadRequestException('请先上传音频文件')
    }

    return this.pipelineService.translateAudio(audioFile, dto)
  }

  @Post('translate-audio-stream')
  @UseInterceptors(
    FileInterceptor('audioFile', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              '请上传 WAV、MP3、M4A、WEBM 或 OGG 音频文件',
            ),
            false,
          )
          return
        }

        callback(null, true)
      },
    }),
  )
  async translateAudioStream(
    @UploadedFile() audioFile: Express.Multer.File | undefined,
    @Body() dto: TranslateAudioDto,
    @Res() res: Response,
  ): Promise<void> {
    if (!audioFile) {
      throw new BadRequestException('请先上传音频文件')
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      for await (const event of this.pipelineService.translateAudioStream(
        audioFile,
        dto,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '流水线处理失败'
      res.write(
        `data: ${JSON.stringify({ type: 'error', message, logs: [] })}\n\n`,
      )
    }

    res.end()
  }
}
