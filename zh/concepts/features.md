---
summary: "OpenClaw 在通道、路由、媒体和用户体验方面的功能。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

## 亮点

<Columns>
  <Card title="Channels" icon="message-square">
    WhatsApp, Telegram, Discord, 和 iMessage 使用单一的 Gateway(网关)。
  </Card>
  <Card title="Plugins" icon="plug">
    通过扩展添加 Mattermost 及更多内容。
  </Card>
  <Card title="Routing" icon="route">
    带有隔离会话的多智能体路由。
  </Card>
  <Card title="Media" icon="image">
    图片、音频和文档的输入与输出。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web 控制界面和 macOS 伴随应用。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    支持 iOS 和 Android 节点，具有配对、语音/聊天以及丰富的设备命令。
  </Card>
</Columns>

## 完整列表

- 通过 WhatsApp Web (Baileys) 集成 WhatsApp
- Telegram 机器人支持 (grammY)
- Discord 机器人支持 (channels.discord.js)
- Mattermost 机器人支持 (plugin)
- 通过本地 imsg CLI (macOS) 集成 iMessage
- Pi 的代理桥接，在 RPC 模式下支持工具流式传输
- 针对长响应的流式传输和分块处理
- 针对每个工作区或发送者的隔离会话的多代理路由
- 通过 OAuth 为 Anthropic 和 OpenAI 提供订阅认证
- 会话：直接聊天会合并到共享的 `main` 中；群组会话相互隔离
- 群组聊天支持，支持基于提及的激活
- 对图片、音频和文档的媒体支持
- 可选的语音笔记转录钩子
- WebChat 和 macOS 菜单栏应用
- iOS 节点，具有配对、Canvas、相机、屏幕录制、位置和语音功能
- 具有配对功能的 Android 节点，Connect 选项卡、聊天会话、语音选项卡、Canvas/相机，以及设备、通知、联系人/日历、动作、照片和 SMS 命令

<Note>旧版 Claude、Codex、Gemini 和 Opencode 路径已被移除。Pi 是唯一的编码代理 路径。</Note>

import zh from '/components/footer/zh.mdx';

<zh />
