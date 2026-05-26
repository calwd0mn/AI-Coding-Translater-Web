import { BadRequestException } from '@nestjs/common'
import { memoryStorage } from 'multer'

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

export const pipelineAudioUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException('请上传 WAV、MP3、M4A、WEBM 或 OGG 音频文件'),
        false,
      )
      return
    }

    callback(null, true)
  },
}
