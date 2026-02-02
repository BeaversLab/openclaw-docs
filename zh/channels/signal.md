---
summary: "通过 signal-cli 支持 Signal（JSON-RPC + SSE）、设置与号码模型"
read_when:
  - 设置 Signal 支持
  - 调试 Signal 收发
title: "Signal（signal-cli）"
---
# Signal（signal-cli）


状态：外部 CLI 集成。Gateway 通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 快速设置（新手）
1) 使用**独立的 Signal 号码**作为 bot（推荐）。
2) 安装 `signal-cli`（需要 Java）。
3) 关联 bot 设备并启动守护进程：
   - `signal-cli link -n "OpenClaw"`
4) 配置 OpenClaw 并启动 gateway。

最小配置：
```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

## 这是什么
- 通过 `signal-cli` 的 Signal 渠道（非嵌入式 libsignal）。
- 路由确定性：回复始终回到 Signal。
- 私聊共享 agent 主会话；群聊隔离为 `agent:<agentId>:signal:group:<groupId>`。

## 配置写入
默认允许 Signal 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：
```json5
{
  channels: { signal: { configWrites: false } }
}
```

## 号码模型（重要）
- gateway 连接到**Signal 设备**（`signal-cli` 账号）。
- 若你在**个人 Signal 账号**上运行 bot，它会忽略你自己的消息（防循环）。
- 若希望“我发消息，bot 回复”，请使用**独立的 bot 号码**。

## 设置（快捷路径）
1) 安装 `signal-cli`（需要 Java）。
2) 关联 bot 账号：
   - `signal-cli link -n "OpenClaw"`，然后用 Signal 扫码。
3) 配置 Signal 并启动 gateway。

示例：
```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"]
    }
  }
}
```

多账号支持：使用 `channels.signal.accounts` 配置各账号并可选 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 的通用模式。

## 外部守护进程模式（httpUrl）
如果你想自行管理 `signal-cli`（JVM 冷启动慢、容器初始化或共享 CPU），可单独运行守护进程并让 OpenClaw 连接：

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false
    }
  }
}
```

这样会跳过 OpenClaw 的自动启动与等待。若自动启动较慢，设置 `channels.signal.startupTimeoutMs`。

## 访问控制（私聊 + 群聊）
私聊：
- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时过期）。
- 批准命令：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配对是 Signal 私聊的默认 token 交换机制。详情见 [Pairing](/zh/start/pairing)
- 仅 UUID 发送者（来自 `sourceUuid`）会以 `uuid:<id>` 存入 `channels.signal.allowFrom`。

群聊：
- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 在 `allowlist` 时控制哪些人可触发。

## 工作方式（行为）
- `signal-cli` 作为守护进程运行；gateway 通过 SSE 读取事件。
- 入站消息会被规范化到共享渠道 envelope。
- 回复总是回到相同号码或群组。

## 媒体 + 限制
- 出站文本按 `channels.signal.textChunkLimit` 分块（默认 4000）。
- 可选按段落分块：设置 `channels.signal.chunkMode="newline"`，先按空行分段再分块。
- 支持附件（从 `signal-cli` 获取 base64）。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 跳过下载媒体。
- 群聊历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设为 `0` 禁用（默认 50）。

## 输入中 + 已读回执
- **输入中指示**：OpenClaw 通过 `signal-cli sendTyping` 发送 typing，并在回复过程中刷新。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会为允许的私聊转发已读回执。
- signal-cli 不提供群聊已读回执。

## Reactions（message 工具）
- 使用 `message action=react` 且 `channel=signal`。
- 目标：发送者 E.164 或 UUID（使用配对输出中的 `uuid:<id>`；裸 UUID 也可）。
- `messageId` 是你要反应的 Signal 消息时间戳。
- 群聊 reactions 需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：
```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：
- `channels.signal.actions.reactions`：启用/禁用 reaction 动作（默认 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 禁用 agent reactions（message 工具 `react` 会报错）。
  - `minimal`/`extensive` 启用 agent reactions 并设置指导级别。
- 按账号覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 投递目标（CLI/cron）
- 私聊：`signal:+15551234567`（或直接 E.164）。
- UUID 私聊：`uuid:<id>`（或裸 UUID）。
- 群聊：`signal:group:<groupId>`。
- 用户名：`username:<name>`（若 Signal 账号支持）。

## 配置参考（Signal）
完整配置见：[Configuration](/zh/gateway/configuration)

Provider 选项：
- `channels.signal.enabled`：启用/禁用渠道启动。
- `channels.signal.account`：bot 账号的 E.164。
- `channels.signal.cliPath`：`signal-cli` 路径。
- `channels.signal.httpUrl`：完整守护进程 URL（覆盖 host/port）。
- `channels.signal.httpHost`、`channels.signal.httpPort`：守护进程绑定（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动拉起守护进程（`httpUrl` 未设置时默认 true）。
- `channels.signal.startupTimeoutMs`：启动等待超时（ms，上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略 stories。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：DM allowlist（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 无用户名；使用手机号/UUID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`：群聊发送者 allowlist。
- `channels.signal.historyLimit`：作为上下文包含的最大群消息数（0 禁用）。
- `channels.signal.dmHistoryLimit`：私聊历史上限（用户 turn）。每用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站分块大小（字符）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline`（按空行分段再分块）。
- `channels.signal.mediaMaxMb`：入站/出站媒体上限（MB）。

相关全局选项：
- `agents.list[].groupChat.mentionPatterns`（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。
