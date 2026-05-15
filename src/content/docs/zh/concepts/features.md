---
summary: "OpenClaw 在通道、路由、媒体和用户体验方面的功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

## 亮点

<Columns>
  <Card title="渠道" icon="message-square" href="/zh/channels">
    Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等更多渠道，仅通过一个 Gateway(网关) 即可支持。
  </Card>
  <Card title="插件" icon="plug" href="/zh/tools/plugin">
    捆绑的插件增加了 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等更多功能，在正常当前版本中无需单独安装。
  </Card>
  <Card title="路由" icon="route" href="/zh/concepts/multi-agent">
    具有隔离会话的多智能体路由。
  </Card>
  <Card title="媒体" icon="image" href="/zh/nodes/images">
    图片、音频、视频、文档以及图片/视频生成。
  </Card>
  <Card title="应用和界面" icon="monitor" href="/zh/web/control-ui">
    Web 控制界面和 macOS 伴侣应用。
  </Card>
  <Card title="移动节点" icon="smartphone" href="/zh/nodes">
    支持 iOS 和 Android 节点，具有配对、语音/聊天以及丰富的设备命令。
  </Card>
</Columns>

## 完整列表

**渠道：**

- 内置频道包括 Discord、Google Chat、iMessage、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 捆绑的插件频道包括 Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可选的单独安装渠道插件包括语音通话和第三方软件包，例如微信
- 第三方渠道插件可以进一步扩展 Gateway(网关)，例如微信
- 支持群聊，具有基于提及的激活功能
- 具有允许列表和配对功能的私信安全

**智能体：**

- 带有工具流传输的嵌入式智能体运行时
- 针对每个工作区或发送者使用隔离会话的多智能体路由
- Sessions：直接聊天会折叠到共享的 `main` 中；群组是隔离的
- 针对长响应的流式传输和分块

**身份验证和提供商：**

- 35+ 模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 进行订阅身份验证（例如 OpenAI Codex）
- 自定义和自托管提供商支持（vLLM、SGLang、Ollama，以及任何 OpenAI 兼容或 Anthropic 兼容的端点）

**媒体：**

- 图片、音频、视频和文档的输入与输出
- 共享的图片生成和视频生成能力表面
- 语音备忘录转录
- 支持多个提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制 UI
- macOS 菜单栏伴侣应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具和自动化：**

- 浏览器自动化、执行、沙箱隔离
- 网络搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 作业和心跳调度
- Skills、插件和工作流管道（Lobster）

## 相关

<CardGroup cols={2}>
  <Card title="Experimental features" href="/zh/concepts/experimental-features" icon="flask">
    尚未发布到默认界面的可选功能。
  </Card>
  <Card title="Agent runtime" href="/zh/concepts/agent" icon="robot">
    Agent 运行时模型以及运行如何被分派。
  </Card>
  <Card title="Channels" href="/zh/channels" icon="message-square"TelegramWhatsAppDiscordSlackGateway(网关)>
    从一个 Gateway(网关) 连接 Telegram、WhatsApp、Discord、Slack 和更多。
  </Card>
  <Card title="Plugins" href="/zh/tools/plugin" icon="plug"OpenClaw>
    扩展 OpenClaw 的内置和第三方插件。
  </Card>
</CardGroup>
