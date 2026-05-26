import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { config } from 'dotenv'
import { AppModule } from './app.module'

config()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')

  const port = Number.parseInt(process.env.PORT ?? '3001', 10)
  await app.listen(port)
}

void bootstrap()
