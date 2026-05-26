import { Inject, Injectable } from '@nestjs/common'
import { toFile } from 'openai/uploads'
import { OpenAIService } from '../openai/openai.service'

const ASR_MODEL = 'gpt-4o-mini-transcribe'
const AUTO_SOURCE_LANGUAGE = 'auto'

@Injectable()
export class AsrService {
  constructor(
    @Inject(OpenAIService)
    private readonly openAIService: OpenAIService,
  ) {}

  async transcribe(
    audioFile: Express.Multer.File,
    sourceLanguage: string,
  ): Promise<string> {
    const file = await toFile(audioFile.buffer, audioFile.originalname, {
      type: audioFile.mimetype,
    })

    const transcript = await this.openAIService.client.audio.transcriptions.create({
      file,
      model: ASR_MODEL,
      response_format: 'text',
      ...(sourceLanguage === AUTO_SOURCE_LANGUAGE
        ? {}
        : { language: sourceLanguage }),
    })

    return transcript.trim()
  }
}
