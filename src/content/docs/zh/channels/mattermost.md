---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost

状态：捆绑插件（机器人令牌 + WebSocket 事件）。支持频道、群组和私信。
Mattermost 是一个可自托管的团队消息传递平台；有关产品详情和下载，请访问
[mattermost.com](https://mattermost.com) 官方网站。

## 捆绑插件

Mattermost 作为捆绑插件包含在当前的 OpenClaw 版本中，因此正常的
打包构建不需要单独安装。

如果您使用的是旧版本或排除 Mattermost 的自定义安装，
请手动安装：

通过 CLI (npm 注册表) 安装：

```bash
openclaw plugins install @openclaw/mattermost
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

详情：[插件](/zh/tools/plugin)

## 快速设置

1. 确保 Mattermost 插件可用。
   - 当前的打包 OpenClaw 版本已包含它。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 创建一个 Mattermost 机器人帐户并复制 **bot 令牌**。
3. 复制 Mattermost **基础 URL**（例如，`https://chat.example.com`）。
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

原生斜杠命令是可选的。启用后，OpenClaw 会通过
Mattermost API 注册 `oc_*` 斜杠命令，并在网关 HTTP 服务器上接收回调 POST 请求。

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

注意：

- 对于 Mattermost，`native: "auto"` 默认为禁用。设置 `native: true` 以启用。
- 如果省略 `callbackUrl`，OpenClaw 将根据网关主机/端口 + `callbackPath` 推导出一个值。
- 对于多账户设置，`commands` 可以设置在顶层或
  `channels.mattermost.accounts.<id>.commands` 下（账户值会覆盖顶层字段）。
- 命令回调使用 OpenClaw 注册 `oc_*` 命令时 Mattermost 返回的每个命令的令牌进行验证。
- 当注册失败、启动部分完成或
  回调令牌与注册命令之一不匹配时，斜杠回调将失败关闭。
- 可达性要求：Mattermost 服务器必须能够访问回调端点。
  - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间上，否则不要将 `callbackUrl` 设置为 `localhost`。
  - 除非该 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则不要将 `callbackUrl` 设置为您的 Mattermost 基础 URL。
  - 一个快速检查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应该从 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允许列表要求：
  - 如果您的回调目标是私有/tailnet/内部地址，请设置 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回调主机/域名。
  - 使用主机/域名条目，而非完整的 URL。
    - 正确：`gateway.tailnet-name.ts.net`
    - 错误：`https://gateway.tailnet-name.ts.net`

## 环境变量（默认账户）

如果您偏好使用环境变量，请在网关主机上设置这些变量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅适用于 **默认** 账户（`default`）。其他账户必须使用配置值。

## 聊天模式

Mattermost 会自动响应私信。渠道行为由 `chatmode` 控制：

- `oncall`（默认）：仅在渠道中被 @ 提及时响应。
- `onmessage`：响应每条渠道消息。
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

- `onchar` 仍然会响应显式的 @ 提及。
- `channels.mattermost.requireMention` 对旧版配置仍然有效，但推荐使用 `chatmode`。

## 串接与会话

使用 `channels.mattermost.replyToMode` 来控制渠道和群组回复是保留在主渠道中，还是在触发帖子下启动一个话题串。

- `off`（默认）：仅当入站帖子本身已在话题串中时，才在该串中回复。
- `first`：对于顶级渠道/群组帖子，在该帖子下启动一个话题串，并将对话路由到话题串范围的会话。
- `all`：目前与 `first` 对 Mattermost 的行为相同。
- 私信会忽略此设置并保持非串接状态。

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

- 线程作用域会话使用触发帖子的 ID 作为线程根。
- `first` 和 `all` 目前是等效的，因为一旦 Mattermost 有了话题串根节点，后续的文本块和媒体都会继续在同一条串中。

## 访问控制（私信）

- 默认值：`channels.mattermost.dmPolicy = "pairing"`（未知发送者将收到配对代码）。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 渠道（群组）

- 默认值：`channels.mattermost.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入允许列表（推荐使用用户 ID）。
- 针对每个渠道的提及覆盖设置位于 `channels.mattermost.groups.<channelId>.requireMention` 下，或者使用 `channels.mattermost.groups["*"].requireMention` 设置默认值。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放渠道：`channels.mattermost.groupPolicy="open"`（提及限制）。
- 运行时说明：如果 `channels.mattermost` 完全缺失，运行时将回退到 `groupPolicy="allowlist"` 进行群组检查（即使设置了 `channels.defaults.groupPolicy`）。

示例：

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## 出站交付的目标

将以下目标格式与 `openclaw message send` 或 cron/webhooks 一起使用：

- `channel:<id>` 用于渠道
- `user:<id>` 用于私信
- `@username` 用于私信（通过 Mattermost API 解析）

裸露的不透明 ID（如 `64ifufp...`）在 Mattermost 中是**有歧义的**（用户 ID vs 渠道 ID）。

OpenClaw 按**用户优先**解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析直接渠道来发送**私信**。
- 否则，该 ID 会被视为**渠道 ID**。

如果您需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

## 私信渠道重试

当 OpenClaw 发送到 Mattermost 私信目标并需要先解析直接渠道时，默认情况下它会重试临时的直接渠道创建失败。

使用 `channels.mattermost.dmChannelRetry` 全局调整 Mattermost 插件的行为，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 针对单个账户进行调整。

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

注意：

- 这仅适用于私信渠道创建（`/api/v4/channels/direct`），而非每次 Mattermost API 调用。
- 重试适用于临时性故障，例如速率限制、5xx 响应以及网络或超时错误。
- 除 `429` 外的 4xx 客户端错误被视为永久性错误，不会重试。

## 预览流式传输

Mattermost 将思考、工具活动和部分回复文本流式传输到单一的**草稿预览帖子**中，当最终答案可以安全发送时，该帖子会就地定稿。预览在同一帖子 ID 上更新，而不是用分块消息刷屏渠道。媒体/错误的定稿会取消待处理的预览编辑，并使用正常投递，而不是刷新一次性的预览帖子。

通过 `channels.mattermost.streaming` 启用：

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

注：

- `partial` 是通常的选择：一个预览帖子，随着回复的增长进行编辑，然后用完整答案定稿。
- `block` 在预览帖子内使用追加样式的草稿分块。
- `progress` 在生成期间显示状态预览，并仅在完成时发布最终答案。
- `off` 禁用预览流式传输。
- 如果流无法就地定稿（例如帖子在流传输过程中被删除），OpenClaw 将回退到发送一个新的最终帖子，以确保回复永不丢失。
- 仅包含推理的负载将从渠道帖子中屏蔽，包括作为 `> Reasoning:` 引用块到达的文本。设置 `/reasoning on` 以在其他界面中查看思考过程；Mattermost 最终帖子仅保留答案。
- 有关渠道映射矩阵，请参阅 [流式传输](/zh/concepts/streaming#preview-streaming-modes)。

## 回应（消息工具）

- 将 `message action=react` 与 `channel=mattermost` 结合使用。
- `messageId` 是 Mattermost 帖子的 ID。
- `emoji` 接受诸如 `thumbsup` 或 `:+1:` 之类的名称（冒号可选）。
- 设置 `remove=true`（布尔值）以移除回应。
- 回应添加/移除事件作为系统事件转发到路由的代理会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用回应操作（默认为 true）。
- 每个账户的覆盖设置：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，代理会接收
该选择并进行响应。

通过向渠道功能添加 `inlineButtons` 来启用按钮：

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

- `text`（必填）：显示标签。
- `callback_data`（必填）：点击时发送回的值（用作操作 ID）。
- `style`（可选）：`"default"`、`"primary"` 或 `"danger"`。

当用户点击按钮时：

1. 所有按钮都将被替换为一行确认信息（例如，“✓ **Yes** selected by @user”）。
2. 代理会将该选择作为入站消息接收并进行响应。

注意事项：

- 按钮回调使用 HMAC-SHA256 验证（自动进行，无需配置）。
- Mattermost 会从其 API 响应中剥离回调数据（安全功能），因此点击时会移除
  所有按钮 — 无法进行部分移除。
- 包含连字符或下划线的操作 ID 会自动被清理
  （Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：功能字符串数组。添加 `"inlineButtons"` 以
  在代理系统提示中启用按钮工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：可选的外部按钮回调基本 URL
  （例如 `https://gateway.example.com`）。当 Mattermost 无法
  直接通过其绑定主机访问网关时使用此项。
- 在多账户设置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同的字段。
- 如果省略了 `interactions.callbackBaseUrl`，OpenClaw 将从 `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后回退到 `http://localhost:<port>`。
- 可达性规则：按钮回调 URL 必须可以从 Mattermost 服务器访问。仅当 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间上时，`localhost` 才有效。
- 如果您的回调目标是私有的/tailnet/内部的，请将其主机/域名添加到 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 集成（外部脚本）

外部脚本和 webhook 可以通过 Mattermost REST Mattermost 直接发布按钮，而无需通过代理的 `message` 工具。尽可能使用插件中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

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

1. 附件应放在 `props.attachments` 中，而不是顶级 `attachments` 中（会被静默忽略）。
2. 每个操作都需要 `type: "button"` —— 没有它，点击将被静默吞没。
3. 每个操作都需要一个 `id` 字段 —— Mattermost 会忽略没有 ID 的操作。
4. 操作 `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务器端操作路由（返回 404）。使用前请将其去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，以便确认消息显示按钮名称（例如，“批准”）而不是原始 ID。
6. `context.action_id` 是必需的 —— 交互处理程序在没有它的情况下会返回 400。

**HMAC 令牌生成：**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与网关验证逻辑匹配的令牌：

1. 从机器人令牌派生密钥：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 构建包含除 `_token` 之外的所有字段的上下文对象。
3. 使用**排序键**和**无空格**进行序列化（网关使用带排序键的 `JSON.stringify`，这会产生紧凑的输出）。
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

- Python 的 `json.dumps` 默认添加空格（`{"key": "val"}`）。使用 `separators=(",", ":")` 来匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
- 始终对**所有**上下文字段签名（不包括 `_token`）。网会剥离 `_token`，然后对其余部分进行签名。对子集签名会导致静默验证失败。
- 使用 `sort_keys=True` —— 网关在签名前会对键进行排序，而 Mattermost 在存储有效负载时可能会重新排序上下文字段。
- 从 bot 令牌派生密钥（确定性的），而不是随机字节。密钥必须在创建按钮的过程和进行验证的网关之间保持一致。

## 目录适配器

Mattermost 插件包含一个目录适配器，通过 Mattermost API 解析渠道和用户名。这启用了 `openclaw message send` 和 cron/webhook 投递中的 `#channel-name` 和 `@username` 目标。

无需配置 —— 适配器使用账户配置中的 bot 令牌。

## 多账户

Mattermost 支持在 `channels.mattermost.accounts` 下设置多个账户：

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

- 渠道中无回复：确保 bot 在渠道中并提及它（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
- 认证错误：检查 bot 令牌、基础 URL 以及账户是否已启用。
- 多账户问题：环境变量仅适用于 `default` 账户。
- 原生斜杠命令返回 `Unauthorized: invalid command token.`：OpenClaw 未接受回调令牌。典型原因：
  - 斜杠命令注册在启动时失败或仅部分完成
  - 回调击中了错误的网关/账户
  - Mattermost 仍然有指向先前回调目标的旧命令
  - 网关重新启动后未重新激活斜杠命令
- 如果本机斜杠命令停止工作，请检查日志中是否有
  `mattermost: failed to register slash commands` 或
  `mattermost: native slash commands enabled but no commands could be registered`。
- 如果省略了 `callbackUrl` 且日志警告回调解析为
  `http://127.0.0.1:18789/...`，则该 URL 可能仅在
  Mattermost 与 OpenClaw 运行在同一主机/网络命名空间时才可访问。请改为
  设置一个显式的外部可访问的 `commands.callbackUrl`。
- 按钮显示为白框：代理可能发送了格式错误的按钮数据。检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
- 按钮渲染但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 是否包含 `127.0.0.1 localhost`，并且 ServiceSettings 中的 `EnablePostActionIntegration` 是否为 `true`。
- 点击按钮返回 404：按钮 `id` 可能包含连字符或下划线。Mattermost 的操作路由在遇到非字母数字 ID 时会中断。请仅使用 `[a-zA-Z0-9]`。
- Gateway(网关) 日志 `invalid _token`：HMAC 不匹配。请检查您是否对所有上下文字段（而非子集）进行了签名，使用了排序后的键，并使用了紧凑 JSON（无空格）。请参见上面的 HMAC 部分。
- Gateway(网关) 日志 `missing _token in context`：按钮的上下文中缺少 `_token` 字段。确保在构建集成负载时包含它。
- 确认显示原始 ID 而非按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的经过清理的值。
- Agent 不知道按钮：将 `capabilities: ["inlineButtons"]` 添加到 Mattermost 渠道配置中。

## 相关

- [频道概述](/zh/channels) — 所有支持的频道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群聊行为和提及控制
- [频道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
