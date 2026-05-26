import { Module } from '@nestjs/common'
import { AsrModule } from '../asr/asr.module'
import { TranslationModule } from '../translation/translation.module'
import { TtsModule } from '../tts/tts.module'
import { PipelineController } from './pipeline.controller'
import { PipelineService } from './pipeline.service'

@Module({
  imports: [AsrModule, TranslationModule, TtsModule],
  controllers: [PipelineController],
  providers: [PipelineService],
})
export class PipelineModule {}
