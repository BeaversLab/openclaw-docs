---
summary: "图像、视频、音乐、语音以及媒体理解功能概览"
read_when:
  - Looking for an overview of OpenClaw's media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "媒体概览"
sidebarTitle: "媒体概览"
---

OpenClaw 可以生成图像、视频和音乐，理解传入的媒体（图像、音频、视频），并通过文本转语音大声朗读回复。所有媒体功能均由工具驱动：智能体会根据对话决定何时使用它们，而每个工具只有在配置了至少一个支持提供商时才会出现。

## 功能

<CardGroup cols={2}>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    通过 `image_generate` 根据文本提示词或参考图像创建和编辑图像。 同步 — 与回复一起内联完成。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    通过 `video_generate` 实现文本生成视频、图像生成视频以及视频生成视频。 异步 — 在后台运行，准备就绪后发布结果。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音轨。共享提供商上为 异步；ComfyUI 工作流路径为同步运行。
  </Card>
  <Card title="文本转语音" href="/zh/tools/tts" icon="microphone">
    通过 `tts` 工具以及 `messages.tts` 配置将出站回复转换为语音。同步。
  </Card>
  <Card title="Media understanding" href="/zh/nodes/media-understanding" icon="eye">
    使用具备视觉能力的模型提供商和专用媒体理解插件对传入的图像、音频和视频进行摘要。
  </Card>
  <Card title="Speech-to-text" href="/zh/nodes/audio" icon="ear-listen">
    通过批量 STT 或语音通话流式 STT 提供商转录传入的语音消息。
  </Card>
</CardGroup>

## 提供商能力矩阵

| 提供商      | 图像 | 视频 | 音乐 | TTS | STT | 实时语音 | 媒体理解 |
| ----------- | :--: | :--: | :--: | :-: | :-: | :------: | :------: |
| Alibaba     |      |  ✓   |      |     |     |          |          |
| BytePlus    |      |  ✓   |      |     |     |          |          |
| ComfyUI     |  ✓   |  ✓   |  ✓   |     |     |          |          |
| Deepgram    |      |      |      |     |  ✓  |    ✓     |          |
| ElevenLabs  |      |      |      |  ✓  |  ✓  |          |          |
| fal         |  ✓   |  ✓   |      |     |     |          |          |
| Google      |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium     |      |      |      |  ✓  |     |          |          |
| Local CLI   |      |      |      |  ✓  |     |          |          |
| Microsoft   |      |      |      |  ✓  |     |          |          |
| MiniMax     |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral     |      |      |      |     |  ✓  |          |          |
| OpenAI      |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| Qwen        |      |  ✓   |      |     |     |          |          |
| Runway      |      |  ✓   |      |     |     |          |          |
| SenseAudio  |      |      |      |     |  ✓  |          |          |
| Together    |      |  ✓   |      |     |     |          |          |
| Vydra       |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI         |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>媒体理解使用在您的提供商配置中注册的任何具备视觉能力或音频能力的模型。上面的矩阵列出了具有专用媒体理解支持的提供商；大多数多模态 LLM 提供商（Anthropic、Google、OpenAI 等）在配置为活动回复模型时也可以理解传入的媒体。</Note>

## 异步与同步

| 能力            | 模式 | 原因                                              |
| --------------- | ---- | ------------------------------------------------- |
| 图像            | 同步 | 提供商在数秒内返回响应；与回复内联完成。          |
| Text-to-speech  | 同步 | 提供商在数秒内返回响应；附加到回复音频。          |
| 视频            | 异步 | 提供商处理需要 30 秒到几分钟。                    |
| 音乐（共享）    | 异步 | 提供商处理特性与视频相同。                        |
| 音乐（ComfyUI） | 同步 | 本地工作流将针对已配置的 ComfyUI 服务器内联运行。 |

对于异步工具，OpenClaw 会向提供商提交请求，立即返回任务 ID，并在任务账本中跟踪该作业。在作业运行期间，代理会继续响应其他消息。当提供商完成处理后，OpenClaw 会唤醒代理，以便将完成的媒体发布回原始渠道。

## 语音转文本和语音通话

Deepgram、ElevenLabs、Mistral、OpenAI、SenseAudio 和 xAI 在配置后均可通过批量 `tools.media.audio` 路径转录入站音频。预先检查语音备注以进行提及过滤或命令解析的渠道插件会在入站上下文中标记已转录的附件，因此共享的媒体理解流程会重用该转录内容，而不会对同一音频进行第二次 STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还注册了语音通话流式 STT 提供商，因此可以实时将电话音频转发到选定的供应商，而无需等待完整的录音。

## 提供商映射（供应商如何分配到不同界面）

<AccordionGroup>
  <Accordion title="Google">图像、视频、音乐、批量 TTS、后端实时语音以及 媒体理解界面。</Accordion>
  <Accordion title="OpenAI">图像、视频、批量 TTS、批量 STT、语音通话流式 STT、后端 实时语音以及记忆嵌入界面。</Accordion>
  <Accordion title="xAI">图像、视频、搜索、代码执行、批量 TTS、批量 STT 以及语音 通话流式 STT。xAI 实时语音是一项上游功能，但在共享的实时语音合约能够 表示它之前，不会在 OpenClaw 中注册它。</Accordion>
</AccordionGroup>

## 相关

- [图像生成](/zh/tools/image-generation)
- [视频生成](/zh/tools/video-generation)
- [音乐生成](/zh/tools/music-generation)
- [文本转语音](/zh/tools/tts)
- [媒体理解](/zh/nodes/media-understanding)
- [音频节点](/zh/nodes/audio)
