---
summary: "Signal通过 signal-cli（原生守护进程或 bbernhard 容器）支持 Signal，设置路径以及号码模型"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "SignalSignal"
---

状态：外部 CLI 集成。Gateway(网关) 通过 HTTP 与 CLIGateway(网关)`signal-cli`RPC 通信 — 无论是原生守护进程（JSON-RPC + SSE）还是 bbernhard/signal-cli-rest-api 容器（REST + WebSocket）。

## 先决条件

- 服务器上已安装 OpenClaw（以下 Linux 流程在 Ubuntu 24 上测试）。
- 以下之一：
  - 主机上可用的 `signal-cli`（原生模式），**或**
  - `bbernhard/signal-cli-rest-api`Docker Docker 容器（容器模式）。
- 一个可以接收一条验证短信的电话号码（用于 SMS 注册路径）。
- 注册期间用于 Signal 验证码（Signal`signalcaptchas.org`）的浏览器访问权限。

## 快速设置（初学者）

1. 为机器人使用**独立的 Signal 号码**（推荐）。
2. 安装 `signal-cli`（如果使用 JVM 构建版本则需要 Java）。
3. 选择一条设置路径：
   - **路径 A（QR 链接）：** `signal-cli link -n "OpenClaw"`Signal 并使用 Signal 扫描。
   - **路径 B（SMS 注册）：** 注册一个专用号码，需通过验证码 + SMS 验证。
4. 配置 OpenClaw 并重启 Gateway(网关)。
5. 发送第一条私信并批准配对（`openclaw pairing approve signal <CODE>`）。

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

| 字段         | 描述                                                     |
| ------------ | -------------------------------------------------------- |
| `account`    | E.164 格式的机器人电话号码（`+15551234567`）             |
| `cliPath`    | `signal-cli` 的路径（如果在 `PATH` 上则为 `signal-cli`） |
| `configPath` | 作为 `--config` 传递的 signal-cli 配置目录               |
| `dmPolicy`   | 私信访问策略（推荐 `pairing`）                           |
| `allowFrom`  | 允许发送私信的电话号码或 `uuid:<id>` 值                  |

## 什么是 Signal

- 通过 Signal`signal-cli` 实现的 Signal 渠道（非嵌入式 libsignal）。
- 确定性路由：回复始终会发回 Signal。
- 私信共享代理的主会话；群组是隔离的（`agent:<agentId>:signal:group:<groupId>`）。

## 配置写入

默认情况下，允许 Signal 写入由 Signal`/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用方法：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 号码模型（重要）

- 网关连接到一个 **Signal 设备**（即 `signal-cli` 账号）。
- 如果您在**您的个人 Signal 账号**上运行机器人，它将忽略您自己的消息（循环保护）。
- 对于“我给机器人发消息并收到回复”，请使用**单独的机器人号码**。

## 设置路径 A：链接现有 Signal 账号（二维码）

1. 安装 `signal-cli`（JVM 或原生构建）。
2. 链接机器人账号：
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

多账号支持：使用带有每账号配置的 `channels.signal.accounts` 和可选的 `name`。有关共享模式，请参阅 [`gateway/configuration`](/zh/gateway/config-channels#multi-account-all-channels)。

## 设置路径 B：注册专用机器人号码（短信，Linux）

当您想要一个专用的机器人号码而不是链接现有的 Signal 应用帐户时，请使用此选项。

1. 获取一个可以接收短信（或座机语音验证）的号码。
   - 使用专用的机器人号码以避免帐户/会话冲突。
2. 在网关主机上安装 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本（`signal-cli-${VERSION}.tar.gz`），请先安装 JRE 25+。
保持 `signal-cli` 更新；上游指出，当 Signal 服务器 API 发生变化时，旧版本可能会损坏。

3. 注册并验证号码：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要验证码：

1. 打开 `https://signalcaptchas.org/registration/generate.html`。
2. 完成验证码，从“打开 Signal”中复制 `signalcaptcha://...` 链接目标。
3. 如果可能，请从与浏览器会话相同的外部 IP 运行。
4. 立即再次运行注册（验证码令牌很快过期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 配置 OpenClaw，重启网关，验证渠道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配对您的私信发送方：
   - 向机器人号码发送任意消息。
   - 在服务器上批准代码：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 将机器人号码保存为手机上的联系人，以避免显示“未知联系人”。

