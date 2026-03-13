---
summary: “通过 signal-cli (JSON-RPC + SSE) 提供 Signal 支持、设置路径以及号码模型”
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: “Signal”
---

# Signal (signal-cli)

状态：外部 CLI 集成。网关通过 HTTP JSON-RPC + SSE 与 `signal-cli` 通信。

## 先决条件

- 您的服务器上安装了 OpenClaw（以下 Linux 流程在 Ubuntu 24 上测试）。
- 运行网关的主机上可用 `signal-cli`。
- 一个可以接收一条验证短信的电话号码（用于 SMS 注册路径）。
- 注册期间可通过浏览器访问 Signal 验证码 (`signalcaptchas.org`)。

## 快速设置（初学者）

1. 为机器人使用一个**单独的 Signal 号码**（推荐）。
2. 安装 `signal-cli`（如果您使用 JVM 构建，则需要 Java）。
3. 选择一种设置路径：
   - **路径 A（QR 链接）：** `signal-cli link -n "OpenClaw"` 并使用 Signal 扫描。
   - **路径 B（SMS 注册）：** 使用验证码 + SMS 验证注册专用号码。
4. 配置 OpenClaw 并重启网关。
5. 发送第一条私信并批准配对 (`openclaw pairing approve signal <CODE>`)。

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

字段参考：

| 字段       | 描述                                       |
| ----------- | ------------------------------------------------- |
| `account`   | E.164 格式的机器人电话号码 (`+15551234567`) |
| `cliPath`   | `signal-cli` 的路径（如果在 `PATH` 上则为 `signal-cli`）  |
| `dmPolicy`  | 私信访问策略（推荐 `pairing`）          |
| `allowFrom` | 允许发送私信的电话号码或 `uuid:<id>` 值 |

## 简介

- 通过 `signal-cli` 的 Signal 通道（非嵌入式 libsignal）。
- 确定性路由：回复始终发回 Signal。
- 私信共享代理的主会话；群组是隔离的 (`agent:<agentId>:signal:group:<groupId>`)。

## 配置写入

默认情况下，允许 Signal 写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方法：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 号码模型（重要）

- 网关连接到一个 **Signal 设备**（即 `signal-cli` 账户）。
- 如果你在**你的个人 Signal 账户**上运行机器人，它将忽略你自己的消息（循环保护）。
- 对于“我给机器人发消息，它回复”的情况，请使用一个**单独的机器人号码**。

## 设置路径 A：链接现有 Signal 账户 (QR)

1. 安装 `signal-cli` (JVM 或原生构建)。
2. 链接机器人账户：
   - `signal-cli link -n "OpenClaw"` 然后在 Signal 中扫描二维码。
3. 配置 Signal 并启动网关。

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

