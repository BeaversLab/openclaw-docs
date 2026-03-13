---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (插件)

状态：通过插件支持（机器人令牌 + WebSocket 事件）。支持频道、群组和私信。
Mattermost 是一个可自托管的团队消息平台；有关产品详情和下载，请访问
[mattermost.com](https://mattermost.com) 官方网站。

## 所需插件

Mattermost 以插件形式提供，不包含在核心安装中。

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/mattermost
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/mattermost
```

如果您在配置/入职过程中选择了 Mattermost 并检测到了 git 检出，
OpenClaw 将自动提供本地安装路径。

详情：[Plugins](/en/tools/plugin)

## 快速设置

1. 安装 Mattermost 插件。
2. 创建一个 Mattermost 机器人账户并复制 **bot token**。
3. 复制 Mattermost **基础 URL**（例如 `https://chat.example.com`）。
4. 配置 OpenClaw 并启动网关。

最小配置：

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
    },
  },
}
```

## 原生斜杠命令

原生斜杠命令是可选启用的。启用后，OpenClaw 会通过 Mattermost API 注册 `oc_*` 个斜杠命令，并在网关 HTTP 服务器上接收回调 POST 请求。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Use when Mattermost cannot reach the gateway directly (reverse proxy/public URL).
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

注：

- 对于 Mattermost，`native: "auto"` 默认为禁用。设置 `native: true` 以启用它。
- 如果省略 `callbackUrl`，OpenClaw 会根据网关主机/端口 + `callbackPath` 推导出一个。
- 对于多账户设置，`commands` 可以设置在顶层或下方
  `channels.mattermost.accounts.<id>.commands`（账户值会覆盖顶层字段）。
- 命令回调会使用每个命令的令牌进行验证，并在令牌检查失败时自动失效（fail closed）。
- 可达性要求：Mattermost 服务器必须能够访问回调端点。
  - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间上，否则不要将 `callbackUrl` 设置为 `localhost`。
  - 除非您的 Mattermost 基础 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则不要将 `callbackUrl` 设置为该 URL。
  - 快速检查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应从 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站白名单要求：
  - 如果您的回调目标是私有/tailnet/内部地址，请设置 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回调主机/域名。
  - 使用主机/域名条目，而不是完整的 URL。
    - 好：`gateway.tailnet-name.ts.net`
    - 坏：`https://gateway.tailnet-name.ts.net`

## 环境变量（默认账户）

如果您更喜欢使用环境变量，请在网关主机上设置这些变量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅适用于 **默认** 账户 (`default`)。其他账户必须使用配置值。

## 聊天模式

Mattermost 会自动回复私信。频道行为由 `chatmode` 控制：

- `oncall` (默认)：仅在频道中被 @提及时回复。
- `onmessage`：回复每一条频道消息。
- `onchar`：当消息以触发前缀开头时回复。

配置示例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

注意：

- `onchar` 仍然响应显式的 @提及。
- `channels.mattermost.requireMention` 对旧版配置仍然有效，但建议使用 `chatmode`。

## 会话串与会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是保留在主频道中，还是在触发帖子下开启线程。

- `off` (默认)：仅当入站帖子已在线程中时，才在线程中回复。
- `first`：对于顶层的频道/群组帖子，在该帖子下开启一个线程并将
  对话路由到限定范围的会话会话中。
- `all`：对于目前的 Mattermost，行为与 `first` 相同。
- 直接消息 (DM) 会忽略此设置并保持非会话串形式。

配置示例：

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

注意事项：

- 限定范围的会话会话使用触发帖子的 ID 作为会话串根节点。
- `first` 和 `all` 目前是等效的，因为一旦 Mattermost 拥有线程根，
  后续的分块和媒体都将继续在该会话串中进行。

## 访问控制 (DM)

- 默认值：`channels.mattermost.dmPolicy = "pairing"` (未知发送者将收到配对代码)。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 频道 (群组)

- 默认值：`channels.mattermost.groupPolicy = "allowlist"` (提及限制)。
- 使用 `channels.mattermost.groupAllowFrom` 设置发送者白名单 (建议使用用户 ID)。
- `@username` 匹配是可变的，并且仅在启用 `channels.mattermost.dangerouslyAllowNameMatching: true` 时生效。
- 开放频道：`channels.mattermost.groupPolicy="open"` (提及限制)。
- 运行时说明：如果完全缺少 `channels.mattermost`，运行时在进行群组检查时会回退到 `groupPolicy="allowlist"` (即使设置了 `channels.defaults.groupPolicy`)。

## 出站传递的目标

将这些目标格式与 `openclaw message send` 或 cron/webhooks 结合使用：

- `channel:<id>` 用于频道
- `user:<id>` 用于私信（DM）
- `@username` 用于私信（通过 Mattermost API 解析）

裸露的不透明 ID（如 `64ifufp...`）在 Mattermost 中是**有歧义的**（用户 ID 与频道 ID 的区分）。

OpenClaw 以**用户优先**的方式解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析直接频道来发送**私信**。
- 否则，该 ID 将被视为**频道 ID**。

如果您需要确定的行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

## 回应（消息工具）

- 将 `message action=react` 与 `channel=mattermost` 一起使用。
- `messageId` 是 Mattermost 帖子 ID。
- `emoji` 接受诸如 `thumbsup` 或 `:+1:` 之类的名称（冒号是可选的）。
- 设置 `remove=true`（布尔值）以移除表情回应。
- 回应添加/移除事件作为系统事件转发到路由的代理会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用表情回应操作（默认为 true）。
- 按账户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，代理会收到
选择并可以响应。

通过将 `inlineButtons` 添加到频道功能来启用按钮：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

