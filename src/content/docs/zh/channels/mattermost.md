---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：可下载的插件（bot 令牌 + WebSocket 事件）。支持渠道、群组和私信。Mattermost 是一个可自托管的团队消息平台；有关产品详细信息和下载，请访问 [mattermost.com](Mattermosthttps://mattermost.com) 查看官方网站。

## 安装

在配置渠道之前安装 Mattermost：

<Tabs>
  <Tab title="npmnpm registry">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Local checkout">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

详情：[插件](/zh/tools/plugin)

## 快速设置

<Steps>
  <Step title="Ensure plugin is available"OpenClaw>
    当前打包的 OpenClaw 版本已包含该插件。较旧/自定义的安装可以使用上述命令手动添加。
  </Step>
  <Step title="MattermostCreate a Mattermost bot"Mattermost>
    创建一个 Mattermost 机器人账户并复制 **bot token**。
  </Step>
  <Step title="Copy the base URL"Mattermost>
    复制 Mattermost **base URL**（例如，`https://chat.example.com`）。
  </Step>
  <Step title="OpenClawConfigure OpenClaw and start the gateway">
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

  </Step>
</Steps>

## 原生斜杠命令

原生斜杠命令是可选启用的。启用后，OpenClaw 会通过 Mattermost API 注册 OpenClaw`oc_*`MattermostAPI 斜杠命令，并在网关 HTTP 服务器上接收回调 POST 请求。

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

<AccordionGroup>
  <Accordion title="Behavior notes">
    - 对于 Mattermost，`native: "auto"`Mattermost 默认为禁用。设置 `native: true` 以启用。
    - 如果省略 `callbackUrl`OpenClaw，OpenClaw 会根据网关主机/端口 + `callbackPath` 推导出一个。
    - 对于多账户设置，`commands` 可以设置在顶层或 `channels.mattermost.accounts.<id>.commands`MattermostOpenClaw 下（账户值会覆盖顶层字段）。
    - 命令回调使用 OpenClaw 注册 `oc_*`OpenClawMattermostMattermostAPI 命令时 Mattermost 返回的每个命令的令牌进行验证。
    - OpenClaw 在接受每个回调之前会刷新当前的 Mattermost 命令注册，这样来自已删除或重新生成的斜杠命令的过期令牌将在不重启网关的情况下停止被接受。
    - 如果 Mattermost API 无法确认命令仍然有效，回调验证将失败关闭；失败的验证会被短暂缓存，并发查找会被合并，新的查找启动会按命令进行速率限制，以限制重放压力。
    - 当注册失败、启动未完成，或者回调令牌与解析出的命令的注册令牌不匹配时（一个命令的有效令牌无法到达不同命令的上游验证），斜杠回调将失败关闭。

  </Accordion>
  <Accordion title="Reachability requirement"Mattermost>
    回调端点必须可被 Mattermost 服务器访问。

    - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间上，否则不要将 `callbackUrl` 设置为 `localhost`MattermostOpenClaw。
    - 除非该 URL 将 `/api/channels/mattermost/command`Mattermost 反向代理到 OpenClaw，否则不要将 `callbackUrl`OpenClaw 设置为您的 Mattermost 基础 URL。
    - 快速检查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应从 OpenClaw 返回 `405 Method Not Allowed`OpenClaw，而不是 `404`。

  </Accordion>
  <Accordion title="MattermostMattermost egress allowlist"Mattermost>
    如果您的回调目标是私有/tailnet/内部地址，请设置 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回调主机/域名。

    请使用主机/域名条目，而不是完整的 URL。

    - 正确： `gateway.tailnet-name.ts.net`
    - 错误： `https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 环境变量（默认账户）

如果您更喜欢使用环境变量，请在网关主机上设置这些变量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
环境变量仅适用于 **默认** 账户（`default`）。其他账户必须使用配置值。

无法从工作区 `.env` 设置 `MATTERMOST_URL`；请参阅 [工作区 `.env` 文件](/zh/gateway/security)。

</Note>

## 聊天模式

Mattermost 会自动响应私信。渠道行为由 Mattermost`chatmode` 控制：

<Tabs>
  <Tab title="oncall (default)">仅在渠道中被 @提及 时响应。</Tab>
  <Tab title="onmessage">响应每一条渠道消息。</Tab>
  <Tab title="onchar">当消息以触发前缀开头时响应。</Tab>
</Tabs>

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

- `onchar` 仍然响应明确的 @提及。
- 为了兼容旧配置，仍会遵守 `channels.mattermost.requireMention`，但首选 `chatmode`。

## 主题帖与会话

使用 `channels.mattermost.replyToMode` 来控制渠道和群组回复是停留在主渠道中，还是在触发帖子下启动一个主题。

- `off`（默认）：仅当入站帖子本身已在主题中时，才在主题中回复。
- `first`：对于顶层渠道/群组帖子，在该帖子下启动一个主题，并将对话路由到特定主题的会话。
- `all`：对于目前的 Mattermost，其行为与 `first`Mattermost 相同。
- 私信会忽略此设置，并保持非主题形式。

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

备注：

- 特定主题的会话使用触发帖子的 ID 作为主题根。
- `first` 和 `all`Mattermost 目前是等效的，因为一旦 Mattermost 有了主题根，后续的文本块和媒体都会继续在该同一主题中进行。

## 访问控制（私信）

- 默认值：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到配对码）。
- 批准方式：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。
- `channels.mattermost.allowFrom` 接受 `accessGroup:<name>` 条目。参见[访问组](/zh/channels/access-groups)。

## 渠道 (群组)

- 默认值：`channels.mattermost.groupPolicy = "allowlist"`（提及触发）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入白名单（建议使用用户 ID）。
- `channels.mattermost.groupAllowFrom` 接受 `accessGroup:<name>` 条目。参见[访问组](/zh/channels/access-groups)。
- 每个渠道的提及覆盖设置位于 `channels.mattermost.groups.<channelId>.requireMention` 下，或使用 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 公开渠道：`channels.mattermost.groupPolicy="open"`（提及触发）。
- 运行时说明：如果完全缺少 `channels.mattermost`，运行时将回退到 `groupPolicy="allowlist"` 进行组检查（即使设置了 `channels.defaults.groupPolicy`）。

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

## 出站传递的目标

将 `openclaw message send` 或 cron/webhooks 与以下目标格式配合使用：

- `channel:<id>` 用于频道
- `user:<id>` 用于私信
- `@username` 用于私信（通过 Mattermost API 解析）

<Warning>
原始不透明 ID（例如 `64ifufp...`）在 MattermostOpenClaw 中是**有歧义的**（用户 ID 与频道 ID）。

%%PH:GLOSSARY:279:486e1928**按用户优先**解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>``/api/v4/channels/direct`OpenClaw 成功），%%PH:GLOSSARY:280:e4ffd3bd**私信**。
- 否则，该 ID 被视为**频道 ID**。

如果您需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

</Warning>

## 私信频道重试

当 OpenClaw 发送到 Mattermost 私信目标并需要先解析直接频道时，默认情况下它会重试临时的直接频道创建失败。

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

注意事项：

- 这仅适用于私信频道创建（`/api/v4/channels/direct`），而非每次 Mattermost API 调用。
- 重试适用于瞬时故障，例如速率限制、5xx 响应以及网络或超时错误。
- 除 `429` 外的 4xx 客户端错误被视为永久性错误，不会重试。

## 预览流式传输

Mattermost 将思考、工具活动和部分回复文本流式传输到单一的**草稿预览帖子**中，当最终答案可以安全发送时，该帖子会在原位定稿。预览会在同一个帖子 ID 上更新，而不是用分块消息刷屏渠道。媒体/错误最终结果会取消待处理的预览编辑，并使用正常传递方式，而不是刷新一次性的预览帖子。

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

<AccordionGroup>
  <Accordion title="Streaming modes">
    - `partial` 是通常的选择：一个预览帖子，随着回复的增长被编辑，然后通过完整答案定稿。
    - `block` 在预览帖子内使用追加样式的草稿块。
    - `progress` 在生成时显示状态预览，仅在完成时发布最终答案。
    - `off` 禁用预览流式传输。

  </Accordion>
  <Accordion title="Streaming behavior notes">
    - 如果流无法在原位定稿（例如帖子在流传输过程中被删除），OpenClaw 将回退到发送新的最终帖子，以确保回复永不丢失。
    - 仅包含推理的负载将从渠道帖子中屏蔽，包括作为 `> Reasoning:` 引用块到达的文本。设置 `/reasoning on` 以在其他界面中查看思考内容；Mattermost 的最终帖子仅保留答案。
    - 有关渠道映射矩阵，请参阅 [Streaming](/zh/concepts/streaming#preview-streaming-modes)。

  </Accordion>
</AccordionGroup>

## 回应（消息工具）

- 将 `message action=react` 与 `channel=mattermost` 结合使用。
- `messageId` 是 Mattermost 的帖子 ID。
- `emoji` 接受如 `thumbsup` 或 `:+1:` 的名称（冒号可选）。
- 设置 `remove=true`（布尔值）以移除回应。
- 回应添加/移除事件作为系统事件转发到路由的代理会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用回应操作（默认为 true）。
- 按账户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，代理会收到选择内容并可以做出回应。

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

使用带有 `buttons` 参数的 `message action=send`。按钮是一个二维数组（按钮行）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按钮字段：

<ParamField path="text" type="string" required>
  显示标签。
</ParamField>
<ParamField path="callback_data" type="string" required>
  点击时发送回的值（用作操作 ID）。
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  按钮样式。
</ParamField>

当用户点击按钮时：

<Steps>
  <Step title="按钮替换为确认信息">所有按钮都会被替换为一行确认信息（例如，“✓ **Yes** 已由 @user 选择”）。</Step>
  <Step title="代理接收选择">代理会以入站消息的形式接收选择内容并做出回应。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="实现说明"MattermostAPIMattermost>
    - 按钮回调使用 HMAC-SHA256 验证（自动进行，无需配置）。
    - Mattermost 会从其 API 响应中剥离回调数据（安全功能），因此点击时所有按钮都会被移除——无法部分移除。
    - 包含连字符或下划线的操作 ID 会自动进行清理（Mattermost 路由限制）。

  </Accordion>
  <Accordion title="配置和可达性">
    - `channels.mattermost.capabilities`：功能字符串数组。添加 `"inlineButtons"` 以在代理系统提示中启用按钮工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`：按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`Mattermost）。当 Mattermost 无法直接通过其绑定主机访问网关时，请使用此项。
    - 在多账户设置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同的字段。
    - 如果省略 `interactions.callbackBaseUrl`OpenClaw，OpenClaw 将从 `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后回退到 `http://localhost:<port>`Mattermost。
    - 可达性规则：按钮回调 URL 必须能从 Mattermost 服务器访问。`localhost`MattermostOpenClawMattermost 仅在 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间时才有效。
    - 如果您的回调目标是私有/tailnet/内部网络，请将其主机/域名添加到 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。

  </Accordion>
</AccordionGroup>

### 直接 API 集成（外部脚本）

外部脚本和 Webhook 可以直接通过 Mattermost REST API 发布按钮，而无需通过代理的 MattermostAPI`message` 工具。尽可能使用插件中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

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
            id: "mybutton01", // alphanumeric only - see below
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

<Warning>
**关键规则**

1. 附件必须放在 `props.attachments` 中，而不是顶层的 `attachments` 中（会被静默忽略）。
2. 每个操作都需要 `type: "button"` - 没有它，点击将被静默吞没。
3. 每个操作都需要一个 `id`Mattermost 字段 - Mattermost 会忽略没有 ID 的操作。
4. 操作 `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`Mattermost）。连字符和下划线会破坏 Mattermost 的服务端操作路由（返回 404）。在使用前请将它们去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，以便确认消息显示按钮名称（例如，“Approve”）而不是原始 ID。
6. `context.action_id` 是必需的 - 没有它，交互处理器将返回 400。

</Warning>

**HMAC 令牌生成**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与网关验证逻辑匹配的令牌：

<Steps>
  <Step title="从 Bot 令牌派生密钥">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="构建上下文对象">构建包含所有字段（**除了** `_token`）的上下文对象。</Step>
  <Step title="使用排序键进行序列化">使用**排序键**和**无空格**进行序列化（网关使用带排序键的 `JSON.stringify`，这会产生紧凑输出）。</Step>
  <Step title="对负载进行签名">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="添加令牌">将生成的十六进制摘要作为 `_token` 添加到上下文中。</Step>
</Steps>

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

<AccordionGroup>
  <Accordion title="常见 HMAC 陷阱">
    - Python 的 `json.dumps` 默认添加空格（`{"key": "val"}`）。使用 `separators=(",", ":")` 以匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终对**所有**上下文字段（不包括 `_token`）进行签名。网关会移除 `_token`，然后对剩余的所有内容进行签名。对子集进行签名会导致静默验证失败。
    - 使用 `sort_keys=True`Mattermost —— 网关在签名前会对键进行排序，而 Mattermost 在存储负载时可能会重新排序上下文字段。
    - 从 bot 令牌派生密钥（确定性的），而不是随机字节。密钥必须在创建按钮的进程和进行验证的网关之间保持一致。

  </Accordion>
</AccordionGroup>

## 目录适配器

Mattermost 插件包含一个目录适配器，可通过 Mattermost API 解析渠道和用户名。这启用了 `openclaw message send` 和 cron/webhook 投递中的 `#channel-name` 和 `@username` 目标。

无需配置 —— 适配器使用账户配置中的 bot 令牌。

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

<AccordionGroup>
  <Accordion title="渠道中无回复">
    确保 bot 在渠道中并提及它（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。
  </Accordion>
  <Accordion title="身份验证或多账户错误">
    - 检查 bot 令牌、基础 URL 以及账户是否已启用。
    - 多账户问题：环境变量仅适用于 `default` 账户。

  </Accordion>
  <Accordion title="Native slash commands fail">
    - `Unauthorized: invalid command token.`: OpenClaw 未接受回调令牌。常见原因：
      - 斜杠命令注册失败或在启动时仅部分完成
      - 回调正在访问错误的网关/账户
      - Mattermost 仍有指向先前回调目标的旧命令
      - 网关在未重新激活斜杠命令的情况下重启
    - 如果原生斜杠命令停止工作，请检查日志中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略了 `callbackUrl` 并且日志警告回调解析为 `http://127.0.0.1:18789/...`，则该 URL 可能仅在 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间中时才可访问。请改为设置显式的外部可访问的 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="Buttons issues">
    - 按钮显示为白框：Agent 可能正在发送格式错误的按钮数据。请检查每个按钮是否同时具有 `text` 和 `callback_data` 字段。
    - 按钮渲染但点击无反应：验证 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，并且 ServiceSettings 中的 `EnablePostActionIntegration` 为 `true`。
    - 点击按钮返回 404：按钮的 `id` 可能包含连字符或下划线。Mattermost 的操作路由在遇到非字母数字 ID 时会中断。请仅使用 `[a-zA-Z0-9]`Gateway(网关)。
    - Gateway 记录 `invalid _token`Gateway(网关) 日志：HMAC 不匹配。请检查您是否对所有上下文字段（而非子集）进行了签名，使用了排序后的键，并使用了紧凑的 JSON（无空格）。请参阅上面的 HMAC 部分。
    - Gateway 记录 `missing _token in context` 日志：`_token` 字段不在按钮的上下文中。确保在构建集成负载时包含该字段。
    - 确认显示原始 ID 而非按钮名称：`context.action_id` 与按钮的 `id` 不匹配。将两者设置为相同的经过清理的值。
    - Agent 不知道按钮：将 `capabilities: ["inlineButtons"]` 添加到 Mattermost 渠道配置中。

  </Accordion>
</AccordionGroup>

## 相关

- [Channel Routing](/zh/channels/channel-routing) - 消息的会话路由
- [Channels Overview](/zh/channels) - 所有支持的渠道
- [Groups](/zh/channels/groups) - 群聊行为和提及限制
- [Pairing](/zh/channels/pairing) - 私信认证和配对流程
- [Security](/zh/gateway/security) - 访问模型和加固
