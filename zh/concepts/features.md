---
summary: "OpenClaw 在通道、路由、媒体和用户体验方面的功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

# 功能

## 亮点

<Columns>
  <Card title="Channels" icon="message-square">
    通过单一WhatsApp使用 Telegram、Discord、iMessage 和 Gateway(网关)。
  </Card>
  <Card title="Plugins" icon="plug">
    通过扩展添加 Mattermost 和更多功能。
  </Card>
  <Card title="Routing" icon="route">
    带有隔离会话的多智能体路由。
  </Card>
  <Card title="Media" icon="image">
    图片、音频和文档的输入与输出。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web 控制界面和 macOS 伴侣应用。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    支持iOS和Android节点，具备配对、语音/聊天和丰富的设备命令。
  </Card>
</Columns>

## 完整列表

**频道：**

- WhatsApp、Telegram、Discord、iMessage（内置）
- Mattermost、Matrix、Microsoft Teams、Nostr以及更多（通过插件）
- 支持群聊，并通过提及激活
- 通过允许列表和配对实现私信安全

**智能体：**

- 嵌入式智能体运行时，支持工具流式传输
- 多智能体路由，每个工作区或发送者拥有隔离会话
- 会话：直接聊天会合并到共享的 `main` 中；群组会话相互隔离
- 针对长响应的流式传输和分块

**身份验证和提供商：**

- 35+ 模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 进行订阅身份验证（例如 OpenAI Codex）
- 自定义和自托管提供商支持（vLLM、SGLang、Ollama 以及任何与 OpenAI 或 Anthropic 兼容的端点）

**媒体：**

- 图片、音频、视频和文档的输入与输出
- 语音备忘录转录
- 支持多个提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制界面
- macOS 菜单栏伴侣应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具和自动化：**

- 浏览器自动化、执行、沙箱隔离
- 网络搜索（Brave、Perplexity、Gemini、Grok、Kimi、Firecrawl）
- Cron 任务和心跳调度
- Skills、插件和工作流流水线（Lobster）

import zh from "/components/footer/zh.mdx";

<zh />
