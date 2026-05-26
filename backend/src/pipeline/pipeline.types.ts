export type PipelineStage = 'asr' | 'translation' | 'tts'

export interface PipelineLogEntry {
  stage: PipelineStage
  message: string
  durationMs: number
}

export interface PipelineTimings {
  asrMs: number
  translationMs: number
  ttsMs: number
  totalMs: number
}

export interface TranslateAudioResponse {
  sourceLanguage: string
  targetLanguage: string
  transcript: string
  translation: string
  audioBase64: string
  audioMimeType: 'audio/mpeg'
  timings: PipelineTimings
  logs: PipelineLogEntry[]
}

export type PipelineSSEEvent =
  | { type: 'stage:start'; stage: PipelineStage }
  | { type: 'stage:done'; stage: PipelineStage; message: string; durationMs: number }
  | { type: 'stage:error'; stage: PipelineStage; message: string; durationMs: number }
  | { type: 'result'; data: TranslateAudioResponse }
  | { type: 'error'; message: string; logs: PipelineLogEntry[] }
