import { Module } from '@nestjs/common'
import { OpenAIModule } from '../openai/openai.module'
import { AsrService } from './asr.service'

@Module({
  imports: [OpenAIModule],
  providers: [AsrService],
  exports: [AsrService],
})
export class AsrModule {}
