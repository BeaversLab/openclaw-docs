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

实时语音使用 Talk 会话合约，而非一次性媒体工具路径。Talk 有三种模式：提供商原生 `realtime`、本地或流式 `stt-tts`，以及用于仅观察语音捕获的 `transcription`。这些模式与电话、会议、浏览器实时和原生按键通话客户端共享提供商目录、事件包和取消语义。

## 功能

<CardGroup cols={2}>
  <Card title="图像生成" href="/zh/tools/image-generation" icon="image">
    通过 `image_generate` 从文本提示或参考图像创建和编辑图像。 同步 —— 与回复一起内联完成。
  </Card>
  <Card title="视频生成" href="/zh/tools/video-generation" icon="video">
    通过 `video_generate` 实现文本生成视频、图像生成视频和视频生成视频。 异步 —— 在后台运行并在准备就绪时发布结果。
  </Card>
  <Card title="音乐生成" href="/zh/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音频轨道。在共享提供商上为异步；ComfyUI 工作流路径同步运行。
  </Card>
  <Card title="文本转语音" href="/zh/tools/tts" icon="microphone">
    通过 `tts` 工具以及 `messages.tts` 配置将出站回复转换为口语音频。同步。
  </Card>
  <Card title="媒体理解" href="/zh/nodes/media-understanding" icon="eye">
    使用具备视觉能力的模型提供商和专用的媒体理解插件来总结入站图像、音频和视频。
  </Card>
  <Card title="语音转文字" href="/zh/nodes/audio" icon="ear-listen">
    通过批量 STT 或语音通话流式 STT 提供商转录入站语音消息。
  </Card>
</CardGroup>

## 提供商能力矩阵

| 提供商      | 图像 | 视频 | 音乐 | TTS | STT | 实时语音 | 媒体理解 |
| ----------- | :--: | :--: | :--: | :-: | :-: | :------: | :------: |
| Alibaba     |      |  ✓   |      |     |     |          |          |
| BytePlus    |      |  ✓   |      |     |     |          |          |
| ComfyUI     |  ✓   |  ✓   |  ✓   |     |     |          |          |
| DeepInfra   |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Deepgram    |      |      |      |     |  ✓  |    ✓     |          |
| ElevenLabs  |      |      |      |  ✓  |  ✓  |          |          |
| fal         |  ✓   |  ✓   |      |     |     |          |          |
| Google      |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium     |      |      |      |  ✓  |     |          |          |
| 本地 CLI    |      |      |      |  ✓  |     |          |          |
| Microsoft   |      |      |      |  ✓  |     |          |          |
| MiniMax     |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral     |      |      |      |     |  ✓  |          |          |
| OpenAI      |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| OpenRouter  |  ✓   |  ✓   |      |  ✓  |     |          |    ✓     |
| Qwen        |      |  ✓   |      |     |     |          |          |
| Runway      |      |  ✓   |      |     |     |          |          |
| SenseAudio  |      |      |      |     |  ✓  |          |          |
| Together    |      |  ✓   |      |     |     |          |          |
| Vydra       |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI         |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>媒体理解使用提供商配置中注册的任何具备视觉或音频能力的模型。上表列出了具有专用媒体理解支持的提供商；大多数多模态 LLM 提供商（Anthropic、Google、 OpenAI 等）在配置为活动回复模型时，也可以理解入站媒体。</Note>

## 异步与同步

| 能力           | 模式 | 原因                                                               |
| -------------- | ---- | ------------------------------------------------------------------ |
| 图像           | 同步 | 提供商响应在几秒内返回；与回复一起内联完成。                       |
| 文字转语音     | 同步 | 提供商响应在几秒内返回；附加到回复音频。                           |
| 视频           | 异步 | 提供商处理耗时 30 秒到几分钟；慢速队列最多可持续到配置的超时时间。 |
| 音乐（共享）   | 异步 | 提供商处理特性与视频相同。                                         |
| 音乐 (ComfyUI) | 同步 | 本地工作流针对已配置的 ComfyUI 服务器内联运行。                    |

对于异步工具，OpenClaw 会向提供商提交请求，立即返回任务 ID，并在任务账本中跟踪该作业。代理在作业运行时继续响应其他消息。当提供商完成处理时，OpenClaw 会使用生成的媒体路径唤醒代理，以便其告知用户；并在源交付策略要求时，通过消息工具中继结果。对于仅限消息工具的群组/渠道路由，OpenClaw 会将缺失的消息工具交付证据视为完成尝试失败，并将生成的媒体回退直接发送到原始渠道。

## 语音转文本和语音通话

Deepgram、DeepInfra、ElevenLabs、Mistral、OpenAI、SenseAudio 和 xAI 均可在配置后通过批量 `tools.media.audio` 路径转录入站音频。为提及门控或命令解析而对语音笔记进行预检的渠道插件会在入站上下文中标记已转录的附件，因此共享的媒体理解过程会重用该转录文本，而不是对同一音频进行第二次 STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还注册了语音通话流式 STT 提供商，因此实时电话音频可以转发到选定的供应商，而无需等待录音完成。

对于实时用户对话，请首选 [Talk 模式](/zh/nodes/talk)。批量音频附件保留在媒体路径上；浏览器实时、原生按住通话、电话会议和会议音频应使用 Talk 事件以及由 Gateway(网关) 返回的会话范围目录。

## 提供商映射（供应商如何在各表面之间拆分）

<AccordionGroup>
  <Accordion title="Google">图像、视频、音乐、批量 TTS、后端实时语音以及 媒体理解表面。</Accordion>
  <Accordion title="OpenAI">图像、视频、批量 TTS、批量 STT、语音通话流式 STT、后端 实时语音以及内存嵌入表面。</Accordion>
  <Accordion title="DeepInfra">聊天/模型路由、图像生成/编辑、文本生成视频、批量 TTS、 批量 STT、图像媒体理解以及内存嵌入表面。 DeepInfra 原生的重排序/分类/对象检测模型在 OpenClaw 为这些 类别拥有专用的提供商合约之前，不会被注册。</Accordion>
  <Accordion title="xAI">图像、视频、搜索、代码执行、批量 TTS、批量 STT 和语音 通话流式 STT。xAI 实时语音是一项上游功能，但在共享的实时语音合约能够 表示它之前，不会在 OpenClaw 中注册。</Accordion>
</AccordionGroup>

## 相关

- [图像生成](/zh/tools/image-generation)
- [视频生成](/zh/tools/video-generation)
- [音乐生成](/zh/tools/music-generation)
- [文本转语音](/zh/tools/tts)
- [媒体理解](/zh/nodes/media-understanding)
- [音频节点](/zh/nodes/audio)
- [Talk 模式](/zh/nodes/talk)