多账户支持：使用 `channels.signal.accounts` 配置针对每个账户的设置和可选的 `name`。有关通用模式，请参阅 [`gateway/configuration`](/zh/en/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

## 设置路径 B：注册专用机器人号码 (SMS, Linux)

当你想要一个专用的机器人号码而不是链接现有的 Signal 应用账户时使用此方法。

1. 获取一个可以接收短信（或用于固定电话的语音验证）的号码。
   - 使用专用的机器人号码以避免账户/会话冲突。
2. 在网关主机上安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果你使用 JVM 构建版本 (`signal-cli-${VERSION}.tar.gz`)，请先安装 JRE 25+。
保持 `signal-cli` 更新；上游指出旧版本可能会随着 Signal 服务器 API 的更改而损坏。

3. 注册并验证号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要验证码：

1. 打开 `https://signalcaptchas.org/registration/generate.html`。
2. 完成验证码，从“Open Signal”中复制 `signalcaptcha://...` 链接目标。
3. 如果可能，请从与浏览器会话相同的外部 IP 运行。
4. 立即再次运行注册（验证码令牌很快过期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 配置 OpenClaw，重启网关，验证通道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配对你的私聊发送者：
   - 向机器人号码发送任意消息。
   - 在服务器上批准代码：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 将机器人号码作为联系人保存在你的手机上，以避免显示“未知联系人”。

重要提示：使用 `signal-cli` 注册电话号码账户可能会取消该号码的主 Signal 应用会话的验证。首选专用的机器人号码，或者如果需要保留现有的手机应用设置，请使用二维码链接模式。

上游参考：

- `signal-cli` README: `https://github.com/AsamK/signal-cli`
- 验证码流程: `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 链接流程: `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守护进程模式 (httpUrl)

如果您想自行管理 `signal-cli`（由于 JVM 冷启动缓慢、容器初始化或共享 CPU），请单独运行守护进程并将 OpenClaw 指向它：

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

这将跳过 OpenClaw 内部的自动生成和启动等待。对于自动生成时的缓慢启动，请设置 `channels.signal.startupTimeoutMs`。

## 访问控制（私信 + 群组）

私信：

- 默认值：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；消息在被批准之前将被忽略（配对码 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配对是 Signal 私信默认的令牌交换方式。详情：[配对](/zh/channels/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）被存储为 `uuid:<id>` 在 `channels.signal.allowFrom` 中。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- 当设置了 `allowlist` 时，`channels.signal.groupAllowFrom` 控制谁可以在群组中触发。
- 运行时注意：如果 `channels.signal` 完全缺失，运行时将回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

## 工作原理（行为）

- `signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 传入的消息被标准化为共享通道信封。
- 回复总是路由回相同的号码或群组。

## 媒体 + 限制

- 出站文本被分块为 `channels.signal.textChunkLimit`（默认 4000）。
- 可选换行分块：设置 `channels.signal.chunkMode="newline"` 以在按长度分块之前按空行（段落边界）分割。
- 支持附件（从 `signal-cli` 获取 base64）。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 跳过下载媒体。
- 群组历史上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认 50）。

## 正在输入 + 已读回执

- **正在输入指示器**：OpenClaw 通过 `signal-cli sendTyping` 发送正在输入信号，并在回复运行时刷新它们。
- **已读回执**：当 `channels.signal.sendReadReceipts` 为 true 时，OpenClaw 会转发允许的私信（DM）的已读回执。
- Signal-cli 不会公开群组的已读回执。

## 回应反应（消息工具）

- 将 `message action=react` 与 `channel=signal` 结合使用。
- 目标：发送者 E.164 或 UUID（使用配对输出中的 `uuid:<id>`；仅使用 UUID 也可以）。
- `messageId` 是您要回应的消息的 Signal 时间戳。
- 群组回应需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`：启用/禁用回应操作（默认为 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 禁用代理回应（消息工具 `react` 将报错）。
  - `minimal`/`extensive` 启用代理回应并设置指导级别。
- 每个账户的覆盖设置：`channels.signal.accounts.<id>.actions.reactions`，`channels.signal.accounts.<id>.reactionLevel`。

## 投递目标（CLI/cron）

- 私信：`signal:+15551234567`（或纯 E.164 号码）。
- UUID 私信：`uuid:<id>`（或仅 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果您的 Signal 账户支持）。

## 故障排除

首先运行此排查步骤：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后根据需要确认私信配对状态：

```bash
openclaw pairing list signal
```

常见故障：

- 守护进程可达但无回复：验证账户/守护进程设置（`httpUrl`，`account`）和接收模式。
- 私信被忽略：发送者待配对批准。
- 群组消息被忽略：群组发送者/提及筛选阻止了投递。
- 编辑后出现配置验证错误：运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：确认 `channels.signal.enabled: true`。

额外检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

有关排查流程：[/channels/troubleshooting](/zh/en/channels/troubleshooting)。

## 安全说明

- `signal-cli` 在本地存储账户密钥（通常位于 `~/.local/share/signal-cli/data/`）。
- 在服务器迁移或重建之前备份 Signal 账户状态。
- 保留 `channels.signal.dmPolicy: "pairing"`，除非您明确希望更广泛地访问私信。
- 短信验证仅在注册或恢复流程时需要，但失去对号码/账户的控制可能会使重新注册变得复杂。

## 配置参考 (Signal)

完整配置：[Configuration](/zh/en/gateway/configuration)

提供商选项：

- `channels.signal.enabled`：启用/禁用通道启动。
- `channels.signal.account`：机器人帐户的 E.164 号码。
- `channels.signal.cliPath`：`signal-cli` 的路径。
- `channels.signal.httpUrl`：完整的守护程序 URL（覆盖主机/端口）。
- `channels.signal.httpHost`、`channels.signal.httpPort`：守护程序绑定（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动生成守护程序（如果未设置 `httpUrl`，则默认为 true）。
- `channels.signal.startupTimeoutMs`：启动等待超时（毫秒，上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略来自守护程序的故事（动态）。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：私信允许列表（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 没有用户名；请使用电话号码/UUID ID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`：群组发送者允许列表。
- `channels.signal.historyLimit`：作为上下文包含的最大群组消息数（0 表示禁用）。
- `channels.signal.dmHistoryLimit`：私信历史记录限制（以用户轮次为单位）。每位用户的覆盖设置：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站块大小（字符）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline` 在长度分块前按空行（段落边界）分割。
- `channels.signal.mediaMaxMb`：入站/出站媒体上限（MB）。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。

import zh from '/components/footer/zh.mdx';

<zh />
