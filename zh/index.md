> [!NOTE]
> 本页正在翻译中。

---
summary: "OpenClaw 的顶层概览、功能与定位"
read_when:
  - 向新用户介绍 OpenClaw
---
# OpenClaw 🦞

> *“EXFOLIATE! EXFOLIATE!”* — 也许是一只太空龙虾


<p align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text-dark.png" />
        <img src="https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text.png" alt="OpenClaw" width="500" />
    </picture>
</p>


<p align="center">
  <strong>Any OS + WhatsApp/Telegram/Discord/iMessage 网关，面向 AI agent（Pi）。</strong><br />
  插件可添加 Mattermost 等。
  发条消息，口袋里就能收到 agent 回复。
</p>

<p align="center">
  <a href="https://github.com/openclaw/openclaw">GitHub</a> ·
  <a href="https://github.com/openclaw/openclaw/releases">Releases</a> ·
  <a href="/zh/">Docs</a> ·
  <a href="/zh/start/openclaw">OpenClaw assistant setup</a>
</p>

OpenClaw 将 WhatsApp（WhatsApp Web / Baileys）、Telegram（Bot API / grammY）、Discord（Bot API / channels.discord.js）与 iMessage（imsg CLI）桥接到如 [Pi](https://github.com/badlogic/pi-mono) 的编码 agent。插件还可接入 Mattermost（Bot API + WebSocket）等。
OpenClaw 也驱动 OpenClaw assistant。

## Start here

- **从零新装：**[Getting Started](/zh/start/getting-started)
- **向导式设置（推荐）：**[Wizard](/zh/start/wizard)（`openclaw onboard`）
- **打开仪表盘（本地 Gateway）：**http://127.0.0.1:18789/（或 http://localhost:18789/）

如果 Gateway 运行在同一台电脑上，该链接会直接打开浏览器 Control UI。
如果打不开，先启动 Gateway：`openclaw gateway`。

## Dashboard（浏览器 Control UI）

Dashboard 是浏览器里的 Control UI，用于聊天、配置、节点、会话等。
本地默认：http://127.0.0.1:18789/
远程访问见：[Web surfaces](/zh/web) 与 [Tailscale](/zh/gateway/tailscale)

<p align="center">
  <img src="whatsapp-openclaw.jpg" alt="OpenClaw" width="420" />
</p>

## How it works

```
WhatsApp / Telegram / Discord / iMessage (+ plugins)
        │
        ▼
  ┌───────────────────────────┐
  │          Gateway          │  ws://127.0.0.1:18789 (loopback-only)
  │     (single source)       │
  │                           │  http://<gateway-host>:18793
  │                           │    /__openclaw__/canvas/ (Canvas host)
  └───────────┬───────────────┘
              │
              ├─ Pi agent (RPC)
              ├─ CLI (openclaw …)
              ├─ Chat UI (SwiftUI)
              ├─ macOS app (OpenClaw.app)
              ├─ iOS node via Gateway WS + pairing
              └─ Android node via Gateway WS + pairing
```

大多数操作都通过 **Gateway**（`openclaw gateway`）流转，它是一个长期运行的单一进程，负责管理频道连接与 WebSocket 控制平面。

## Network model

- **每台主机一个 Gateway（推荐）**：它是唯一允许持有 WhatsApp Web 会话的进程。如果需要救援 bot 或强隔离，可用隔离的 profile 与端口运行多个网关；见 [Multiple gateways](/zh/gateway/multiple-gateways)。
- **Loopback-first**：Gateway WS 默认为 `ws://127.0.0.1:18789`。
  - 向导现在默认生成 gateway token（即便是 loopback）。
  - Tailnet 访问用：`openclaw gateway --bind tailnet --token ...`（非 loopback 绑定必须带 token）。
- **Nodes**：通过 Gateway WebSocket 连接（按需用 LAN/tailnet/SSH）；旧 TCP bridge 已弃用/移除。
- **Canvas host**：HTTP 文件服务运行在 `canvasHost.port`（默认 `18793`），提供 `/__openclaw__/canvas/` 供 node WebView 使用；见 [Gateway configuration](/zh/gateway/configuration)（`canvasHost`）。
- **远程使用**：SSH 隧道或 tailnet/VPN；见 [Remote access](/zh/gateway/remote) 与 [Discovery](/zh/gateway/discovery)。

## Features（高层概览）

- 📱 **WhatsApp 集成** — 使用 Baileys 的 WhatsApp Web 协议
- ✈️ **Telegram Bot** — grammY 支持 DMs + 群组
- 🎮 **Discord Bot** — channels.discord.js 支持 DMs + 服务器频道
- 🧩 **Mattermost Bot（插件）** — Bot token + WebSocket 事件
- 💬 **iMessage** — 本地 imsg CLI 集成（macOS）
- 🤖 **Agent bridge** — Pi（RPC 模式）+ 工具流式
- ⏱️ **Streaming + chunking** — 分块流式 + Telegram 草稿流式细节（[/concepts/streaming](/zh/concepts/streaming)）
- 🧠 **多 agent 路由** — 把 provider 账号/peer 路由到隔离的 agent（workspace + 每 agent 会话）
- 🔐 **订阅认证** — Anthropic（Claude Pro/Max）+ OpenAI（ChatGPT/Codex）OAuth
- 💬 **Sessions** — 直聊默认合并到 `main`；群组独立
- 👥 **群聊支持** — 默认基于提及；owner 可切换 `/activation always|mention`
- 📎 **媒体支持** — 发送/接收图片、音频、文档
- 🎤 **语音消息** — 可选转写 hook
- 🖥️ **WebChat + macOS app** — 本地 UI + 菜单栏伴侣用于运维与语音唤醒
- 📱 **iOS node** — 作为节点配对并提供 Canvas
- 📱 **Android node** — 作为节点配对并提供 Canvas + Chat + Camera

注意：旧的 Claude/Codex/Gemini/Opencode 路径已移除；Pi 是唯一的编码 agent 路径。

## Quick start

运行时要求：**Node ≥ 22**。

```bash
# 推荐：全局安装（npm/pnpm）
npm install -g openclaw@latest
# or: pnpm add -g openclaw@latest

# Onboard + 安装服务（launchd/systemd 用户服务）
openclaw onboard --install-daemon

# 配对 WhatsApp Web（显示二维码）
openclaw channels login

# Onboarding 后 Gateway 通过服务运行；也可手动运行：
openclaw gateway --port 18789
```

之后在 npm 与 git 安装之间切换很容易：安装另一个版本并运行 `openclaw doctor` 更新 gateway 服务入口。

从源码（开发）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
openclaw onboard --install-daemon
```

如果还没有全局安装，可在仓库中通过 `pnpm openclaw ...` 运行 onboarding。

多实例快速启动（可选）：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
```

发送测试消息（需要 Gateway 运行）：

```bash
openclaw message send --target +15555550123 --message "Hello from OpenClaw"
```

## Configuration（可选）

配置位于 `~/.openclaw/openclaw.json`。

- **不做任何配置**时，OpenClaw 会使用内置 Pi 二进制（RPC 模式）+ 按发送者划分会话。
- 如果要更严格的安全控制，先从 `channels.whatsapp.allowFrom` 和（群组）提及规则开始。

示例：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  messages: { groupChat: { mentionPatterns: ["@openclaw"] } }
}
```

## Docs

- Start here:
  - [Docs hubs (all pages linked)](/zh/start/hubs)
  - [Help](/zh/help) ← *常见修复 + 故障排查*
  - [Configuration](/zh/gateway/configuration)
  - [Configuration examples](/zh/gateway/configuration-examples)
  - [Slash commands](/zh/tools/slash-commands)
  - [Multi-agent routing](/zh/concepts/multi-agent)
  - [Updating / rollback](/zh/install/updating)
  - [Pairing (DM + nodes)](/zh/start/pairing)
  - [Nix mode](/zh/install/nix)
  - [OpenClaw assistant setup](/zh/start/openclaw)
  - [Skills](/zh/tools/skills)
  - [Skills config](/zh/tools/skills-config)
  - [Workspace templates](/zh/reference/templates/AGENTS)
  - [RPC adapters](/zh/reference/rpc)
  - [Gateway runbook](/zh/gateway)
  - [Nodes (iOS/Android)](/zh/nodes)
  - [Web surfaces (Control UI)](/zh/web)
  - [Discovery + transports](/zh/gateway/discovery)
  - [Remote access](/zh/gateway/remote)
- Providers and UX:
  - [WebChat](/zh/web/webchat)
  - [Control UI (browser)](/zh/web/control-ui)
  - [Telegram](/zh/channels/telegram)
  - [Discord](/zh/channels/discord)
  - [Mattermost (plugin)](/zh/channels/mattermost)
  - [iMessage](/zh/channels/imessage)
  - [Groups](/zh/concepts/groups)
  - [WhatsApp group messages](/zh/concepts/group-messages)
  - [Media: images](/zh/nodes/images)
  - [Media: audio](/zh/nodes/audio)
- Companion apps:
  - [macOS app](/zh/platforms/macos)
  - [iOS app](/zh/platforms/ios)
  - [Android app](/zh/platforms/android)
  - [Windows (WSL2)](/zh/platforms/windows)
  - [Linux app](/zh/platforms/linux)
- Ops and safety:
  - [Sessions](/zh/concepts/session)
  - [Cron jobs](/zh/automation/cron-jobs)
  - [Webhooks](/zh/automation/webhook)
  - [Gmail hooks (Pub/Sub)](/zh/automation/gmail-pubsub)
  - [Security](/zh/gateway/security)
  - [Troubleshooting](/zh/gateway/troubleshooting)

## The name

**OpenClaw = CLAW + TARDIS** — 因为每只太空龙虾都需要一台时间与空间机器。

---

*“We’re all just playing with our own prompts.”* — 也许是一位 token 上头的 AI

## Credits

- **Peter Steinberger** ([@steipete](https://twitter.com/steipete)) — Creator, lobster whisperer
- **Mario Zechner** ([@badlogicc](https://twitter.com/badlogicgames)) — Pi creator, security pen-tester
- **Clawd** — 那只要求更好名字的太空龙虾

## Core Contributors

- **Maxim Vovshin** (@Hyaxia, 36747317+Hyaxia@users.noreply.github.com) — Blogwatcher skill
- **Nacho Iacovino** (@nachoiacovino, nacho.iacovino@gmail.com) — Location parsing（Telegram + WhatsApp）

## License

MIT — 像海里的龙虾一样自由 🦞

---

*“We’re all just playing with our own prompts.”* — 也许是一位 token 上头的 AI