<Warning>使用 `signal-cli` 注册电话号码帐户可能会取消该号码的主要 Signal 应用会话的身份验证。建议使用专用的机器人号码，或者如果您需要保留现有的手机应用设置，请使用二维码链接模式。</Warning>

上游参考：

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 验证码流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 链接流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守护进程模式

如果您想自己管理 `signal-cli`（JVM 冷启动缓慢、容器初始化或共享 CPU），请单独运行守护进程并将 OpenClaw 指向它：

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

这将跳过 OpenClaw 内部的自动生成和启动等待。如果自动生成时启动缓慢，请设置 `channels.signal.startupTimeoutMs`。

## 容器模式 (bbernhard/signal-cli-rest-api)

除了原生运行 `signal-cli`，您还可以使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器。它将 `signal-cli` 封装在 REST API 和 WebSocket 接口之后。

要求：

- 容器 **必须** 使用 `MODE=json-rpc` 运行，以便实时接收消息。
- 在连接 OpenClaw 之前，请在容器内注册或链接您的 Signal 账户。

示例 `docker-compose.yml` 服务：

```yaml
signal-cli:
  image: bbernhard/signal-cli-rest-api:latest
  environment:
    MODE: json-rpc
  ports:
    - "8080:8080"
  volumes:
    - signal-cli-data:/home/.local/share/signal-cli
```

