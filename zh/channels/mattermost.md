---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (插件)

状态：通过插件支持（机器人令牌 + WebSocket 事件）。支持频道、群组和私信。
Mattermost 是一个可自托管的团队消息平台；请参阅
[mattermost.com](https://mattermost.com) 官方网站以获取产品详细信息和下载。

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

详情：[插件](/zh/tools/plugin)

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
- 对于多账户设置，可以将 `commands` 设置在顶层或
  `channels.mattermost.accounts.<id>.commands` 下（账户值会覆盖顶层字段）。
- 命令回调会使用特定于命令的令牌进行验证，并在令牌检查失败时失效。
- 可达性要求：Mattermost 服务器必须能够访问回调端点。
  - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间中，否则请勿将 `callbackUrl` 设置为 `localhost`。
  - 除非该 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则请勿将 `callbackUrl` 设置为您的 Mattermost 基础 URL。
  - 快速检查的方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应从 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站白名单要求：
  - 如果您的回调目标是私有/tailnet/内部地址，请将 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 设置为包含回调主机/域。
  - 使用主机/域名条目，不要使用完整的 URL。
    - 正确： `gateway.tailnet-name.ts.net`
    - 错误： `https://gateway.tailnet-name.ts.net`

## 环境变量（默认账户）

如果您更喜欢使用环境变量，请在网关主机上设置以下变量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅适用于 **默认** 账户（`default`）。其他账户必须使用配置值。

## 聊天模式

Mattermost 会自动响应私信。频道行为由 `chatmode` 控制：

- `oncall`（默认）：仅在渠道中被 @提及时响应。
- `onmessage`：响应每一条渠道消息。
- `onchar`：当消息以触发前缀开头时响应。

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

注意事项：

- `onchar` 仍然响应明确的 @提及。
- `channels.mattermost.requireMention` 仍然适用于旧版配置，但推荐使用 `chatmode`。

## 主题串与会话

使用 `channels.mattermost.replyToMode` 来控制渠道和群组回复是保留在主渠道中，还是在触发帖子下启动主题串。

- `off`（默认）：仅当入站帖子已在主题串中时，才在主题串中回复。
- `first`：对于顶级渠道/群组帖子，在该帖子下启动主题串，并将对话路由到特定于主题串的会话。
- `all`：目前对于 Mattermost，其行为与 `first` 相同。
- 私信忽略此设置，并保持非主题串形式。

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

- 特定于主题串的会话使用触发帖子 ID 作为主题串根。
- `first` 和 `all` 目前是等效的，因为一旦 Mattermost 拥有了主题根，
  后续的块和媒体都会继续在该主题中发送。

## 访问控制（私信）

- 默认值：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到配对代码）。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 渠道（群组）

- 默认值：`channels.mattermost.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入允许列表（推荐使用用户 ID）。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放渠道：`channels.mattermost.groupPolicy="open"`（提及限制）。
- 运行时说明：如果 `channels.mattermost` 完全缺失，运行时在进行群组检查时会回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

## 出站交付的目标

将 `openclaw message send` 或 cron/webhooks 与这些目标格式结合使用：

- `channel:<id>` 用于渠道
- `user:<id>` 用于私信
- `@username` 用于私信（通过 Mattermost API 解析）

原始的不透明 ID（如 `64ifufp...`）在 Mattermost 中是**有歧义的**（用户 ID 与渠道 ID）。

OpenClaw 会**优先按用户**解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析直接渠道来发送**私信**。
- 否则，该 ID 将被视为**渠道 ID**。

如果需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

## 反应（消息工具）

- 将 `message action=react` 与 `channel=mattermost` 结合使用。
- `messageId` 是 Mattermost 帖子 ID。
- `emoji` 接受 `thumbsup` 或 `:+1:` 这样的名称（冒号是可选的）。
- 设置 `remove=true`（布尔值）以移除反应。
- 反应添加/移除事件将作为系统事件转发到路由的代理会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用反应操作（默认为 true）。
- 按账户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，代理会收到该选择并可以做出响应。

通过将 `inlineButtons` 添加到渠道功能来启用按钮：

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

1. 所有按钮将被一行确认信息替换（例如，“✓ **Yes** 由 @user 选择”）。
2. Agent 会将选择作为入站消息接收并进行回复。

注意事项：

- 按钮回调使用 HMAC-SHA256 验证（自动进行，无需配置）。
- Mattermost 会从其 API 响应中剥离回调数据（安全特性），因此所有按钮在点击时都会被移除 —— 无法进行部分移除。
- 包含连字符或下划线的操作 ID 会自动进行清理（Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：功能字符串数组。添加 `"inlineButtons"` 以
  在 Agent 系统提示词中启用按钮工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法直接通过其绑定主机访问网关时，请使用此设置。
- 在多账户设置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同的字段。
- 如果省略 `interactions.callbackBaseUrl`，OpenClaw 将根据 `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后回退到 `http://localhost:<port>`。
- 可达性规则：Mattermost 服务器必须能够访问按钮回调 URL。仅当 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间中时，`localhost` 才有效。
- 如果您的回调目标是私有/内部网络，请将其主机/域名添加到 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 集成（外部脚本）

外部脚本和 Webhook 可以通过 Mattermost REST API 直接发布按钮，而无需通过代理的 `message` 工具。请尽可能使用扩展中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

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

1. 附件需放在 `props.attachments` 中，而非顶层 `attachments`（会被静默忽略）。
2. 每个操作都需要 `type: "button"` —— 没有它，点击操作将被静默吞没。
3. 每个操作都需要一个 `id` 字段 —— Mattermost 会忽略没有 ID 的操作。
4. 操作 `id` 必须**仅包含字母数字** (`[a-zA-Z0-9]`)。连字符和下划线会破坏 Mattermost 的服务器端操作路由（返回 404）。在使用前请将其去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，以便确认消息显示
   按钮名称（例如“批准”）而不是原始 ID。
6. `context.action_id` 是必需的 —— 交互处理程序在没有它的情况下会返回 400。

**HMAC 令牌生成：**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与网关验证逻辑匹配的令牌：

1. 从机器人令牌派生密钥：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 构建包含所有字段（**除了** `_token`）的上下文对象。
3. 使用**排序后的键**和**无空格**进行序列化（网关使用带有排序键的 `JSON.stringify`
   ，这会产生紧凑的输出）。
4. 签名：`HMAC-SHA256(key=secret, data=serializedContext)`
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

- Python 的 `json.dumps` 默认添加空格（`{"key": "val"}`）。使用
  `separators=(",", ":")` 来匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
- 始终对**所有**上下文字段（减去 `_token`）进行签名。网关会去除 `_token`，然后
  对剩余的所有内容进行签名。仅对子集进行签名会导致静默的验证失败。
- 使用 `sort_keys=True` —— Gateway 网关在签名前会对键进行排序，而 Mattermost 在存储负载时可能会重新排序上下文字段。
- 从 bot token（确定性）派生密钥，而不是随机字节。密钥在创建按钮的进程和进行验证的 Gateway 网关之间必须保持一致。

## 目录适配器

Mattermost 插件包含一个目录适配器，可通过 Mattermost API 解析渠道和用户名。这启用了 `#channel-name` 和 `@username` 目标，用于 `openclaw message send` 以及 cron/webhook 投递。

无需配置 —— 适配器使用账户配置中的 bot token。

## 多账户

Mattermost 在 `channels.mattermost.accounts` 下支持多个账户：

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

- 渠道中无回复：确保 bot 在渠道中并提及它 (oncall)，使用触发前缀 (onchar)，或设置 `chatmode: "onmessage"`。
- 认证错误：检查 bot token、基础 URL 以及账户是否已启用。
- 多账户问题：环境变量仅适用于 `default` 账户。
- 按钮显示为白框：代理可能发送了格式错误的按钮数据。检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
- 按钮已渲染但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，并且 ServiceSettings 中的 `EnablePostActionIntegration` 为 `true`。
- 点击按钮返回 404：按钮的 `id` 可能包含连字符或下划线。Mattermost 的操作路由器在遇到非字母数字 ID 时会中断。请仅使用 `[a-zA-Z0-9]`。
- Gateway(网关) 日志 `invalid _token`：HMAC 不匹配。请检查是否对所有上下文字段（而非子集）进行了签名，是否使用了排序后的键，以及是否使用了紧凑的 JSON（无空格）。请参阅上面的 HMAC 部分。
- Gateway(网关) 网关日志 `missing _token in context`：`_token` 字段不在按钮的上下文中。请确保在构建集成负载时包含该字段。
- 确认显示原始 ID 而非按钮名称：`context.action_id` 与按钮的 `id` 不匹配。请将两者设置为相同的经过清理的值。
- Agent 不知道按钮：在 Mattermost 渠道配置中添加 `capabilities: ["inlineButtons"]`。

import zh from '/components/footer/zh.mdx';

<zh />
