---
summary: "作为个人助理运行 OpenClaw 的端到端指南（含安全注意事项）"
read_when:
  - 引导新的助理实例
  - 回顾安全/权限影响
---
# 用 OpenClaw 构建个人助理

OpenClaw 是一个 WhatsApp + Telegram + Discord + iMessage 的 **Pi** 代理网关。插件可添加 Mattermost。本指南是“个人助理”方案：一个专用的 WhatsApp 号码，行为像你的常驻助理。

## ⚠️ 安全优先

你正在让代理有能力：
- 在你的机器上运行命令（取决于你的 Pi 工具配置）
- 在你的工作区读写文件
- 通过 WhatsApp/Telegram/Discord/Mattermost（插件）向外发送消息

从保守开始：
- 始终设置 `channels.whatsapp.allowFrom`（不要在个人 Mac 上开放对外）。
- 为助理使用专用 WhatsApp 号码。
- 心跳默认每 30 分钟一次。设置 `agents.defaults.heartbeat.every: "0m"` 在信任前禁用。

## 前置条件

- Node **22+**
- PATH 中可用 OpenClaw（推荐全局安装）
- 一个用于助理的第二手机号（SIM/eSIM/预付）

```bash
npm install -g openclaw@latest
# 或：pnpm add -g openclaw@latest
```

从源码（开发）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
pnpm link --global
```

## 双手机方案（推荐）

你想要的是：

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

如果把个人 WhatsApp 连接到 OpenClaw，所有发给你的消息都会变成“代理输入”。这通常不是你想要的。

## 5 分钟快速开始

1) 连接 WhatsApp Web（显示二维码；用助理手机号扫码）：

```bash
openclaw channels login
```

2) 启动 Gateway（保持运行）：

```bash
openclaw gateway --port 18789
```

3) 在 `~/.openclaw/openclaw.json` 写入最小配置：

```json5
{
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

现在用 allowlist 的手机号给助理号码发消息。

引导完成后，我们会自动打开带 token 的 dashboard，并打印带 token 的链接。之后可用 `openclaw dashboard` 重新打开。

## 给代理一个工作区（AGENTS）

OpenClaw 从工作区目录读取运行指令与“记忆”。

默认使用 `~/.openclaw/workspace` 作为代理工作区，并会在 setup/首次运行时自动创建（含 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`）。`BOOTSTRAP.md` 只会在全新工作区创建（删除后不应再出现）。

提示：把这个文件夹当作 OpenClaw 的“记忆”，建议做成 git 仓库（最好私有），以便备份 `AGENTS.md` 和记忆文件。如果安装了 git，全新工作区会自动初始化。

```bash
openclaw setup
```

完整工作区结构 + 备份指南：[代理工作区](/zh/concepts/agent-workspace)
记忆流程：[记忆](/zh/concepts/memory)

可选：用 `agents.defaults.workspace` 选择其他工作区（支持 `~`）。

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace"
  }
}
```

如果你已有自己的工作区文件（来自仓库），可以完全禁用 bootstrap 文件创建：

```json5
{
  agent: {
    skipBootstrap: true
  }
}
```

## 把它变成“助理”的配置

OpenClaw 的默认配置已适合作为助理，但通常还需要调整：
- `SOUL.md` 中的人设/指令
- 思考强度默认值（如需要）
- 心跳频率（在你信任后）

示例：

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-5",
    workspace: "~/.openclaw/workspace",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // 从 0 开始；之后再启用。
    heartbeat: { every: "0m" }
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@openclaw", "openclaw"]
    }
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080
    }
  }
}
```

## 会话与记忆

- 会话文件：`~/.openclaw/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- 会话元数据（token 用量、上次路由等）：`~/.openclaw/agents/<agentId>/sessions/sessions.json`（旧路径：`~/.openclaw/sessions/sessions.json`）
- `/new` 或 `/reset` 会为该聊天开启新会话（由 `resetTriggers` 配置）。单独发送时，代理会用简短问候确认重置。
- `/compact [instructions]` 会压缩会话上下文并报告剩余上下文预算。

## 心跳（主动模式）

默认情况下，OpenClaw 每 30 分钟运行一次心跳，提示词为：
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
设置 `agents.defaults.heartbeat.every: "0m"` 可禁用。

- 如果 `HEARTBEAT.md` 存在但基本为空（只有空行和诸如 `# Heading` 的标题），OpenClaw 会跳过心跳以节省 API 调用。
- 如果文件不存在，心跳仍会运行，由模型决定如何处理。
- 如果代理回复 `HEARTBEAT_OK`（可选短填充；见 `agents.defaults.heartbeat.ackMaxChars`），OpenClaw 会抑制该次心跳的外发。
- 心跳会运行完整的代理回合 — 间隔越短耗费越多 token。

```json5
{
  agent: {
    heartbeat: { every: "30m" }
  }
}
```

## 媒体收发

入站附件（图片/音频/文档）可通过模板字段传递到你的命令：
- `{{MediaPath}}`（本地临时文件路径）
- `{{MediaUrl}}`（伪 URL）
- `{{Transcript}}`（启用音频转写时）

代理输出附件：在单独一行包含 `MEDIA:<path-or-url>`（无空格）。示例：

```
Here’s the screenshot.
MEDIA:/tmp/screenshot.png
```

OpenClaw 会提取它并作为媒体随文本发送。

## 运维检查清单

```bash
openclaw status          # 本地状态（凭据、会话、队列事件）
openclaw status --all    # 全量诊断（只读、可粘贴）
openclaw status --deep   # 增加网关健康探测（Telegram + Discord）
openclaw health --json   # 网关健康快照（WS）
```

日志位于 `/tmp/openclaw/`（默认：`openclaw-YYYY-MM-DD.log`）。

## 下一步

- WebChat：[WebChat](/zh/web/webchat)
- 网关运维：[Gateway 运行手册](/zh/gateway)
- Cron + 唤醒：[Cron jobs](/zh/automation/cron-jobs)
- macOS 菜单栏伴侣：[OpenClaw macOS 应用](/zh/platforms/macos)
- iOS 节点应用：[iOS 应用](/zh/platforms/ios)
- Android 节点应用：[Android 应用](/zh/platforms/android)
- Windows 状态：[Windows（WSL2）](/zh/platforms/windows)
- Linux 状态：[Linux 应用](/zh/platforms/linux)
- 安全：[安全](/zh/gateway/security)
