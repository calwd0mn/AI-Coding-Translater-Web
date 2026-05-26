import { Module } from '@nestjs/common'
import { OpenAIModule } from '../openai/openai.module'
import { TranslationService } from './translation.service'

@Module({
  imports: [OpenAIModule],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
