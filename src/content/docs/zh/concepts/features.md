---
summary: "OpenClaw 在通道、路由、媒体和用户体验方面的功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

# 功能

## 亮点

<Columns>
  <Card title="频道" icon="message-square" href="/zh/channels">
    通过单个 Discord 支持 iMessage、Signal、Slack、Telegram、WhatsApp、WebChat、Gateway(网关) 以及更多平台。
  </Card>
  <Card title="插件" icon="plug" href="/zh/tools/plugin">
    内置插件添加了 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 以及更多支持，在正常当前版本中无需单独安装。
  </Card>
  <Card title="路由" icon="route" href="/zh/concepts/multi-agent">
    具有隔离会话的多智能体路由。
  </Card>
  <Card title="Media" icon="image" href="/zh/nodes/images">
    图片、音频、视频、文档以及图像/视频生成。
  </Card>
  <Card title="Apps and UI" icon="monitor" href="/zh/web/control-ui">
    Web 控制界面和 macOS 伴侣应用。
  </Card>
  <Card title="Mobile nodes" icon="smartphone" href="/zh/nodes">
    iOS 和 Android 节点，支持配对、语音/聊天以及丰富的设备命令。
  </Card>
</Columns>

## 完整列表

**频道：**

- 内置渠道包括 Discord、Google Chat、iMessage（旧版）、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 捆绑的插件渠道包括用于 BlueBubbles 的 iMessage、飞书、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ 机器人、群晖 Chat、Tlon、Twitch、Zalo 和 Zalo 个人版
- 可选的单独安装的渠道插件包括语音通话和第三方软件包，例如微信
- 第三方渠道插件可以进一步扩展 Gateway(网关)，例如微信
- 群聊支持，并支持基于提及的激活
- 私信安全性，支持允许列表和配对

**智能体：**

- 嵌入式智能体运行时，支持工具流式传输
- 多智能体路由，每个工作区或发送方拥有隔离的会话
- 会话：直接聊天会合并到共享的 `main`；群组则是隔离的
- 支持长回复的流式传输和分块

**身份验证和提供商：**

- 35+ 个模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 进行订阅身份验证（例如 OpenAI Codex）
- 自定义和自托管提供商支持（vLLM、SGLang、Ollama 以及任何兼容 OpenAI 或 Anthropic 的端点）

**媒体：**

- 图片、音频、视频和文档的输入与输出
- 共享的图片生成和视频生成能力界面
- 语音笔记转录
- 支持多个提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制 UI
- macOS 菜单栏伴侣应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具和自动化：**

- 浏览器自动化、exec、沙箱隔离
- 网络搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 任务和心跳调度
- Skills、插件和工作流管道（Lobster）
