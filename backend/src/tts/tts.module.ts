import { Module } from '@nestjs/common'
import { OpenAIModule } from '../openai/openai.module'
import { TtsService } from './tts.service'

@Module({
  imports: [OpenAIModule],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
