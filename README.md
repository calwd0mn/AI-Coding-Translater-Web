# AI 语音翻译流水线

一个面向 AI Coding 笔试演示的端到端语音翻译 Web Demo：上传音频后完成 ASR 语音识别、MT 文本翻译、TTS 语音合成，并输出日志、耗时、识别文本、译文文件和合成音频。

## 项目简介

本项目对应题目“构建语音翻译流水线”，选择了 Web 端交互 + NestJS 本地后端代理的实现方式。用户上传本地音频后，系统依次完成：

1. ASR：音频转文本
2. MT：源语言到目标语言翻译
3. TTS：目标语言语音合成
4. 结果展示与导出：日志、耗时、识别文本、译文文本、合成音频

## 题目要求对照

1. 导入本地音频文件
   已实现。前端支持上传 WAV、MP3、M4A、WEBM、OGG，最大 25 MB。
2. 调用 ASR 服务识别并显示文本
   已实现。后端调用 OpenAI `gpt-4o-mini-transcribe`，前端展示识别文本。
3. 调用 MT 接口翻译并显示结果
   已实现。后端调用 OpenAI `gpt-5-mini`，前端展示译文。
4. 调用 TTS 服务合成目标语言音频并保存到本地
   已实现。后端调用 OpenAI `gpt-4o-mini-tts`，前端支持下载 `translated-speech.mp3`。
5. 输出运行日志和产物文件
   已实现。前端展示阶段日志与耗时，支持下载 `transcript.txt`、`translation.txt` 和合成音频。

## 加分项完成情况

1. 支持指定源语言和目标语言
   已实现，前端可选择 `sourceLanguage` 和 `targetLanguage`。
2. 对每个阶段耗时进行统计并打印
   已实现，返回并展示 ASR、翻译、TTS 及总耗时。
3. 任一步骤失败时给出清晰错误提示
   已实现，后端返回结构化错误，前端展示错误信息和阶段日志。

## 技术栈

- 前端：Vite + React + TypeScript，使用 `useReducer` 管理单页流水线状态。
- 后端：NestJS 本地 API 代理，使用 `FileInterceptor` 接收音频文件。
- AI 服务：OpenAI Audio Transcriptions、Responses API、Audio Speech。

## 环境准备

```powershell
pwsh.exe -NoLogo -NoProfile
npm install
npm --prefix frontend install
npm --prefix backend install
Copy-Item backend/.env.example backend/.env
```

然后在 `backend/.env` 中填入：

```text
OPENAI_API_KEY=你的 OpenAI API Key
PORT=3001
```

## 运行

```powershell
npm run dev
```

- 前端默认地址：`http://localhost:5173`
- 后端默认地址：`http://localhost:3001/api`

## 使用流程

1. 上传 WAV、MP3、M4A、WEBM 或 OGG 音频，最大 25 MB。
2. 选择源语言和目标语言。
3. 点击“运行流水线”。
4. 查看识别文本、翻译文本、合成音频、阶段耗时和运行日志。
5. 下载 `transcript.txt`、`translation.txt` 和 `translated-speech.mp3`。

## 演示建议

提交时建议附带：

1. 一段 30-60 秒演示视频
2. 一张运行完成后的界面截图
3. 一个示例音频及其运行结果说明

建议视频内容包含：

1. 上传本地音频
2. 选择源语言和目标语言
3. 运行流水线并观察阶段状态
4. 展示识别文本、译文、日志和耗时
5. 下载文本和音频产物

## 验证

```powershell
npm run build
npm run lint
```

## 配置说明

- API Key 只在 `backend/.env` 中使用，不会进入前端包。
- 后端默认模型：
  - ASR：`gpt-4o-mini-transcribe`
  - 翻译：`gpt-5-mini`
  - TTS：`gpt-4o-mini-tts`
- 当前版本不包含数据库、历史记录、任务队列或账号系统，重点是清晰展示一次完整的语音翻译流水线。

## 工程说明

- 前端使用 React + TypeScript，状态集中在 `usePipeline` 中管理。
- 后端使用 NestJS，并已拆分为 `openai`、`asr`、`translation`、`tts` 和 `pipeline` 编排模块。
- `pipeline` 对外保留统一接口，内部按能力解耦，便于扩展其他阶段或替换底层服务。
