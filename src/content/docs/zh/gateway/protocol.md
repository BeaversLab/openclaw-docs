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
- 第一帧**必须**是 `connect` 请求。

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
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`、`features`、`snapshot` 和 `policy` 都是架构所必需的
(`src/gateway/protocol/schema/frames.ts`)。`canvasHostUrl` 是可选的。`auth`
在可用时报告协商的角色/范围，并在网关颁发时包含 `deviceToken`。

当未颁发设备令牌时，`hello-ok.auth` 仍可报告协商的
权限：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

当颁发设备令牌时，`hello-ok` 还包括：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引导交接期间，`hello-ok.auth` 可能还包括 `deviceTokens` 中的其他
有界角色条目：

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

对于内置的节点/操作员引导流程，主节点令牌保持
`scopes: []`，并且任何传递的操作员令牌保持受限于引导
操作员允许列表 (`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`)。引导范围检查保持
角色前缀：操作员条目仅满足操作员请求，而非操作员
角色仍需要其自身角色前缀下的范围。

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

## 帧结构

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

副作用方法需要**幂等键**（参见架构）。

## 角色 + 范围

### 角色

- `operator` = 控制平面客户端 (CLI/UI/automation)。
- `node` = 功能宿主 (camera/screen/canvas/system.run)。

### 范围（操作员）

通用范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 配合 `includeSecrets: true` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

插件注册的 Gateway RPC 方法可以请求自己的 operator scope，但
保留的核心管理员前缀（`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`）始终解析为 `operator.admin`。

Method scope 只是第一道关卡。通过 `chat.send` 访问的某些斜杠命令会在其上应用更严格的命令级检查。例如，持久的 `/config set` 和 `/config unset` 写入需要 `operator.admin`。

`node.pair.approve` 在基础 method scope 之上还有一个额外的批准时 scope 检查：

- 无命令请求：`operator.pairing`
- 带有非 exec 节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

节点在连接时声明 capability claims：

- `caps`：高级能力类别。
- `commands`：用于调用的命令允许列表。
- `permissions`：细粒度切换开关（例如 `screen.record`, `camera.capture`）。

Gateway(网关) 将这些视为 **claims** 并执行服务端允许列表。

## Presence

- `system-presence` 返回按设备身份键入的条目。
- Presence 条目包括 `deviceId`、`roles` 和 `scopes`，以便即使设备同时作为 **operator** 和 **node** 连接，UI 也能为每个设备显示一行。

## 常用 RPC 方法系列

此页面不是生成的完整转储，但公共 WS 表面比上述握手/身份验证示例更广泛。这些是 Gateway(网关) 当前公开的主要方法系列。

`hello-ok.features.methods` 是一个保守的发现列表，由
`src/gateway/server-methods-list.ts` 以及加载的插件/渠道方法导出构建而成。
请将其视为功能发现，而不是 `src/gateway/server-methods/*.ts` 中实现的每个可调用辅助程序的生成转储。

### 系统与身份

- `health` 返回缓存的或新探测的网关健康快照。
- `status` 返回 `/status` 风格的网关摘要；敏感字段
  仅包含在具有管理员作用域的运营商客户端中。
- `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
- `system-presence` 返回已连接的运营商/节点设备的当前存在快照。
- `system-event` 追加一个系统事件，并可以更新/广播存在上下文。
- `last-heartbeat` 返回最新持久化的心跳事件。
- `set-heartbeats` 切换网关上的心跳处理。

### 模型与使用情况

- `models.list` 返回运行时允许的模型目录。
- `usage.status` 返回提供商使用窗口/剩余配额摘要。
- `usage.cost` 返回日期范围内的聚合成本使用摘要。
- `doctor.memory.status` 返回活动默认代理工作区的向量内存/嵌入就绪状态。
- `sessions.usage` 返回每个会话的使用摘要。
- `sessions.usage.timeseries` 返回单个会话的时间序列使用情况。
- `sessions.usage.logs` 返回单个会话的使用日志条目。

### 渠道和登录辅助程序

- `channels.status` 返回内置+捆绑的渠道/插件状态摘要。
- `channels.logout` 登出特定的渠道/账户（前提是该渠道支持登出）。
- `web.login.start` 为当前支持二维码的网络渠道提供商启动二维码/网络登录流程。
- `web.login.wait` 等待该二维码/网络登录流程完成，并在成功时启动渠道。
- `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。
- `voicewake.get` 返回存储的唤醒词触发器。
- `voicewake.set` 更新唤醒词触发器并广播更改。

### 消息传递和日志

- `send` 是用于在聊天运行器之外针对 渠道/帐户/线程目标的直接出站传输 RPC。
- `logs.tail` 返回已配置的网关文件日志尾部，包含光标/限制和最大字节控制。

### 对话和 TTS

- `talk.config` 返回有效的对话配置有效载荷；`includeSecrets` 需要 `operator.talk.secrets` （或 `operator.admin`）。
- `talk.mode` 设置/广播 WebChat/控制 UI 客户端的当前对话模式状态。
- `talk.speak` 通过活动的对话语音提供商合成语音。
- `tts.status` 返回 TTS 启用状态、活动提供商、备用提供商和提供商配置状态。
- `tts.providers` 返回可见的 TTS 提供商清单。
- `tts.enable` 和 `tts.disable` 切换 TTS 偏好设置状态。
- `tts.setProvider` 更新首选 TTS 提供商。
- `tts.convert` 运行一次性文本转语音转换。

### 机密、配置、更新和向导

- `secrets.reload` 重新解析活动的 SecretRefs 并仅在完全成功时交换运行时机密状态。
- `secrets.resolve` 解析特定命令/目标集的命令目标机密分配。
- `config.get` 返回当前配置快照和哈希。
- `config.set` 写入已验证的配置有效载荷。
- `config.patch` 合并部分配置更新。
- `config.apply` 验证并替换完整配置有效载荷。
- `config.schema` 返回控制界面和 CLI 工具使用的实时配置架构负载：架构、`uiHints`、版本以及生成元数据，包括运行时能够加载时的插件 + 渠道架构元数据。该架构包含字段 `title` / `description` 元数据，这些元数据源自 UI 使用的相同标签和帮助文本，包括嵌套对象、通配符、数组项，以及当存在匹配字段文档时的 `anyOf` / `oneOf` / `allOf` 组合分支。
- `config.schema.lookup` 返回一个配置路径的范围限定查找负载：规范化路径、浅层架构节点、匹配的提示 + `hintPath`，以及用于 UI/CLI 向下钻取的直接子项摘要。
  - 查找架构节点保留面向用户的文档和常用验证字段：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`，
    数值/字符串/数组/对象边界，以及布尔标志，如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子项摘要公开 `key`、规范化的 `path`、`type`、`required`，
    `hasChildren`，以及匹配的 `hint` / `hintPath`。
- `update.run` 运行网关更新流程，并仅在更新本身成功时安排重启。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 公开新手引导向导。

### 现有的主要系列

#### 代理和工作区助手

- `agents.list` 返回已配置的代理条目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和工作区连接。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理公开的引导工作区文件。
- `agent.identity.get` 返回代理或会话的有效助手身份。
- `agent.wait` 等待运行完成，并在可用时返回最终快照。

#### 会话控制

- `sessions.list` 返回当前会话索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 切换当前 WS 客户端的会话更改事件订阅。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换单个会话的脚本/消息事件订阅。
- `sessions.preview` 返回特定会话键的受限脚本预览。
- `sessions.resolve` 解析或规范化会话目标。
- `sessions.create` 创建新的会话条目。
- `sessions.send` 向现有会话发送消息。
- `sessions.steer` 是活动会话的中断和引导变体。
- `sessions.abort` 中止会话的活动工作。
- `sessions.patch` 更新会话元数据/覆盖。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
- `sessions.get` 返回完整的存储会话行。
- 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。
- `chat.history` 针对 UI 客户端进行了显示标准化：内联指令标签已从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块）和泄露的 ASCII/全角模型控制令牌已被剥离，精确的 `NO_REPLY` / `no_reply` 等纯静默令牌助手行已被省略，过大的行可以用占位符替换。

#### 设备配对和设备令牌

- `device.pair.list` 返回待处理和已批准的配对设备。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
- `device.token.rotate` 在其批准的角色和范围边界内轮换配对设备令牌。
- `device.token.revoke` 撤销配对设备令牌。

#### 节点配对、调用和待处理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject` 和 `node.pair.verify` 涵盖了节点配对和引导验证。
- `node.list` 和 `node.describe` 返回已知/已连接的节点状态。
- `node.rename` 更新配对节点标签。
- `node.invoke` 将命令转发给已连接的节点。
- `node.invoke.result` 返回调用请求的结果。
- `node.event` 将节点发起的事件带回网关。
- `node.canvas.capability.refresh` 刷新作用域画布功能令牌。
- `node.pending.pull` 和 `node.pending.ack` 是已连接节点队列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 管理离线/未连接节点的持久待处理工作。

#### 审批系列

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 涵盖一次性执行审批请求以及待处理
  审批的查询/重放。
- `exec.approval.waitDecision` 等待一个待处理的执行审批并返回
  最终决定（或在超时时返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理网关执行审批
  策略快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令
  管理节点本地执行审批策略。
- `plugin.approval.request`、`plugin.approval.list`、
  `plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖
  插件定义的审批流程。

#### 其他主要系列

- 自动化：
  - `wake` 调度立即或下一次心跳唤醒文本注入
  - `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、
    `cron.run`、`cron.runs`
- 技能/工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`

### 常见事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 和其他仅限转录的聊天
  事件。
- `session.message` 和 `session.tool`：已订阅
  会话的转录/事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统在线状态快照更新。
- `tick`：定期保活/存活事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行/作业更改事件。
- `shutdown`：网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备生命周期。
- `voicewake.changed`：唤醒词触发配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`：执行批准
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件批准
  生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins` 来获取当前技能可执行文件列表
  以进行自动允许检查。

### 操作员辅助方法

- 操作员可以调用 `commands.list` (`operator.read`) 来获取代理的运行时
  命令清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - `scope` 控制主要 `name` 针对哪个表面：
    - `text` 返回不带前缀 `/` 的主要文本命令令牌
    - `native` 和默认 `both` 路径在可用时返回提供商感知的本地名称
  - `textAliases` 携带精确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在时携带提供商感知的本地命令名称。
  - `provider` 是可选的，仅影响本地命名和本地插件
    命令可用性。
  - `includeArgs=false` 在响应中省略序列化的参数元数据。
- 操作员可以调用 `tools.catalog` (`operator.read`) 来获取代理的运行时工具目录。响应包括分组工具和出处元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：`source="plugin"` 时的插件所有者
  - `optional`：插件工具是否可选
- 操作员可以调用 `tools.effective` (`operator.read`) 来获取会话的运行时有效工具清单。
  - `sessionKey` 是必需的。
  - Gateway(网关) 从服务端的会话中派生可信的运行时上下文，而不是接受调用者提供的身份验证或传递上下文。
  - 响应范围限定于会话，并反映了当前活动对话可以立即使用的内容，包括核心、插件和渠道工具。
- 操作员可以调用 `skills.status` (`operator.read`) 来获取代理的可见技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺失要求、配置检查和经过清理的安装选项，而不暴露原始机密值。
- 操作员可以调用 `skills.search` 和 `skills.detail` (`operator.read`) 来获取 ClawHub 发现元数据。
- 操作员可以通过两种模式调用 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将技能文件夹安装到默认代理工作区的 `skills/` 目录中。
  - Gateway(网关) 安装程序模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 在 Gateway(网关) 主机上运行声明的 `metadata.openclaw.install` 操作。
- 操作员可以通过两种模式调用 `skills.update` (`operator.admin`)：
  - ClawHub 模式会更新默认代理工作区中一个跟踪的 slug 或所有跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

## 执行批准

- 当执行请求需要批准时，Gateway(网关) 会广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 进行解析（需要 `operator.approvals` scope）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 获得批准后，转发的 `node.invoke system.run` 调用将重用该规范的
  `systemRunPlan` 作为权威的 command/cwd/会话 上下文。
- 如果调用方在 prepare 和最终批准的 `system.run` 转发之间更改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网关将拒绝运行，而不是信任更改后的 payload。

## Agent 交付回退

- `agent` 请求可以包含 `deliver=true` 以请求出站交付。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅限内部的目标返回 `INVALID_REQUEST`。
- 当无法解析外部可交付路由（例如内部/webchat 会话或歧义的多渠道配置）时，`bestEffortDeliver=true` 允许回退到仅会话执行。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema/protocol-schemas.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的情况。
- 模式 + 模型是根据 TypeBox 定义生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。这些值在协议 v3 中是稳定的，并且是第三方客户端的预期基线。

| 常量                               | 默认值                                          | 来源                                                       |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                 | `3`                                             | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| 请求超时（每个 RPC）               | `30_000` ms                                     | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| 预认证 / 连接质询超时              | `10_000` 毫秒                                   | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| 初始重连退避                       | `1_000` 毫秒                                    | `src/gateway/client.ts` (`backoffMs`)                      |
| 最大重连退避                       | `30_000` 毫秒                                   | `src/gateway/client.ts` (`scheduleReconnect`)              |
| 设备令牌关闭后的快速重试限制       | `250` 毫秒                                      | `src/gateway/client.ts`                                    |
| `terminate()` 之前的强制停止宽限期 | `250` 毫秒                                      | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| `stopAndWait()` 默认超时           | `1_000` 毫秒                                    | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| 默认心跳间隔 (`hello-ok` 之前)     | `30_000` 毫秒                                   | `src/gateway/client.ts`                                    |
| 心跳超时关闭                       | 当静默超过 `tickIntervalMs * 2` 时，代码 `4000` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                | `25 * 1024 * 1024` (25 MB)                      | `src/gateway/server-constants.ts`                          |

服务器在 `hello-ok` 中公布有效的 `policy.tickIntervalMs`、`policy.maxPayload`
和 `policy.maxBufferedBytes`；客户端应遵守这些值
而不是握手前的默认值。

## 认证

- 共享密钥网关认证使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具体取决于配置的认证模式。
- 承载身份的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非环回
  `gateway.auth.mode: "trusted-proxy"` 从请求头而不是 `connect.params.auth.*` 满足连接认证检查。
- 私有入口 `gateway.auth.mode: "none"` 完全跳过共享密钥连接认证；
  不要在公共/不受信任的入口上公开该模式。
- 配对后，Gateway(网关) 会发布一个作用于连接
  角色 + 范围的 **device token**。它在 `hello-ok.auth.deviceToken` 中返回，客户端应
  将其持久化以供将来连接使用。
- 客户端应在任何成功连接后持久化主 `hello-ok.auth.deviceToken`。
- 使用该 **已存储** 的设备令牌重新连接时，还应重用为该令牌存储的已批准作用域集。这保留了已授予的读取/探测/状态访问权限，并避免在静默中将重新连接的范围缩小到仅限管理员的隐式作用域。
- 客户端连接身份验证组装（`selectConnectAuth` 位于 `src/gateway/client.ts`）：
  - `auth.password` 是正交的，设置时始终会被转发。
  - `auth.token` 按优先顺序填充：首先是显式共享令牌，然后是显式 `deviceToken`，最后是存储的每设备令牌（由 `deviceId` + `role` 键控）。
  - 仅当上述均未解析出 `auth.token` 时，才发送 `auth.bootstrapToken`。共享令牌或任何解析出的设备令牌都会抑制它。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重试时自动提升存储的设备令牌仅限于 **受信任的端点** —— 环回，或具有固定 `tlsFingerprint` 的 `wss://`。没有固定的公共 `wss://` 不符合条件。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导交接令牌。仅当连接在受信任的传输（如 `wss://` 或环回/本地配对）上使用引导身份验证时，才持久化它们。
- 如果客户端提供 **显式** `deviceToken` 或显式 `scopes`，则该调用方请求的作用域集保持权威；仅当客户端重用存储的每设备令牌时，才会重用缓存的作用域。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 轮换/撤销（需要 `operator.pairing` 作用域）。
- 令牌颁发/轮换始终受限于该设备配对条目中记录的已批准角色集；轮换令牌无法将设备扩展到配对批准从未授予的角色。
- 对于配对设备令牌会话，除非调用者还拥有 `operator.admin`，否则设备管理是自我限定范围的：非管理员调用者只能删除/撤销/轮换其**自己的**设备条目。
- `device.token.rotate` 还会根据调用者当前的会话范围检查请求的操作员范围集。非管理员调用者无法将令牌轮换到比其当前拥有的范围更广的操作员范围集。
- 身份验证失败包括 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken` (布尔值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 针对 `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任的客户端可以使用缓存的每设备令牌尝试一次有界重试。
  - 如果该重试失败，客户端应停止自动重连循环并展示操作员操作指南。

## 设备身份 + 配对

- 节点应包含一个稳定的设备身份 (`device.id`)，该身份源自密钥对指纹。
- 网关会为每个设备 + 角色颁发令牌。
- 除非启用了本地自动批准，否则新的设备 ID 需要配对批准。
- 配对自动批准以直接本地环回连接为中心。
- OpenClaw 还有一个狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，并且需要批准。
- 所有 WS 客户端必须在 `connect` 期间包含 `device` 身份（操作员 + 节点）。控制 UI 仅在以下模式下可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅限本地主机的不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作员控制 UI 身份验证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (破窗，严重的安全降级)。
- 所有连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备身份迁移诊断

对于仍使用 pre-challenge 签名行为的旧版客户端，`connect` 现在会在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并带有稳定的 `error.details.reason`。

常见的迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端遗漏了 `device.nonce`（或发送了空值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用了过时/错误的 nonce 进行签名。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名的时间戳超出了允许的偏差范围。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                         |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器 nonce 的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选的签名负载是 `v3`，它除了设备/客户端/角色/范围/令牌/nonce 字段外，还绑定了 `platform` 和 `deviceFamily`。
- 为了兼容性，旧的 `v2` 签名仍然被接受，但在重新连接时，配对设备元数据固定仍然控制命令策略。

## TLS + 证书固定

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（参见 `gateway.tls` 配置以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

该协议暴露了**完整的网关 API**（状态、频道、模型、聊天、
代理、会话、节点、审批等）。精确的接口由
`src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。