OpenClaw 配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      httpUrl: "http://signal-cli:8080",
      autoStart: false,
      apiMode: "container", // or "auto" to detect automatically
    },
  },
}
```

`apiMode`OpenClaw 字段控制 OpenClaw 使用的协议：

| 值            | 行为                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| `"auto"`      | （默认）探测两种传输方式；流式传输验证容器 WebSocket 接收                                     |
| `"native"`    | 强制使用原生 signal-cli（位于 RPC`/api/v1/rpc` 的 JSON-RPC，位于 `/api/v1/events` 的 SSE）    |
| `"container"` | 强制使用 bbernhard 容器（位于 `/v2/send` 的 REST，位于 `/v1/receive/{account}` 的 WebSocket） |

当 `apiMode` 为 `"auto"`OpenClaw 时，OpenClaw 会将检测到的模式缓存 30 秒，以避免重复探测。只有在 `/v1/receive/{account}` 升级到 WebSocket 后，才会选择容器接收进行流式传输，这需要 `MODE=json-rpc`。

容器模式支持与原生模式相同的 Signal 渠道操作，前提是容器暴露了匹配的 API：发送、接收、附件、输入指示器、已读/已查看回执、反应、群组和样式文本。OpenClaw 将其原生的 Signal RPC 调用转换为容器的 REST 载荷，包括用于群组 ID 的 SignalOpenClawSignalRPC`group.{base64(internal_id)}` 和用于格式化文本的 `text_mode: "styled"`。

操作说明：

- 在容器模式下使用 `autoStart: false`。当选择 `apiMode: "container"` 时，OpenClaw 不应启动原生守护进程。
- 使用 `MODE=json-rpc` 进行接收。`MODE=normal` 可以使 `/v1/about` 看起来健康，但 `/v1/receive/{account}` 不会进行 WebSocket 升级，因此 OpenClaw 不会在 `auto` 模式下选择容器接收流。
- 当您知道 `httpUrl` 指向 bbernhard 的 REST API 时，设置 `apiMode: "container"`。当您知道它指向原生 `signal-cli` JSON-RPC/SSE 时，设置 `apiMode: "native"`。当部署可能变化时，使用 `"auto"`。
- 容器附件下载遵循与原生模式相同的媒体字节限制。当服务器发送 `Content-Length` 时，过大的响应会在完全缓冲之前被拒绝，否则在流式传输期间被拒绝。

## 访问控制（私信 + 群组）

私信：

- 默认：`channels.signal.dmPolicy = "pairing"`。
- 未知发送者会收到配对码；在批准之前消息将被忽略（代码将在 1 小时后过期）。
- 通过以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配对是 Signal 私信的默认令牌交换方式。详情：[配对](/zh/channels/pairing)
- 仅 UUID 的发送者（来自 `sourceUuid`）在 `channels.signal.allowFrom` 中存储为 `uuid:<id>`。

群组：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制当设置 `allowlist` 时哪些群组或发送者可以触发群组回复；条目可以是 Signal 群组 ID（原始、`group:<id>` 或 `signal:group:<id>`）、发送者电话号码、`uuid:<id>` 值或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 覆盖群组行为。
- 在多账户设置中，使用 `channels.signal.accounts.<id>.groups` 进行每个账户的覆盖。
- 通过 `groupAllowFrom` 将 Signal 群组加入白名单本身不会禁用提及限制。除非设置了 `requireMention=true`，否则专门配置的 `channels.signal.groups["<group-id>"]` 条目将处理每条群组消息。
- 运行时注意：如果完全缺少 `channels.signal`，运行时将回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

## 工作原理（行为）

- 原生模式：`signal-cli` 作为守护进程运行；网关通过 SSE 读取事件。
- 容器模式：网关通过 REST API 发送并通过 WebSocket 接收。
- 入站消息被规范化为共享渠道信封。
- 回复总是路由回相同的号码或群组。

## 媒体 + 限制

- 出站文本被分块为 `channels.signal.textChunkLimit`（默认 4000）。
- 可选换行分块：设置 `channels.signal.chunkMode="newline"` 以在按长度分块之前按空行（段落边界）进行拆分。
- 支持附件（从 `signal-cli` 获取 base64）。
- 语音笔记附件在缺少 `contentType` 时，使用 `signal-cli` 文件名作为 MIME 回退，以便音频转录仍然可以分类 AAC 语音备忘录。
- 默认媒体上限：`channels.signal.mediaMaxMb`（默认 8）。
- 使用 `channels.signal.ignoreAttachments` 跳过下载媒体。
- 群组历史记录上下文使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用（默认 50）。

## 正在输入 + 已读回执

- **正在输入指示器**：OpenClaw 通过 OpenClaw`signal-cli sendTyping` 发送正在输入的信号，并在回复运行时刷新它们。
- **已读回执**：当 `channels.signal.sendReadReceipts`OpenClaw 为 true 时，OpenClaw 会转发允许的私信的已读回执。
- Signal-cli 不会公开群组的已读回执。

## 表情回应（消息工具）

- 将 `message action=react` 与 `channel=signal` 结合使用。
- 目标：发送者的 E.164 或 UUID（使用配对输出中的 `uuid:<id>`；单独的 UUID 也可以）。
- `messageId`Signal 是您正在做出回应的消息的 Signal 时间戳。
- 群组表情回应需要 `targetAuthor` 或 `targetAuthorUuid`。

示例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

配置：

- `channels.signal.actions.reactions`: 启用/禁用回应操作（默认为 true）。
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`。
  - `off`/`ack` 禁用代理回应（消息工具 `react` 将报错）。
  - `minimal`/`extensive` 启用代理回应并设置指导级别。
- 按账户覆盖：`channels.signal.accounts.<id>.actions.reactions`，`channels.signal.accounts.<id>.reactionLevel`。

## 审批反应

Signal 执行和插件审批提示使用顶级的 `approvals.exec` 和
`approvals.plugin` 路由块。Signal 没有
`channels.signal.execApprovals` 块。

- `👍` 批准一次。
- `👎` 拒绝。
- 当请求提供持久审批时，请使用 `/approve <id> allow-always`。

审批反应解析需要来自
`channels.signal.allowFrom`、`channels.signal.defaultTo` 或匹配的账号级别字段的明确 Signal 审批人。
直接的同频执行审批提示仍可在没有明确审批人的情况下抑制重复的本地 `/approve` 回退；
无审批人的群组审批则保持本地回退可见。