将 `message action=send` 与 `buttons` 参数一起使用。按钮是一个二维数组（按钮行）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按钮字段：

- `text`（必需）：显示标签。
- `callback_data`（必需）：点击时返回的值（用作操作 ID）。
- `style`（可选）：`"default"`、`"primary"` 或 `"danger"`。

当用户点击按钮时：

1. 所有按钮都将被替换为一行确认信息（例如，“✓ 由 @user 选择了 **Yes**”）。
2. 代理将选择作为入站消息接收并进行响应。

说明：

- 按钮回调使用 HMAC-SHA256 验证（自动完成，无需配置）。
- Mattermost 会从其 API 响应中剥离回调数据（安全功能），因此所有按钮
  都会在点击时被移除 — 无法进行部分移除。
- 包含连字符或下划线的操作 ID 会自动进行清理
  （Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：功能字符串数组。将 `"inlineButtons"` 添加到
  在代理系统提示中启用按钮工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按钮的可选外部基础 URL
  回调（例如 `https://gateway.example.com`）。当 Mattermost 无法
  直接在其绑定主机访问网关时使用此项。
- 在多账户设置中，您也可以在
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`。
- 如果省略了 `interactions.callbackBaseUrl`，OpenClaw 将从以下位置推导回调 URL
  `gateway.customBindHost` + `gateway.port`，然后回退到 `http://localhost:<port>`。
- 可达性规则：按钮回调 URL 必须能从 Mattermost 服务器访问。
  `localhost` 仅在 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间时有效。
- 如果您的回调目标是私有/tailnet/内部的，请将其主机/域名添加到 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 集成（外部脚本）

外部脚本和 Webhook 可以直接通过 Mattermost REST API 发布按钮，
而不是通过代理的 `message` 工具。尽可能使用扩展中的 `buildButtonAttachments()`；
如果发布原始 JSON，请遵循以下规则：

**负载结构：**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // alphanumeric only — see below
            type: "button", // required, or clicks are silently ignored
            name: "Approve", // display label
            style: "primary", // optional: "default", "primary", "danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id (for name lookup)
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // see HMAC section below
              },
            },
          },
        ],
      },
    ],
  },
}
```

**关键规则：**

1. 附件应位于 `props.attachments` 中，而不是顶层的 `attachments`（会被静默忽略）。
2. 每个操作都需要 `type: "button"` — 没有它，点击将被静默吞没。
3. 每个操作都需要一个 `id` 字段 — Mattermost 会忽略没有 ID 的操作。
4. 操作 `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会导致
   Mattermost 的服务器端操作路由（返回 404）。使用前请将它们去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，以便确认消息显示
   按钮名称（例如，“Approve”）而不是原始 ID。
6. `context.action_id` 是必需的 — 没有它，交互处理程序将返回 400。

**HMAC 令牌生成：**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成
与网关验证逻辑匹配的令牌：

1. 从机器人令牌派生密钥：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 使用除 `_token` 之外的所有字段构建上下文对象。
3. 使用**排序键**和**无空格**进行序列化（网关使用 `JSON.stringify`
   配合排序后的键，这会产生紧凑的输出）。
4. 签名： `HMAC-SHA256(key=secret, data=serializedContext)`
5. 将生成的十六进制摘要作为上下文中的 `_token` 添加。

Python 示例：

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

常见的 HMAC 陷阱：

- Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。请使用
  `separators=(",", ":")` 来匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
- 始终对**所有**上下文字段（减去 `_token`）进行签名。网关会剥离 `_token` 然后
  对剩余的所有内容进行签名。对子集进行签名会导致静默验证失败。
- 使用 `sort_keys=True` —— 网关在签名前会对键进行排序，而 Mattermost 可能
  在存储负载时重新排序上下文字段。
- 从机器人令牌派生密钥（确定性的），而不是使用随机字节。密钥
  必须在创建按钮的进程和进行验证的网关之间保持一致。

## 目录适配器

Mattermost 插件包含一个目录适配器，可通过 Mattermost API 解析频道和用户名称。这启用了 `openclaw message send` 和 cron/webhook 投递中的 `#channel-name` 和 `@username` 目标。

无需配置 —— 适配器使用账户配置中的机器人令牌。

## 多账户

Mattermost 支持在 `channels.mattermost.accounts` 下配置多个账户：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## 故障排除

- 频道内无回复：确保 bot 在频道中并提及它 (oncall)，使用触发前缀 (onchar)，或设置 `chatmode: "onmessage"`。
- 身份验证错误：检查机器人令牌、基础 URL 以及账户是否已启用。
- 多账户问题：环境变量仅适用于 `default` 账户。
- 按钮显示为白框：Agent 可能发送了格式错误的按钮数据。检查每个按钮是否同时包含 `text` 和 `callback_data` 字段。
- 按钮已渲染但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，并且 ServiceSettings 中的 `EnablePostActionIntegration` 为 `true`。
- 点击按钮时返回 404：按钮的 `id` 可能包含连字符或下划线。Mattermost 的操作路由器会在非字母数字 ID 处中断。请仅使用 `[a-zA-Z0-9]`。
- 网关记录 `invalid _token`：HMAC 不匹配。检查您是否对所有上下文字段（而非子集）进行了签名，使用了排序后的键，并使用了紧凑 JSON（无空格）。请参阅上面的 HMAC 部分。
- 网关记录 `missing _token in context`：`_token` 字段不在按钮的上下文中。确保在构建集成负载时包含它。
- 确认显示原始 ID 而非按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的清理后的值。
- Agent 无法识别按钮：将 `capabilities: ["inlineButtons"]` 添加到 Mattermost 频道配置中。

import zh from '/components/footer/zh.mdx';

<zh />
