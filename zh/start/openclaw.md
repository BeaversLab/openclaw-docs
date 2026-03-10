---
summary: "将 OpenClaw 用作个人助手的端到端指南，附安全注意事项"
read_when:
  - "Onboarding a new assistant instance"
  - "Reviewing safety/permission implications"
title: "个人助手设置"
---

# 使用 OpenClaw 构建个人助手

OpenClaw 是一个用于 **Pi** 代理的 WhatsApp + Telegram + Discord + iMessage Gateway。插件可以添加 Mattermost。本指南是"个人助手"设置：一个专用的 WhatsApp 号码，行为就像您的始终在线的代理。

## ⚠️ 安全第一

您将代理置于可以执行以下操作的位置：

- 在您的机器上运行命令（取决于您的 Pi 工具设置）
- 在您的工作区中读/写文件
- 通过 WhatsApp/Telegram/Discord/Mattermost（插件）发送消息

从保守开始：

- 始终设置 `channels.whatsapp.allowFrom`（切勿在个人 Mac 上运行面向开放世界的服务）。
- 为助手使用专用的 WhatsApp 号码。
- 心跳现在默认为每 30 分钟一次。通过设置 `agents.defaults.heartbeat.every: "0m"` 禁用，直到您信任该设置为止。

## 前提条件

- Node **22+**
- PATH 上可用 OpenClaw（建议：全局安装）
- 第二个电话号码（SIM/eSIM/预付费）用于助手

```bash
npm install -g openclaw@latest
# or: pnpm add -g openclaw@latest
```

从源代码（开发）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
pnpm link --global
```

## 双手机设置（推荐）

您需要这样的设置：

```
Your Phone (personal)          Second Phone (assistant)
┌─────────────────┐           ┌─────────────────┐
│  Your WhatsApp  │  ──────▶  │  Assistant WA   │
│  +1-555-YOU     │  message  │  +1-555-ASSIST  │
└─────────────────┘           └────────┬────────┘
                                       │ linked via QR
                                       ▼
                              ┌─────────────────┐
                              │  Your Mac       │
                              │  (openclaw)      │
                              │    Pi agent     │
                              └─────────────────┘
```

如果您将个人 WhatsApp 链接到 OpenClaw，每条发给您的消息都将成为"代理输入"。这很少是您想要的。

## 5 分钟快速开始

1. 配对 WhatsApp Web（显示二维码；使用助手手机扫描）：

```bash
openclaw channels login
```

2. 启动 Gateway（保持其运行）：

```bash
openclaw gateway --port 18789
```

3. 在 `~/.openclaw/openclaw.json` 中放置最小配置：

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

现在从您的白名单手机向助手号码发送消息。

当入职完成后，我们会自动打开仪表板并显示您的 gateway token 以及打印带令牌的链接。要稍后重新打开：`openclaw dashboard`。

## 为代理提供一个工作区（AGENTS）

OpenClaw 从其工作区目录读取操作指令和"记忆"。

默认情况下，OpenClaw 使用 `~/.openclaw/workspace` 作为代理工作区，并会在设置/首次代理运行时自动创建它（以及启动器 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`）。`BOOTSTRAP.md` 仅在工作区是全新时创建（删除后不应重新出现）。

提示：将此文件夹视为 OpenClaw 的"记忆"，并使其成为 git 仓库（理想情况下是私有的），以便您的 `AGENTS.md` + 记忆文件得到备份。如果安装了 git，全新工作区将自动初始化。

```bash
openclaw setup
```

完整工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)
记忆工作流：[Memory](/zh/concepts/memory)

可选：使用 `agents.defaults.workspace` 选择不同的工作区（支持 `~`）。

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

如果您已经从仓库提供自己的工作区文件，可以完全禁用引导文件创建：

```json5
{
  agent: {
    skipBootstrap: true,
  },
}
```

## 将其变成"助手"的配置

OpenClaw 默认为良好的助手设置，但您通常需要调整：

- `SOUL.md` 中的角色/指令
- 思考默认值（如果需要）
- 心跳（一旦您信任它）

示例：

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-5",
    workspace: "~/.openclaw/workspace",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // Start with 0; enable later.
    heartbeat: { every: "0m" },
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@openclaw", "openclaw"],
    },
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080,
    },
  },
}
```

## 会话和记忆

- 会话文件：`~/.openclaw/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- 会话元数据（令牌使用、最后路由等）：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（传统：`~/.openclaw/sessions/sessions.json`）
- `/new` 或 `/reset` 为该聊天启动一个新会话（可通过 `resetTriggers` 配置）。如果单独发送，代理会回复简短的问候以确认重置。
- `/compact [instructions]` 压缩会话上下文并报告剩余的上下文预算。

## 心跳（主动模式）

默认情况下，OpenClaw 每 30 分钟运行一次心跳，提示为：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
设置 `agents.defaults.heartbeat.every: "0m"` 以禁用。

- 如果 `HEARTBEAT.md` 存在但实际上为空（只有空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。
- 如果文件缺失，心跳仍会运行，模型决定做什么。
- 如果代理回复 `HEARTBEAT_OK`（可选带有短填充；参见 `agents.defaults.heartbeat.ackMaxChars`），OpenClaw 会抑制该心跳的出站传递。
- 心跳运行完整的代理轮次 — 较短的间隔会消耗更多令牌。

```json5
{
  agent: {
    heartbeat: { every: "30m" },
  },
}
```

## 媒体输入和输出

入站附件（图片/音频/文档）可以通过模板显示到您的命令：

- `{{MediaPath}}`（本地临时文件路径）
- `{{MediaUrl}}`（伪 URL）
- `{{Transcript}}`（如果启用了音频转录）

来自代理的出站附件：在单独一行中包含 `MEDIA:<path-or-url>`（无空格）。示例：

```
Here’s the screenshot.
MEDIA:https://example.com/screenshot.png
```

OpenClaw 提取这些并将它们作为媒体与文本一起发送。

## 运维清单

```bash
openclaw status          # local status (creds, sessions, queued events)
openclaw status --all    # full diagnosis (read-only, pasteable)
openclaw status --deep   # adds gateway health probes (Telegram + Discord)
openclaw health --json   # gateway health snapshot (WS)
```

日志位于 `/tmp/openclaw/`（默认：`openclaw-YYYY-MM-DD.log`）。

## 下一步

- WebChat：[WebChat](/zh/web/webchat)
- Gateway 运维：[Gateway runbook](/zh/gateway)
- Cron + 唤醒：[Cron jobs](/zh/automation/cron-jobs)
- macOS 菜单栏伴随应用：[OpenClaw macOS app](/zh/platforms/macos)
- iOS 节点应用：[iOS app](/zh/platforms/ios)
- Android 节点应用：[Android app](/zh/platforms/android)
- Windows 状态：[Windows (WSL2)](/zh/platforms/windows)
- Linux 状态：[Linux app](/zh/platforms/linux)
- 安全：[Security](/zh/gateway/security)
