---
summary: "OpenClaw 在 channels、routing、media 和 UX 方面的能力。"
read_when:
  - 您想要 OpenClaw 支持的完整列表
title: "Features"
---

## Highlights

<Columns>
  <Card title="Channels" icon="message-square">
    通过单个 Gateway 支持 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="Plugins" icon="plug">
    通过 extensions 添加 Mattermost 和更多。
  </Card>
  <Card title="Routing" icon="route">
    带有隔离 session 的 multi-agent routing。
  </Card>
  <Card title="Media" icon="image">
    图片、音频和文档的输入输出。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web Control UI 和 macOS companion app。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    支持 Canvas 的 iOS 和 Android nodes。
  </Card>
</Columns>

## Full list

- 通过 WhatsApp Web (Baileys) 集成 WhatsApp
- Telegram bot 支持 (grammY)
- Discord bot 支持 (channels.discord.js)
- Mattermost bot 支持 (plugin)
- 通过本地 imsg CLI 集成 iMessage (macOS)
- 用于 RPC 模式下 Pi 的 agent bridge，支持 tool streaming
- 长响应的 streaming 和 chunking
- 用于每个 workspace 或 sender 的隔离 session 的 multi-agent routing
- 通过 OAuth 订阅 Anthropic 和 OpenAI 的 auth
- Sessions：direct chats 折叠到共享的 `main`；groups 是隔离的
- 支持基于 mention 激活的 group chat
- 图片、音频和文档的 media 支持
- 可选的 voice note transcription hook
- WebChat 和 macOS menu bar app
- 带有 pairing 和 Canvas surface 的 iOS node
- 带有 pairing、Canvas、chat 和 camera 的 Android node

<Note>
Legacy Claude、Codex、Gemini 和 Opencode 路径已被删除。Pi 是唯一的
coding agent 路径。
</Note>
