import { Inject, Injectable } from '@nestjs/common'
import { OpenAIService } from '../openai/openai.service'

const TTS_MODEL = 'gpt-4o-mini-tts'

@Injectable()
export class TtsService {
  constructor(
    @Inject(OpenAIService)
    private readonly openAIService: OpenAIService,
  ) {}

  async synthesizeSpeech(
    text: string,
    targetLanguage: string,
  ): Promise<ArrayBuffer> {
    const speech = await this.openAIService.client.audio.speech.create({
      model: TTS_MODEL,
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
      instructions: `Speak naturally in ${targetLanguage}.`,
    })

    return speech.arrayBuffer()
  }
}
