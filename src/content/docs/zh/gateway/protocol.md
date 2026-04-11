---
summary: "Gateway(网关) WebSocket 协议：握手、帧、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway(网关) 协议"
---

# Gateway(网关) 网关 协议 (WebSocket)

Gateway(网关) 网关 WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。
所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）
均通过 WebSocket 连接，并在握手时声明其**角色** + **作用域**。

## 传输

- WebSocket，带有 JSON 载荷的文本帧。
- 第一帧**必须**是一个 `connect` 请求。

## 握手 (连接)

Gateway(网关) 网关 → 客户端 (连接前挑战)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → Gateway(网关) 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway(网关) 网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

当设备令牌被签发时，`hello-ok` 还包括：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的启动引导期间，`hello-ok.auth` 可能还包括 `deviceTokens` 中的其他有界角色条目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

对于内置的节点/操作员启动流程，主节点令牌保持 `scopes: []` 状态，任何传递的操作员令牌保持绑定到启动引导操作员允许列表（`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`）。启动引导范围检查保持角色前缀：操作员条目仅满足操作员请求，而非操作员
角色仍需要在其自身角色前缀下的范围。

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要**幂等键**（请参阅架构）。

## 角色 + 范围

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能主机（camera/screen/canvas/system.run）。

### 范围（操作员）

常用范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

带有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

插件注册的 Gateway(网关) RPC 方法可以请求其自己的操作员范围，但
保留的核心管理员前缀（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终解析为 `operator.admin`。

Method scope is only the first gate. Some slash commands reached through
`chat.send` apply stricter command-level checks on top. For example, persistent
`/config set` and `/config unset` writes require `operator.admin`.

`node.pair.approve` also has an extra approval-time scope check on top of the
base method scope:

- commandless requests: `operator.pairing`
- requests with non-exec node commands: `operator.pairing` + `operator.write`
- requests that include `system.run`, `system.run.prepare`, or `system.which`:
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

Nodes declare capability claims at connect time:

- `caps`: high-level capability categories.
- `commands`: command allowlist for invoke.
- `permissions`: granular toggles (e.g. `screen.record`, `camera.capture`).

The Gateway(网关) treats these as **claims** and enforces server-side allowlists.

## Presence

- `system-presence` returns entries keyed by device identity.
- Presence entries include `deviceId`, `roles`, and `scopes` so UIs can show a single row per device
  even when it connects as both **operator** and **node**.

## Common RPC method families

This page is not a generated full dump, but the public WS surface is broader
than the handshake/auth examples above. These are the main method families the
Gateway(网关) exposes today.

`hello-ok.features.methods` is a conservative discovery list built from
`src/gateway/server-methods-list.ts` plus loaded plugin/渠道 method exports.
Treat it as feature discovery, not as a generated dump of every callable helper
implemented in `src/gateway/server-methods/*.ts`.

### System and identity

