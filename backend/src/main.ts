import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { config } from 'dotenv'
import { AppModule } from './app.module'
import { getCorsOptions, getListenHost, getListenPort } from './server-options'

config()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors(getCorsOptions())

  const port = getListenPort(process.env)
  const host = getListenHost(process.env)

  if (host) {
    await app.listen(port, host)
    return
  }

  await app.listen(port)
}

void bootstrap()
