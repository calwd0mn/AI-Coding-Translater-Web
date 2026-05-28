import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'

type ServerEnvironment = {
  HOST?: string
  PORT?: string
}

export function getListenPort(env: ServerEnvironment): number {
  const port = Number.parseInt(env.PORT ?? '', 10)

  return Number.isNaN(port) ? 3001 : port
}

export function getListenHost(env: ServerEnvironment): string | undefined {
  return env.HOST?.trim() || undefined
}

export function getCorsOptions(): CorsOptions {
  return {
    origin: true,
  }
}