- `health` returns the cached or freshly probed gateway health snapshot.
- `status` 返回 `/status` 风格的网关摘要；敏感字段仅包含在具有 admin 作用域的 operator 客户端中。
- `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
- `system-presence` 返回已连接的 operator/节点设备的当前在线状态快照。
- `system-event` 添加系统事件并可以更新/广播在线上下文。
- `last-heartbeat` 返回最新持久化的心跳事件。
- `set-heartbeats` 切换网关上的心跳处理。

### 模型与使用

- `models.list` 返回运行时允许的模型目录。
- `usage.status` 返回提供商使用时段/剩余配额摘要。
- `usage.cost` 返回日期范围的汇总成本使用摘要。
- `doctor.memory.status` 返回活动默认代理工作区的向量内存/嵌入就绪状态。
- `sessions.usage` 返回按会话的使用摘要。
- `sessions.usage.timeseries` 返回单个会话的时序使用情况。
- `sessions.usage.logs` 返回单个会话的使用日志条目。

### 渠道和登录助手

- `channels.status` 返回内置 + 捆绑的渠道/插件状态摘要。
- `channels.logout` 在渠道支持登出的情况下注销特定渠道/账户。
- `web.login.start` 为当前支持二维码的 Web 渠道提供商启动二维码/Web 登录流程。
- `web.login.wait` 等待该二维码/Web 登录流程完成，并在成功后启动渠道。
- `push.test` 向注册的 iOS 节点发送测试 APNs 推送。
- `voicewake.get` 返回存储的唤醒词触发器。
- `voicewake.set` 更新唤醒词触发器并广播更改。

### 消息传递和日志

- `send` 是用于聊天运行器之外的渠道/账户/线程定向发送的直接出站传递 RPC。
- `logs.tail` 返回配置的网关文件日志尾部，带有游标/限制和最大字节控制。

### 对话与 TTS

- `talk.config` 返回有效的 Talk 配置负载；`includeSecrets`
  需要 `operator.talk.secrets`（或 `operator.admin`）。
- `talk.mode` 设置/广播当前的 Talk 模式状态，用于 WebChat/Control UI
  客户端。
- `talk.speak` 通过活动的 Talk 语音提供商合成语音。
- `tts.status` 返回 TTS 启用状态、活动提供商、备用提供商
  以及提供商配置状态。
- `tts.providers` 返回可见的 TTS 提供商清单。
- `tts.enable` 和 `tts.disable` 切换 TTS 首选项状态。
- `tts.setProvider` 更新首选的 TTS 提供商。
- `tts.convert` 运行一次性文本转语音转换。

### Secrets、config、update 和 wizard

- `secrets.reload` 重新解析活动的 SecretRefs 并交换运行时机密状态
  仅在完全成功时。
- `secrets.resolve` 解析特定
  命令/目标集的命令目标机密分配。
- `config.get` 返回当前配置快照和哈希值。
- `config.set` 写入经过验证的配置负载。
- `config.patch` 合并部分配置更新。
- `config.apply` 验证并替换完整配置负载。
- `config.schema` 返回 Control UI 和
  CLI 工具使用的实时配置架构负载：schema、`uiHints`、版本和生成元数据，包括
  运行时可加载时的 plugin + 渠道 架构元数据。该架构
  包含从 UI 使用的相同标签
  和帮助文本派生的字段 `title` / `description` 元数据，包括嵌套对象、通配符、数组项
  和 `anyOf` / `oneOf` / `allOf` 组合分支（当存在匹配的字段
  文档时）。
- `config.schema.lookup` 返回单个配置路径的范围限定查找负载：标准化路径、浅层架构节点、匹配的提示 + `hintPath`，以及用于 UI/CLI 向下钻取的直接子级摘要。
  - 查找架构节点保留面向用户的文档和常用验证字段：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、
    数值/字符串/数组/对象边界，以及布尔标志，例如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子级摘要公开 `key`、标准化的 `path`、`type`、`required`、
    `hasChildren`，以及匹配的 `hint` / `hintPath`。
- `update.run` 运行网关更新流程，并且仅在更新本身成功时才安排重启。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 公开新手引导向导。

### 现有的主要系列

#### 代理和工作区辅助程序

- `agents.list` 返回已配置的代理条目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和
  工作区连接。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为
  代理公开的引导工作区文件。
- `agent.identity.get` 返回代理或
  会话的有效助手身份。
- `agent.wait` 等待运行完成，并在可用时返回终端快照。

#### 会话控制

- `sessions.list` 返回当前会话索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 切换当前 WS 客户端的会话更改事件订阅。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换单个会话的脚本/消息事件订阅。
- `sessions.preview` 返回特定会话键的有界脚本预览。
- `sessions.resolve` 解析或规范化会话目标。
- `sessions.create` 创建新的会话条目。
- `sessions.send` 向现有会话发送一条消息。
- `sessions.steer` 是用于活动会话的中断和引导变体。
- `sessions.abort` 中止会话的活动工作。
- `sessions.patch` 更新会话元数据/覆盖设置。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
- `sessions.get` 返回完整的存储会话行。
- 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。
- `chat.history` 针对客户端进行了显示规范化：内联指令标签从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）和泄漏的 ASCII/全角模型控制令牌被剥离，精确的纯静默令牌助手行（如 `NO_REPLY` / `no_reply`）被省略，超大行可以被占位符替换。

#### 设备配对和设备令牌

- `device.pair.list` 返回待定和已批准的配对设备。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
- `device.token.rotate` 在其批准的角色和范围内轮换配对设备令牌。
- `device.token.revoke` 撤销配对设备令牌。

#### 节点配对、调用和待处理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、
  `node.pair.reject` 和 `node.pair.verify` 涵盖了节点配对和启动引导
  验证。
- `node.list` 和 `node.describe` 返回已知/已连接的节点状态。
- `node.rename` 更新已配对节点的标签。
- `node.invoke` 将命令转发给已连接的节点。
- `node.invoke.result` 返回调用请求的结果。
- `node.event` 将源于节点的事件传送回网关。
- `node.canvas.capability.refresh` 刷新具有作用域的画布能力令牌。
- `node.pending.pull` 和 `node.pending.ack` 是已连接节点队列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开连接节点的持久化
  待处理工作。

#### 审批系列

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 涵盖一次性执行审批请求以及待处理
  审批的查找/重放。
- `exec.approval.waitDecision` 等待一个待处理的执行审批并返回
  最终决定（或在超时时返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理网关执行审批
  策略快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令管理节点本地执行
  审批策略。
- `plugin.approval.request`、`plugin.approval.list`、
  `plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖
  插件定义的审批流程。

