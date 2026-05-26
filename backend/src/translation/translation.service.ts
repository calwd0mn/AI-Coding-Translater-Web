import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { OpenAIService } from '../openai/openai.service'

const TRANSLATION_MODEL = 'gpt-5-mini'

@Injectable()
export class TranslationService {
  constructor(private readonly openAIService: OpenAIService) {}

  async translate(
    transcript: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    if (!transcript.trim()) {
      throw new BadRequestException('ASR 未识别到有效文本，无法继续翻译')
    }

    const response = await this.openAIService.client.responses.create({
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
}
