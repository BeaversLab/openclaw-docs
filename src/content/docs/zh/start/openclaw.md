---
summary: "运行 OpenClaw 作为个人助理的端到端指南，包含安全注意事项"
read_when:
  - Onboarding a new assistant instance
  - Reviewing safety/permission implications
title: "个人助理设置"
---

# 使用 OpenClaw 构建个人助手

OpenClaw 是一个自托管网关，用于将 WhatsApp、Telegram、Discord、iMessage 等连接到 AI 代理。本指南介绍“个人助手”设置：一个专用的 WhatsApp 号码，其行为类似于您的全天候 AI 助手。

## ⚠️ 安全第一

您正在将智能体置于可以：

- 在您的机器上运行命令（取决于您的工具策略）
- 在您的工作区中读取/写入文件
- 通过 WhatsApp/Telegram/Discord/Mattermost（插件）发回消息

开始时保持保守：

- 始终设置 `channels.whatsapp.allowFrom`（切勿在您的个人 Mac 上运行面向开放世界的服务）。
- 为助手使用专用的 WhatsApp 号码。
- 心跳现在默认为每 30 分钟一次。通过设置 `agents.defaults.heartbeat.every: "0m"` 禁用它，直到您信任此设置为止。

## 先决条件

- 已安装并完成 OpenClaw 入门设置 — 如果尚未完成，请参阅[入门指南](/zh/start/getting-started)
- 用于助手的第二个电话号码（SIM/eSIM/预付费）

## 双手机设置（推荐）

您希望这样：

```mermaid
flowchart TB
    A["<b>Your Phone (personal)<br></b><br>Your WhatsApp<br>+1-555-YOU"] -- message --> B["<b>Second Phone (assistant)<br></b><br>Assistant WA<br>+1-555-ASSIST"]
    B -- linked via QR --> C["<b>Your Mac (openclaw)<br></b><br>AI agent"]
```

如果您将个人 WhatsApp 链接到 OpenClaw，每条发给您的消息都会变成“智能体输入”。这通常不是您想要的。

## 5分钟快速入门

1. 配对 WhatsApp Web（显示二维码；使用助手手机扫描）：

```bash
openclaw channels login
```

2. 启动 Gateway 网关（保持其运行）：

```bash
openclaw gateway --port 18789
```

3. 将最小配置放入 `~/.openclaw/openclaw.json`：

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

现在从您的白名单手机向助手号码发送消息。

入职完成后，我们会自动打开仪表板并打印一个干净的（非令牌化的）链接。如果提示进行身份验证，请将 `gateway.auth.token` 中的令牌粘贴到 Control UI 设置中。如需稍后重新打开：`openclaw dashboard`。

## 给智能体一个工作区 (AGENTS)

OpenClaw 从其工作区目录读取操作指令和“记忆”。

默认情况下，OpenClaw 使用 `~/.openclaw/workspace` 作为代理工作区，并会在设置/首次代理运行时自动创建它（以及初始的 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`）。`BOOTSTRAP.md` 仅在工作区是全新时创建（删除后不应再出现）。`MEMORY.md` 是可选的（不会自动创建）；如果存在，它会在正常会话中加载。子代理会话仅注入 `AGENTS.md` 和 `TOOLS.md`。

提示：将此文件夹视为 OpenClaw 的“记忆”并将其设为 git 仓库（最好是私有的），以便您的 `AGENTS.md` + 记忆文件得到备份。如果安装了 git，全新的工作区将自动初始化。

```bash
openclaw setup
```

完整的工作区布局 + 备份指南：[Agent 工作区](/zh/concepts/agent-workspace)
记忆工作流：[Memory](/zh/concepts/memory)

可选：使用 `agents.defaults.workspace` 选择不同的工作区（支持 `~`）。

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

如果您已经从仓库部署了自己的工作区文件，则可以完全禁用引导文件的创建：

```json5
{
  agent: {
    skipBootstrap: true,
  },
}
```

## 将其转化为“助手”的配置

OpenClaw 默认使用良好的助手设置，但您通常需要调整：

- `SOUL.md` 中的 persona/instructions
- thinking 默认值（如果需要）
- heartbeats（一旦您信任它）

示例：

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-6",
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
- 会话元数据（令牌使用情况、最后路由等）：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（旧版：`~/.openclaw/sessions/sessions.json`）
- `/new` 或 `/reset` 为该聊天开启一个新会话（可通过 `resetTriggers` 配置）。如果单独发送，代理会回复一句简短的问候以确认重置。
- `/compact [instructions]` 压缩会话上下文并报告剩余的上下文预算。

## Heartbeats（主动模式）

默认情况下，OpenClaw 每 30 分钟运行一次心跳，提示为：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
设置 `agents.defaults.heartbeat.every: "0m"` 以禁用。

- 如果 `HEARTBEAT.md` 存在但实际上为空（仅包含空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过该次心跳运行以节省 API 调用。
- 如果文件丢失，心跳仍会运行，模型会决定做什么。
- 如果代理回复 `HEARTBEAT_OK`（可选带有短填充；请参阅 `agents.defaults.heartbeat.ackMaxChars`），OpenClaw 将阻止该次心跳的出站传递。
- 默认情况下，允许向 私信 风格的 `user:<id>` 目标传递心跳。设置 `agents.defaults.heartbeat.directPolicy: "block"` 以在保持心跳运行处于活动状态的同时，阻止直接目标的传递。
- 心跳运行完整的代理回合——间隔越短，消耗的 token 越多。

```json5
{
  agent: {
    heartbeat: { every: "30m" },
  },
}
```

## 媒体输入和输出

入站附件（图像/音频/文档）可以通过模板展示给您的命令：

- `{{MediaPath}}` (本地临时文件路径)
- `{{MediaUrl}}` (伪 URL)
- `{{Transcript}}` (如果启用了音频转录)

来自代理的出站附件：在单独的一行中包含 `MEDIA:<path-or-url>`（无空格）。示例：

```
Here’s the screenshot.
MEDIA:https://example.com/screenshot.png
```

OpenClaw 提取这些内容，并将它们作为媒体与文本一起发送。

对于本地路径，默认的允许列表故意设置得很窄：OpenClaw 临时根目录、媒体缓存、代理工作区路径以及沙盒生成的文件。如果您需要更广泛的本地文件附件根目录，请配置明确的渠道/插件允许列表，而不是依赖任意的主机路径。

## 操作检查清单

```bash
openclaw status          # local status (creds, sessions, queued events)
openclaw status --all    # full diagnosis (read-only, pasteable)
openclaw status --deep   # adds gateway health probes (Telegram + Discord)
openclaw health --json   # gateway health snapshot (WS)
```

日志位于 `/tmp/openclaw/` 下（默认：`openclaw-YYYY-MM-DD.log`）。

## 后续步骤

- WebChat：[WebChat](/zh/web/webchat)
- Gateway(网关) 操作：[Gateway(网关) 运维手册](/zh/gateway)
- Cron + 唤醒：[Cron 作业](/zh/automation/cron-jobs)
- macOS 菜单栏伴侣：[OpenClaw macOS 应用](/zh/platforms/macos)
- iOS 节点应用：[iOS 应用](/zh/platforms/ios)
- Android 节点应用：[Android 应用](/zh/platforms/android)
- Windows 状态：[Windows (WSL2)](/zh/platforms/windows)
- Linux 状态：[Linux 应用](/zh/platforms/linux)
- 安全性：[Security](/zh/gateway/security)
