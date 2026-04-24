---
summary: "媒体生成、理解和语音功能的统一入口页面"
read_when:
  - Looking for an overview of media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "媒体概览"
---

# 媒体生成与理解

OpenClaw 生成图像、视频和音乐，理解传入的媒体（图像、音频、视频），并通过文本转语音朗读回复。所有媒体功能均由工具驱动：代理会根据对话决定何时使用它们，并且每个工具只有在配置了至少一个支持提供商时才会出现。

## 功能概览

| 功能             | 工具             | 提供商                                                                                       | 作用                                   |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| 图像生成         | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra, xAI                                            | 根据文本提示词或参考内容创建或编辑图像 |
| 视频生成         | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | 根据文本、图像或现有视频创建视频       |
| 音乐生成         | `music_generate` | ComfyUI, Google, MiniMax                                                                     | 根据文本提示词创建音乐或音轨           |
| 文本转语音 (TTS) | `tts`            | ElevenLabs, Microsoft, MiniMax, OpenAI, xAI                                                  | 将传出回复转换为口语音频               |
| 媒体理解         | （自动）         | 任何支持视觉/音频的模型提供商，以及 CLI 回退方案                                             | 汇总传入的图像、音频和视频             |

## 提供商功能矩阵

此表显示了哪些提供商在平台上支持哪些媒体功能。

| 提供商     | 图像 | 视频 | 音乐 | TTS | STT / 转录 | 媒体理解 |
| ---------- | ---- | ---- | ---- | --- | ---------- | -------- |
| Alibaba    |      | 是   |      |     |            |          |
| BytePlus   |      | 是   |      |     |            |          |
| ComfyUI    | 是   | 是   | 是   |     |            |          |
| Deepgram   |      |      |      |     | 是         |          |
| ElevenLabs |      |      |      | 是  | 是         |          |
| fal        | 是   | 是   |      |     |            |          |
| Google     | 是   | 是   | 是   |     |            | 是       |
| Microsoft  |      |      |      | 是  |            |          |
| MiniMax    | 是   | 是   | 是   | 是  |            |          |
| Mistral    |      |      |      |     | 是         |          |
| OpenAI     | 是   | 是   |      | 是  | 是         | 是       |
| Qwen       |      | 是   |      |     |            |          |
| Runway     |      | 是   |      |     |            |          |
| Together   |      | 是   |      |     |            |          |
| Vydra      | 是   | 是   |      |     |            |          |
| xAI        | 是   | 是   |      | 是  | 是         | 是       |

<Note>媒体理解使用提供商配置中注册的任何具备视觉或音频功能的模型。上表突出显示了具有专用媒体理解支持的提供商；大多数拥有多模态模型的 LLM 提供商（如 Anthropic、Google、OpenAI 等）在配置为活动回复模型时，也可以理解传入的媒体。</Note>

## 异步生成的工作原理

视频和音乐生成作为后台任务运行，因为提供商的处理通常需要 30 秒到几分钟。当代理调用 `video_generate` 或 `music_generate` 时，OpenClaw 会将请求提交给提供商，立即返回任务 ID，并在任务账本中跟踪该任务。在任务运行期间，代理会继续响应其他消息。当提供商处理完成后，OpenClaw 会唤醒代理，以便其可以将完成的媒体发布回原始渠道。图像生成和 TTS 是同步的，并随回复一起内联完成。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 在配置后都可以通过 `tools.media.audio` 路径转录传入的音频。Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还注册了语音通话流式 STT 提供商，因此实时电话音频可以转发到选定的供应商，而无需等待录制完成。

OpenAI 映射到 OpenClaw 的图像、视频、批量 TTS、批量 STT、语音通话流式 STT、实时语音和记忆嵌入表面。xAI 目前映射到 OpenClaw 的图像、视频、搜索、代码执行、批量 TTS、批量 STT 和语音通话流式 STT 表面。xAI 实时语音是一项上游功能，但在共享实时语音合约能够表示它之前，它不会在 OpenClaw 中注册。

## 快速链接

- [图像生成](/zh/tools/image-generation) -- 生成和编辑图像
- [视频生成](/zh/tools/video-generation) -- 文本转视频、图像转视频和视频转视频
- [音乐生成](/zh/tools/music-generation) -- 创建音乐和音轨
- [文本转语音](/zh/tools/tts) -- 将回复转换为语音
- [媒体理解](/zh/nodes/media-understanding) -- 理解传入的图像、音频和视频