#### 其他主要系列

- 自动化：
  - `wake` 调度立即或在下一次心跳时的唤醒文本注入
  - `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、
    `cron.run`、`cron.runs`
- 技能/工具：`skills.*`、`tools.catalog`、`tools.effective`

### 常见事件系列

- `chat`：UI 聊天更新，如 `chat.inject` 以及其他仅对话记录的聊天
  事件。
- `session.message` 和 `session.tool`：已订阅会话的
  对话记录/事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统在线状态快照更新。
- `tick`：定期保活/存活事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行/任务更改事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`: 配对设备生命周期。
- `voicewake.changed`: 唤醒词触发配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`: 执行批准
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`: 插件批准
  生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins` 来获取当前的技能可执行文件列表
  以进行自动允许检查。

### 操作员辅助方法

- 操作员可以调用 `tools.catalog` (`operator.read`) 来获取代理的
  运行时工具目录。响应包括分组工具和出处元数据：
  - `source`: `core` 或 `plugin`
  - `pluginId`: 当 `source="plugin"` 时的插件所有者
  - `optional`: 插件工具是否可选
- 操作员可以调用 `tools.effective` (`operator.read`) 来获取会话的
  运行时有效工具清单。
  - 需要 `sessionKey`。
  - 网关从会话的服务器端派生可信的运行时上下文，而不是接受调用方提供的身份验证或传递上下文。
  - 响应的作用域限定为会话，并反映了当前活动对话可以立即使用的内容，包括核心、插件和渠道工具。
- 操作员可以调用 `skills.status` (`operator.read`) 来获取代理的
  可见技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺失要求、配置检查以及经过清理的安装选项，而不暴露原始的机密值。
- 操作员可以调用 `skills.search` 和 `skills.detail` (`operator.read`) 以获取
  ClawHub 发现元数据。
- 操作员可以 `skills.install` (`operator.admin`) 以两种模式调用：
  - ClawHub 模式: `{ source: "clawhub", slug, version?, force? }` 将
    技能文件夹安装到默认代理工作区 `skills/` 目录中。
  - Gateway(网关) 安装程序模式: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在网关主机上运行声明的 `metadata.openclaw.install` 操作。
- 操作员可以 `skills.update` (`operator.admin`) 以两种模式调用：
  - ClawHub 模式会更新默认代理工作区中的一个跟踪 slug 或所有跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## 执行批准

- 当 exec 请求需要批准时，网关会广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 来解决（需要 `operator.approvals` 作用域）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 获得批准后，转发的 `node.invoke system.run` 调用将重用该规范
  `systemRunPlan` 作为权威命令/cwd/会话上下文。
- 如果调用者在准备阶段和最终批准的 `system.run` 转发之间更改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网
  网关将拒绝运行，而不是信任被更改的载荷。

## Agent 传递回退

- `agent` 请求可以包含 `deliver=true` 以请求出站传递。
- `bestEffortDeliver=false` 保持严格行为：无法解析或仅限内部的传递目标返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析外部可传递路由时回退到仅会话执行（例如内部/web聊天会话或多渠道配置歧义的情况）。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的请求。
- 模式（Schemas）+ 模型是从 TypeBox 定义生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 身份验证

- 共享密钥网关身份验证根据配置的身份验证模式使用 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 具有身份的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非环回
  `gateway.auth.mode: "trusted-proxy"`，从
  请求头而不是 `connect.params.auth.*` 满足连接身份验证检查。
- Private-ingress `gateway.auth.mode: "none"` 完全跳过共享密钥连接身份验证；切勿在公共/不受信任的入口上公开该模式。
- 配对后，Gateway(网关) 会发出一个范围限定于连接角色和范围的 **设备令牌**。它在 `hello-ok.auth.deviceToken` 中返回，客户端应将其持久化以供将来连接使用。
- 客户端应在任何成功连接后持久化主 `hello-ok.auth.deviceToken`。
- 使用该**已存储**设备令牌重新连接时，还应复用为该令牌存储的
  已批准作用域集。这保留已授予的读取/探测/状态访问权限，
  并避免静默将重新连接的范围缩小为仅限管理员的隐式作用域。
- 正常连接身份验证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，接着是存储的每设备令牌，最后是引导令牌。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导交接令牌。仅当连接在受信任的传输（如 `wss://` 或环回/本地配对）上使用引导身份验证时，才应持久化它们。
- 如果客户端提供了 **显式** `deviceToken` 或显式 `scopes`，则该调用者请求的范围集保持权威；仅当客户端重用存储的每设备令牌时，才会重用缓存的范围。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 轮换/撤销（需要 `operator.pairing` 范围）。
- 令牌的颁发/轮换始终受限于记录在该设备配对条目中的已批准角色集；轮换令牌无法将设备扩展到配对批准从未授予的角色。
- 对于已配对设备令牌会话，除非调用者还具有 `operator.admin`，否则设备管理是自范围的：非管理员调用者只能删除/撤销/轮换其 **自己** 的设备条目。
- `device.token.rotate` 还会根据调用者当前的会话范围检查请求的操作员范围集。非管理员调用者无法将令牌轮换到比其当前持有的范围更广的操作员范围集。
- 身份验证失败包括 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`（`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`）
- 客户端针对 `AUTH_TOKEN_MISMATCH` 的行为：
  - 可信客户端可能会尝试使用缓存的每设备令牌进行一次有界的重试。
  - 如果重试失败，客户端应停止自动重连循环并向操作员提供操作指导。

## 设备身份 + 配对

- 节点应包含从密钥对指纹派生的稳定设备标识（`device.id`）。
- 网关针对每个设备 + 角色颁发令牌。
- 除非启用了本地自动批准，否则新的设备 ID 需要配对批准。
- 配对自动批准以直接本地 loopback 连接为中心。
- OpenClaw 还有一个用于受信任共享密钥辅助流程的狭窄后端/容器本地自连接路径。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，需要批准。
- 所有 WS 客户端都必须在 `connect` 期间包含 `device` 身份（operator + node）。
  控制 UI 仅在这些模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅限本地主机的不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` operator 控制 UI 身份验证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` （紧急情况，严重安全降级）。
- 所有连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备认证迁移诊断

对于仍然使用挑战前签名行为的旧版客户端，`connect` 现在会在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并带有稳定的 `error.details.reason`。

常见迁移故障：

| 消息                        | details.code                     | details.reason           | 含义                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或发送了空值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用过时/错误的 nonce 进行了签名。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名的时间戳超出允许的偏差范围。              |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                         |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器随机数的 v2 载荷进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选的签名负载是 `v3`，除了 device/client/role/scopes/token/nonce 字段外，它还绑定了 `platform` 和 `deviceFamily`。
- 出于兼容性原因，仍然接受传统的 `v2` 签名，但在重新连接时，配对设备元数据固定仍然控制命令策略。

## TLS + 固定

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（请参阅 `gateway.tls` 配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 作用域

此协议公开了**完整的 API**（状态、频道、模型、聊天、代理、会话、节点、审批等）。确切的范围由 `src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。
