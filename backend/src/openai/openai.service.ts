import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { parseOpenAITimeoutMs } from '../pipeline/pipeline.error-utils'

@Injectable()
export class OpenAIService {
  readonly client: OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      this.client = new OpenAI({ apiKey: 'missing-key' })
      return
    }

    const proxyUrl = this.getProxyUrl()

    if (proxyUrl) {
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
    }

    this.client = new OpenAI({
      apiKey,
      timeout: parseOpenAITimeoutMs(process.env.OPENAI_TIMEOUT_MS),
    })
  }

  private getProxyUrl(): string | null {
    const proxyCandidates = [
      process.env.HTTPS_PROXY,
      process.env.HTTP_PROXY,
      process.env.https_proxy,
      process.env.http_proxy,
    ]

    for (const candidate of proxyCandidates) {
      const value = candidate?.trim()
      if (value) {
        return value
      }
    }

    return null
  }
}
