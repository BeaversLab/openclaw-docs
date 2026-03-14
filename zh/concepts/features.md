---
summary: "OpenClaw 在渠道、路由、媒体和用户体验方面的能力。"
read_when:
  - You want a full list of what OpenClaw supports
title: "功能"
---

## 亮点

<Columns> <Card title="渠道" icon="message-square"> 通过单一 Gateway 网关 使用 WhatsApp、Telegram、Discord 和 iMessage。 </Card> <Card title="插件" icon="plug"> 通过扩展添加 Mattermost 等更多功能。 </Card> <Card title="路由" icon="route"> 具有隔离会话的多智能体路由。 </Card> <Card title="媒体" icon="image"> 图片、音频和文档的输入与输出。 </Card> <Card title="应用和界面" icon="monitor"> Web 控制界面和 macOS 伴侣应用。 </Card> <Card title="移动节点" icon="smartphone"> 支持 iOS 和 Android 节点，具备配对、语音/聊天以及丰富的设备命令。 </Card>
</Columns>

## 完整列表

- 通过 WhatsApp Web (Baileys) 集成 WhatsApp
- Telegram 机器人支持 (grammY)
- Discord 机器人支持 (channels.discord.js)
- Mattermost 机器人支持（插件）
- 通过本地 imsg CLI 集成 iMessage (macOS)
- 用于 Pi 的 RPC 模式智能体网桥，支持工具流式传输
- 针对长响应的流式传输和分块
- 针对每个工作区或发送者的隔离会话的多智能体路由
- 通过 OAuth 为 Anthropic 和 OpenAI 提供订阅身份验证
- 会话：直接聊天会合并到共享的 `main`；群组则是隔离的
- 支持群聊，基于提及激活
- 支持图片、音频和文档的媒体功能
- 可选的语音备忘录转录钩子
- WebChat 和 macOS 菜单栏应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音功能
- Android 节点，支持配对、Connect 标签页、聊天会话、语音标签页、Canvas/相机，以及设备、通知、联系人/日历、动作、照片和短信指令

<Note>
旧版 Claude、Codex、Gemini 和 Opencode 路径已被移除。Pi 是唯一
的编码智能体路径。
</Note>

import zh from '/components/footer/zh.mdx';

<zh />