## 投递目标 (CLI/cron)

- 私信：`signal:+15551234567`（或纯 E.164 号码）。
- UUID 私信：`uuid:<id>`（或裸 UUID）。
- 群组：`signal:group:<groupId>`。
- 用户名：`username:<name>`（如果您的 Signal 账号支持）。

## 故障排查

首先运行此阶梯检查：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后如有需要，确认私信配对状态：

```bash
openclaw pairing list signal
```

常见故障：

- 守护进程可达但无回复：请验证账号/守护进程设置（`httpUrl`、`account`）和接收模式。
- 私信被忽略：发送人待配对审批。
- 群组消息被忽略：群组发送人/提及拦截阻止了投递。
- 编辑后出现配置验证错误：请运行 `openclaw doctor --fix`。
- 诊断中缺少 Signal：请确认 `channels.signal.enabled: true`。

额外检查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

排查流程：[/channels/故障排除](/zh/channels/troubleshooting)。

## 安全说明

- `signal-cli` 在本地存储账户密钥（通常是 `~/.local/share/signal-cli/data/`）。
- 在服务器迁移或重建之前，请备份 Signal 账户状态。
- 除非您明确希望获得更广泛的 访问权限，否则请保留 `channels.signal.dmPolicy: "pairing"`。
- 短信验证仅在注册或恢复流程时需要，但失去对号码/账户的控制可能会使重新注册变得复杂。

## 配置参考（Signal）

完整配置：[Configuration](/zh/gateway/configuration)

Provider 选项：

- `channels.signal.enabled`：启用/禁用 启动。
- `channels.signal.apiMode`：`auto | native | container`（默认：auto）。参见 [Container mode](#container-mode-bbernhardsignal-cli-rest-api)。
- `channels.signal.account`：机器人账户的 E.164 号码。
- `channels.signal.cliPath`：`signal-cli` 的路径。
- `channels.signal.configPath`：可选的 `signal-cli --config` 目录。
- `channels.signal.httpUrl`：完整的守护程序 URL（覆盖 host/port）。
- `channels.signal.httpHost`，`channels.signal.httpPort`：守护程序绑定地址（默认 127.0.0.1:8080）。
- `channels.signal.autoStart`：自动生成守护程序（如果未设置 `httpUrl`，默认为 true）。
- `channels.signal.startupTimeoutMs`：启动等待超时（毫秒，上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳过附件下载。
- `channels.signal.ignoreStories`：忽略来自守护程序的动态（Stories）。
- `channels.signal.sendReadReceipts`：转发已读回执。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.signal.allowFrom`：私信允许列表（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`Signal。Signal 没有用户名；请使用手机号/UUID ID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.signal.groupAllowFrom`Signal：群组允许列表；接受 Signal 群组 ID（原始值、`group:<id>` 或 `signal:group:<id>`）、发送者 E.164 号码或 `uuid:<id>` 值。
- `channels.signal.groups`Signal：按 Signal 群组 ID（或 `"*"`）键入的群组覆盖设置。支持的字段：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`：多帐户设置中 `channels.signal.groups` 的按帐户版本。
- `channels.signal.historyLimit`：作为上下文包含的最大群组消息数（0 表示禁用）。
- `channels.signal.dmHistoryLimit`：私信历史记录限制（以用户轮次为单位）。按用户覆盖：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：出站块大小（字符）。
- `channels.signal.chunkMode`：`length`（默认）或 `newline`，以便在按长度分块之前按空行（段落边界）分割。
- `channels.signal.mediaMaxMb`：入站/出站媒体限制（MB）。

相关的全局选项：

- `agents.list[].groupChat.mentionPatterns`Signal（Signal 不支持原生提及）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `messages.responsePrefix`。

## 相关

- [Channels Overview](/zh/channels) — 所有支持的渠道
- [Pairing](/zh/channels/pairing) — 私信认证和配对流程
- [Groups](/zh/channels/groups) — 群聊行为和提及控制
- [Channel Routing](/zh/channels/channel-routing) — 消息的会话路由
- [Security](/zh/gateway/security) — 访问模型和加固
