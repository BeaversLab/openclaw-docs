---
summary: "Mattermost 机器人设置和 OpenClaw 配置"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

状态：捆绑插件（机器人令牌 + WebSocket 事件）。支持频道、群组和私信。Mattermost 是一个可自行托管的团队消息平台；有关产品详情和下载，请参阅 [mattermost.com](https://mattermost.com) 上的官方网站。

## 捆绑插件

<Note>Mattermost 作为捆绑插件包含在当前的 OpenClaw 版本中，因此正常的打包构建不需要单独安装。</Note>

如果您使用的是旧版本构建或排除了 Mattermost 的自定义安装，请手动安装：

<Tabs>
  <Tab title="npm 注册表">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="本地检出">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

详情：[插件](/zh/tools/plugin)

## 快速设置

<Steps>
  <Step title="确保插件可用">
    当前的打包 OpenClaw 版本已包含它。旧版本/自定义安装可以使用上述命令手动添加。
  </Step>
  <Step title="创建 Mattermost 机器人">
    创建一个 Mattermost 机器人帐户并复制 **机器人令牌**。
  </Step>
  <Step title="复制基础 URL">
    复制 Mattermost **基础 URL**（例如 `https://chat.example.com`）。
  </Step>
  <Step title="配置 OpenClaw 并启动网关">
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

原生斜杠命令是可选的。启用后，OpenClaw 会通过 Mattermost API 注册 `oc_*` 斜杠命令，并在网关 HTTP 服务器上接收回调 POST 请求。

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
  <Accordion title="行为说明">
    - 对于 Mattermost，`native: "auto"` 默认处于禁用状态。设置 `native: true` 以启用。
    - 如果省略 `callbackUrl`，OpenClaw 将根据网关主机/端口 + `callbackPath` 推导出一个。
    - 对于多账户设置，`commands` 可以设置在顶层或 `channels.mattermost.accounts.<id>.commands` 下（账户值将覆盖顶层的字段）。
    - 命令回调使用当 OpenClaw 注册 `oc_*` 命令时 Mattermost 返回的每个命令令牌进行验证。
    - 如果注册失败、启动未完成，或者回调令牌与已注册命令的令牌不匹配，斜杠回调将以失败关闭（fail closed）方式处理。
  </Accordion>
  <Accordion title="可达性要求">
    回调端点必须可从 Mattermost 服务器访问。

    - 除非 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间中，否则不要将 `callbackUrl` 设置为 `localhost`。
    - 除非您的 Mattermost 基础 URL 将 `/api/channels/mattermost/command` 反向代理到 OpenClaw，否则不要将 `callbackUrl` 设置为该 URL。
    - 一个快速检查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 请求应从 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。

  </Accordion>
  <Accordion title="Mattermost 出站允许列表">
    如果您的回调目标是私有/tailnet/内部地址，请设置 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回调主机/域名。

    使用主机/域名条目，而非完整的 URL。

    - 好： `gateway.tailnet-name.ts.net`
    - 坏： `https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 环境变量（默认账户）

如果您更倾向于使用环境变量，请在网关主机上设置以下内容：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
环境变量仅适用于**默认**帐户 (`default`)。其他帐户必须使用配置值。

`MATTERMOST_URL` 无法从工作区 `.env` 设置；请参阅 [工作区 `.env` 文件](/zh/gateway/security)。

</Note>

## 聊天模式

Mattermost 会自动回复私信。渠道行为由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall (default)">仅在渠道中被 @提及时回复。</Tab>
  <Tab title="onmessage">回复每一条渠道消息。</Tab>
  <Tab title="onchar">当消息以触发前缀开头时回复。</Tab>
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

注意事项：

- `onchar` 仍会响应明确的 @提及。
- `channels.mattermost.requireMention` 在旧版配置中仍然有效，但推荐使用 `chatmode`。

## 线程与会话

使用 `channels.mattermost.replyToMode` 来控制渠道和群组的回复是保留在主渠道中，还是在触发帖子下启动一个线程。

- `off` (默认)：仅当入站帖子本身位于线程中时，才在线程中回复。
- `first`：对于顶层的渠道/群组帖子，在该帖子下启动一个线程，并将对话路由到线程范围的会话。
- `all`：目前与 `first` 在 Mattermost 中的行为相同。
- 私信忽略此设置，并保持非线程化。

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

- 线程范围的会话使用触发帖子的 ID 作为线程根。
- `first` 和 `all` 目前是等效的，因为一旦 Mattermost 有了线程根，后续的文本块和媒体都会继续在同一线程中进行。

## 访问控制 (私信)

- 默认值：`channels.mattermost.dmPolicy = "pairing"` (未知发送者将收到配对代码)。
- 通过以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 渠道 (群组)

- 默认值：`channels.mattermost.groupPolicy = "allowlist"`（提及触发）。
- 使用 `channels.mattermost.groupAllowFrom` 将发送者加入允许列表（建议使用用户 ID）。
- 每个渠道的提及覆盖设置位于 `channels.mattermost.groups.<channelId>.requireMention` 下，或者使用 `channels.mattermost.groups["*"].requireMention` 作为默认值。
- `@username` 匹配是可变的，并且仅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时启用。
- 开放渠道：`channels.mattermost.groupPolicy="open"`（提及触发）。
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

将这些目标格式与 `openclaw message send` 或 cron/webhooks 一起使用：

- `channel:<id>` 用于渠道
- `user:<id>` 用于私信
- `@username` 用于私信（通过 Mattermost API 解析）

<Warning>
在 Mattermost 中，原始的不透明 ID（如 `64ifufp...`）是**有歧义的**（用户 ID 与渠道 ID）。

OpenClaw 会以**用户优先**的方式解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 将通过 `/api/v4/channels/direct` 解析直接渠道来发送**私信**。
- 否则，该 ID 将被视为**渠道 ID**。

如果您需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

</Warning>

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

- 这仅适用于私信渠道创建（`/api/v4/channels/direct`），而不适用于每次 Mattermost API 调用。
- 重试适用于速率限制、5xx 响应以及网络或超时错误等瞬态故障。
- 除 `429` 外的 4xx 客户端错误被视为永久性错误，不会重试。

## 预览流式传输

Mattermost 将思考、工具活动和部分回复文本流式传输到单个**草稿预览帖子**中，当最终答案可以安全发送时，该帖子会在原位完成。预览在同一帖子 ID 上更新，而不是向渠道发送逐块消息垃圾信息。媒体/错误最终结果会取消待处理的预览编辑，并使用正常传递，而不是刷新一次性预览帖子。

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
  <Accordion title="流式传输模式">
    - `partial` 是通常的选择：一个预览帖子，随着回复的增长进行编辑，然后使用完整答案完成。
    - `block` 在预览帖子内使用追加样式的草稿块。
    - `progress` 在生成时显示状态预览，并仅在完成时发布最终答案。
    - `off` 禁用预览流式传输。
  </Accordion>
  <Accordion title="流式传输行为说明">
    - 如果流无法在原位完成（例如帖子在流传输过程中被删除），OpenClaw 将回退到发送一个新的最终帖子，以确保回复永不丢失。
    - 仅包含推理的内容负载将从渠道帖子中屏蔽，包括作为 `> Reasoning:` 引用块到达的文本。设置 `/reasoning on` 以在其他界面中查看思考过程；Mattermost 最终帖子仅保留答案。
    - 有关渠道映射矩阵，请参阅 [流式传输](/zh/concepts/streaming#preview-streaming-modes)。
  </Accordion>
</AccordionGroup>

## 回应（消息工具）

- 将 `message action=react` 与 `channel=mattermost` 结合使用。
- `messageId` 是 Mattermost 帖子 ID。
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
- 按帐户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互式按钮（消息工具）

发送带有可点击按钮的消息。当用户点击按钮时，代理会接收选择并可以做出响应。

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
  <Step title="Buttons replaced with confirmation">所有按钮均替换为确认行（例如，“✓ **Yes** selected by @user”）。</Step>
  <Step title="Agent receives the selection">代理接收选择作为入站消息并进行响应。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Implementation notes">
    - 按钮回调使用 HMAC-SHA256 验证（自动进行，无需配置）。
    - Mattermost 从其 API 响应中剥离回调数据（安全功能），因此点击时会移除所有按钮 — 无法进行部分移除。
    - 包含连字符或下划线的操作 ID 会自动进行清理（Mattermost 路由限制）。
  </Accordion>
  <Accordion title="配置和可达性">
    - `channels.mattermost.capabilities`: 功能字符串数组。添加 `"inlineButtons"` 以在代理系统提示中启用按钮工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`: 按钮回调的可选外部基础 URL（例如 `https://gateway.example.com`）。当 Mattermost 无法直接通过其绑定主机访问网关时使用此项。
    - 在多账户设置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置相同的字段。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 将从 `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后回退到 `http://localhost:<port>`。
    - 可达性规则：按钮回调 URL 必须可从 Mattermost 服务器访问。`localhost` 仅在 Mattermost 和 OpenClaw 运行在同一主机/网络命名空间时才有效。
    - 如果您的回调目标是私有/tailnet/内部网络，请将其主机/域添加到 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 中。
  </Accordion>
</AccordionGroup>

### 直接 API 集成（外部脚本）

外部脚本和 webhook 可以直接通过 Mattermost REST API 发布按钮，而不是通过代理的 `message` 工具。如果可能，请使用插件中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

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

<Warning>
**关键规则**

1. 附件位于 `props.attachments` 中，而非顶层 `attachments`（会被静默忽略）。
2. 每个操作都需要 `type: "button"` — 没有它，点击会被静默吞没。
3. 每个操作都需要一个 `id` 字段 — Mattermost 会忽略没有 ID 的操作。
4. 操作 `id` 必须**仅包含字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏 Mattermost 的服务器端操作路由（返回 404）。使用前请将其去除。
5. `context.action_id` 必须与按钮的 `id` 匹配，以便确认消息显示按钮名称（例如“批准”）而不是原始 ID。
6. `context.action_id` 是必需的 — 交互处理程序没有它会返回 400。
   </Warning>

**HMAC 令牌生成**

网关使用 HMAC-SHA256 验证按钮点击。外部脚本必须生成与网关验证逻辑匹配的令牌：

<Steps>
  <Step title="从 Bot 令牌派生密钥">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="构建上下文对象">使用所有字段（`_token` 除外）构建上下文对象。</Step>
  <Step title="使用排序的键进行序列化">使用**排序的键**且**不带空格**进行序列化（网关使用带排序键的 `JSON.stringify`，这会产生紧凑的输出）。</Step>
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
    - Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。请使用 `separators=(",", ":")` 来匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
    - 始终对**所有**上下文字段进行签名（不包括 `_token`）。网关会去除 `_token` 然后对剩余的所有内容进行签名。对子集进行签名会导致静默验证失败。
    - 使用 `sort_keys=True` —— 网关会在签名前对键进行排序，而 Mattermost 在存储负载时可能会重新排序上下文字段。
    - 从 bot 令牌派生密钥（确定性的），而不是随机字节。密钥在创建按钮的进程和进行验证的网关之间必须保持一致。
  </Accordion>
</AccordionGroup>

## 目录适配器

Mattermost 插件包含一个目录适配器，通过 Mattermost API 解析渠道和用户名。这启用了 `#channel-name` 和 `@username` 目标，用于 `openclaw message send` 和 cron/webhook 投递。

无需配置 —— 适配器使用账户配置中的 bot 令牌。

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

<AccordionGroup>
  <Accordion title="渠道内无回复">请确保 bot 在渠道中并提及它（oncall），使用触发前缀（onchar），或设置 `chatmode: "onmessage"`。</Accordion>
  <Accordion title="身份验证或多账户错误">- 检查 bot 令牌、基础 URL 以及账户是否已启用。 - 多账户问题：环境变量仅适用于 `default` 账户。</Accordion>
  <Accordion title="Native slash commands fail">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回调令牌。常见原因： - 启动时斜杠命令注册失败或仅部分完成 - 回调命中了错误的网关/账户 - Mattermost 仍有指向先前回调目标的旧命令 - 网关重启后未重新激活斜杠命令 - 如果原生斜杠命令停止工作，请检查日志中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略了 `callbackUrl` 并且日志警告回调解析为 `http://127.0.0.1:18789/...`，则该 URL 可能仅在 Mattermost 与 OpenClaw 运行在同一主机/网络命名空间时才可访问。请改为设置一个明确的外部可访问的 `commands.callbackUrl`。
  </Accordion>
  <Accordion title="Buttons issues">
    - Buttons appear as white boxes: the agent may be sending malformed button data. Check that each button has both `text` and `callback_data` fields. - Buttons render but clicks do nothing: verify `AllowedUntrustedInternalConnections` in Mattermost server config includes `127.0.0.1 localhost`, and that `EnablePostActionIntegration` is `true` in ServiceSettings. - Buttons return 404 on click: the
    button `id` likely contains hyphens or underscores. Mattermost's action router breaks on non-alphanumeric IDs. Use `[a-zA-Z0-9]` only. - Gateway logs `invalid _token`: HMAC mismatch. Check that you sign all context fields (not a subset), use sorted keys, and use compact JSON (no spaces). See the HMAC section above. - Gateway logs `missing _token in context`: the `_token` field is not in the
    button's context. Ensure it is included when building the integration payload. - Confirmation shows raw ID instead of button name: `context.action_id` does not match the button's `id`. Set both to the same sanitized value. - Agent doesn't know about buttons: add `capabilities: ["inlineButtons"]` to the Mattermost 渠道 config.
  </Accordion>
</AccordionGroup>

## 相关

- [Channel Routing](/zh/channels/channel-routing) — 会话 routing for messages
- [Channels Overview](/zh/channels) — all supported channels
- [Groups](/zh/channels/groups) — group chat behavior and mention gating
- [Pairing](/zh/channels/pairing) — 私信 authentication and pairing flow
- [Security](/zh/gateway/security) — access 模型 and hardening
