---
summary: "通过 signal-cli (JSON-RPC + SSE) 支持 Signal、设置和号码模式"
read_when:
  - "Setting up Signal support"
  - "Debugging Signal send/receive"
title: "Signal"
---

# Signal (signal-cli)

状态：外部 CLI 集成。Gateway 通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 快速设置（初学者）

1. 为机器人使用**单独的 Signal 号码**（推荐）。
2. 安装 `signal-cli`（需要 Java）。
3. 链接机器人设备并启动守护进程：
   - `signal-cli link -n "OpenClaw"`
4. 配置 OpenClaw 并启动 gateway。

最小配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

## 是什么

- 通过 `signal-cli` 的 Signal 频道（不是嵌入式 libsignal）。
- 确定性路由：回复总是返回到 Signal。
- DM 共享代理的主会话；群组是隔离的（`agent:<agentId>:signal:group:<groupId>`）。

## 配置写入

默认情况下，允许 Signal 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

使用以下命令禁用：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 号码模式（重要）

- Gateway 连接到**Signal 设备**（`signal-cli` 账户）。
- 如果您在**个人 Signal 账户**上运行机器人，它将忽略您自己的消息（循环保护）。
- 对于"我给机器人发短信，它回复"，请使用**单独的机器人号码**。

## 设置（快速路径）

1. 安装 `signal-cli`（需要 Java）。
2. 链接机器人账户：
   - `signal-cli link -n "OpenClaw"` 然后在 Signal 中扫描 QR 码。
3. 配置 Signal 并启动 gateway。

示例：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

多账户支持：使用 `channels.signal.accounts` 配置每账户配置和可选的 `name`。有关共享模式，请参阅 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

## 外部守护进程模式 (httpUrl)

如果您想自己管理 `signal-cli`（JVM 冷启动慢、容器初始化或共享 CPU），请单独运行守护进程并将 OpenClaw 指向它：

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false,
    },
  },
}
```

这会跳过 OpenClaw 内部的自动生成和启动等待。对于自动生成时的缓慢启动，请设置 `channels.signal.startupTimeoutMs`。

## 访问控制（DM + 群组）

DM：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者收到配对码；消息将被忽略，直到被批准（配对码在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配对是 Signal DM 的默认令牌交换。详情：[Pairing](/zh/start/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）作为 `uuid:<id>` 存储在 `channels.signal.allowFrom` 中。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- 当设置 `allowlist` 时，`channels.signal.groupAllowFrom` 控制谁可以在群组中触发。

## 工作原理（行为）

- `signal-cli` 作为守护进程运行；gateway 通过 SSE 读取事件。
- 传入消息被规范化为共享频道信封。
- 回复总是路由回相同的号码或群组。

## 媒体 + 限制

- 出站文本被分块为 `channels.signal.textChunkLimit`（默认 4000）。
- 可选换行符分块：设置 `channels.signal.chunkMode="newline"` 以在长度分块之前按空行（段落边界）分割。
- 支持附件（从 `signal-cli` 获取的 base64）。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 跳过下载媒体。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设置 `0` 禁用（默认 50）。

## 输入指示 + 已读回执

- **输入指示**：OpenClaw 通过 `signal-cli sendTyping` 发送输入信号，并在回复运行时刷新它们。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 转发允许的 DM 的已读回执。
- Signal-cli 不暴露群组的已读回执。

## 反应（消息工具）

- 将 `message action=react` 与 `channel=signal` 一起使用。
- 目标：发送者 E.164 或 UUID（使用配对输出中的 `uuid:<id>`；仅 UUID 也可以）。
- `messageId` 是您要反应的消息的 Signal 时间戳。
- 群组反应需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`：启用/禁用反应操作（默认 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 禁用代理反应（消息工具 `react` 将出错）。
  - `minimal`/`extensive` 启用代理反应并设置指导级别。
- 每账户覆盖：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## Delivery targets (CLI/cron)

- DM：`signal:+15551234567`（或纯 E.164）。
- UUID DM：`uuid:<id>`（或纯 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果您的 Signal 账户支持）。

## 配置参考（Signal）

完整配置：[Configuration](/zh/gateway/configuration)

Provider 选项：

- `channels.signal.enabled`：启用/禁用频道启动。
- `channels.signal.account`：机器人账户的 E.164。
- `channels.signal.cliPath`：`signal-cli` 的路径。
- `channels.signal.httpUrl`：完整的守护进程 URL（覆盖 host/port）。
- `channels.signal.httpHost`、`channels.signal.httpPort`：守护进程绑定（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动生成守护进程（如果未设置 `httpUrl`，默认为 true）。
- `channels.signal.startupTimeoutMs`：启动等待超时（毫秒，上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略来自守护进程的 stories。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：配对）。
- `channels.signal.allowFrom`：DM 允许列表（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 没有用户名；使用电话/UUID id。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：允许列表）。
- `channels.signal.groupAllowFrom`：群组发送者允许列表。
- `channels.signal.historyLimit`：作为上下文包含的最大群组消息数（0 表示禁用）。
- `channels.signal.dmHistoryLimit`：DM 历史限制（用户轮次）。每用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站块大小（字符）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline` 以在长度分块之前按空行（段落边界）分割。
- `channels.signal.mediaMaxMb`：入站/出站媒体上限（MB）。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。
