# AI 语音翻译流水线

一个面向 AI Coding 笔试演示的端到端语音翻译 Web Demo：上传音频后完成 ASR 语音识别、MT 文本翻译、TTS 语音合成，并输出日志、耗时、译文文件和合成音频。

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
5. 下载 `translation.txt` 和 `translated-speech.mp3`。

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
