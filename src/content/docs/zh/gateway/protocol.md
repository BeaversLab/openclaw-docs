---
summary: "Gateway(网关) WebSocket 协议：握手、帧、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway(网关) protocol"
---

Gateway(网关) WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）均通过 WebSocket 连接，并在握手时声明其 **role** + **scope**。

## 传输

- WebSocket，带有 JSON 载荷的文本帧。
- 第一帧**必须**是 `connect` 请求。
- 连接前帧的上限为 64 KiB。成功握手后，客户端应遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。启用诊断后，超大的入站帧和缓慢的出站缓冲区会在 Gateway 关闭或丢弃受影响的帧之前发出 `payload.large` 事件。这些事件保留大小、限制、表面和安全原因代码。它们不保留消息正文、附件内容、原始帧正文、令牌、Cookie 或机密值。

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
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`、`features`、`snapshot` 和 `policy` 均为模式（`src/gateway/protocol/schema/frames.ts`）所必需。`auth` 也是必需的，用于报告协商的角色/范围。`canvasHostUrl` 是可选的。

当未颁发设备令牌时，`hello-ok.auth` 报告协商的权限（不带令牌字段）：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同一进程后端客户端（`client.id: "gateway-client"`、`client.mode: "backend"`）在使用共享 Gateway 令牌/密码进行身份验证时，可以在直接回环连接上省略 `device`。此路径保留给内部控制平面 RPC，并防止过时的 CLI/设备 配对基线阻塞本地后端工作（如子代理会话更新）。远程客户端、浏览器源客户端、节点客户端以及显式使用设备令牌/设备身份的客户端仍使用正常的配对和范围升级检查。

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

在受信任的引导移交期间，`hello-ok.auth` 可能还包括 `deviceTokens` 中的额外有界角色条目：

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
`scopes: []`，并且任何移交的操作员令牌都保持在引导操作员允许列表（`operator.approvals`， `operator.read`，
`operator.talk.secrets`， `operator.write`）范围内。引导范围检查保持
以角色为前缀：操作员条目仅满足操作员请求，而非操作员角色
仍需要在其自己的角色前缀下拥有范围。

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

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要**幂等密钥**（请参阅架构）。

## 角色 + 范围

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能宿主（camera/screen/canvas/system.run）。

### 作用域（操作员）

通用作用域：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

带有 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

插件注册的网关 RPC 方法可以请求其自己的操作员范围，但
保留的核心管理员前缀（`config.*`， `exec.approvals.*`， `wizard.*`，
`update.*`）始终解析为 `operator.admin`。

方法范围只是第一道关卡。通过
`chat.send` 访问的某些斜杠命令会在其上应用更严格的命令级检查。例如，持久
`/config set` 和 `/config unset` 写入需要 `operator.admin`。

`node.pair.approve` 在基础方法范围之上还有一个额外的批准时范围检查：

- 无命令请求：`operator.pairing`
- 带有非执行节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (node)

节点在连接时声明能力声明：

- `caps`: 高级功能类别。
- `commands`: 用于调用的命令允许列表。
- `permissions`: 细粒度开关（例如 `screen.record`，`camera.capture`）。

Gateway 将这些视为 **claims（声明）** 并在服务端强制执行允许列表。

## 在线状态

- `system-presence` 返回按设备身份键入的条目。
- 在线状态条目包括 `deviceId`、`roles` 和 `scopes`，因此即使设备同时以 **operator** 和 **node** 身份连接，UI 也能为每个设备显示单行信息。

## 广播事件范围限定

服务端推送的 WebSocket 广播事件受范围限制，因此配对范围或仅节点会话不会被动接收会话内容。

- **聊天、代理和工具结果帧**（包括流式 `agent` 事件和工具调用结果）至少需要 `operator.read`。没有 `operator.read` 的会话会完全跳过这些帧。
- **插件定义的 `plugin.*` 广播** 受限于 `operator.write` 或 `operator.admin`，具体取决于插件注册它们的方式。
- **状态和传输事件**（`heartbeat`、`presence`、`tick`、连接/断开生命周期等）保持不受限制，以便每个经过身份验证的会话都能观察到传输健康状况。
- **未知的广播事件系列**默认受作用域限制（故障关闭），除非注册的处理程序明确放宽限制。

每个客户端连接都保留自己的每客户端序列号，以便广播在该套接字上保持单调排序，即使不同客户端看到的事件流的不同范围过滤子集也是如此。

## 常见 RPC 方法族

公共 WS 表面比上面的握手/身份验证示例更广泛。这不是生成的转储—— `hello-ok.features.methods` 是一个保守的发现列表，由 `src/gateway/server-methods-list.ts` 以及加载的插件/渠道方法导出构建而成。将其视为功能发现，而不是对 `src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="系统和身份">
    - `health` 返回缓存或新探测的网关健康快照。
    - `diagnostics.stability` 返回最近的有界诊断稳定性记录器。它保留操作元数据，如事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称和会话 ID。它不保留聊天文本、Webhook 主体、工具输出、原始请求或响应主体、令牌、Cookie 或秘密值。需要操作员读取范围。
    - `status` 返回 `/status` 风格的网关摘要；敏感字段仅包含在具有管理员范围的操作员客户端中。
    - `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
    - `system-presence` 返回已连接操作员/节点设备的当前在线快照。
    - `system-event` 追加系统事件并可以更新/广播在线上下文。
    - `last-heartbeat` 返回最新持久化的心跳事件。
    - `set-heartbeats` 切换网关上的心跳处理。
  </Accordion>

  <Accordion title="模型和用法">
    - `models.list` 返回运行时允许的模型目录。
    - `usage.status` 返回提供商使用窗口/剩余配额摘要。
    - `usage.cost` 返回日期范围的聚合成本使用摘要。
    - `doctor.memory.status` 返回活动默认代理工作区的向量内存/缓存嵌入就绪状态。仅当调用者明确需要实时嵌入提供商 ping 时，才传递 `{ "probe": true }` 或 `{ "deep": true }`。
    - `sessions.usage` 返回每个会话的使用摘要。
    - `sessions.usage.timeseries` 返回一个会话的时间序列使用情况。
    - `sessions.usage.logs` 返回一个会话的使用日志条目。
  </Accordion>

<Accordion title="渠道和登录助手">
  - `channels.status` 返回内置和打包的渠道/插件状态摘要。 - `channels.logout` 注销特定渠道/账户（如果该渠道支持注销）。 - `web.login.start` 为当前支持二维码的 Web 渠道提供商启动二维码/Web 登录流程。 - `web.login.wait` 等待该二维码/Web 登录流程完成，并在成功时启动渠道。 - `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。 - `voicewake.get` 返回存储的唤醒词触发器。 - `voicewake.set`
  更新唤醒词触发器并广播更改。
</Accordion>

<Accordion title="消息和日志">- `send` 是用于在聊天运行器之外针对渠道/账户/线程目标发送的直接出站交付 RPC。 - `logs.tail` 返回配置的网关文件日志尾部，带有游标/限制和最大字节控制。</Accordion>

<Accordion title="Talk 和 TTS">
  - `talk.config` 返回有效的 Talk 配置负载；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。 - `talk.mode` 为 WebChat/Control UI 客户端设置/广播当前的 Talk 模式状态。 - `talk.speak` 通过活动的 Talk 语音提供商合成语音。 - `tts.status` 返回 TTS 启用状态、活动提供商、备用提供商和提供商配置状态。 - `tts.providers` 返回可见的 TTS 提供商清单。 - `tts.enable` 和 `tts.disable` 切换
  TTS 偏好状态。 - `tts.setProvider` 更新首选 TTS 提供商。 - `tts.convert` 运行一次性文本转语音转换。
</Accordion>

<Accordion title="Secrets, config, update, and wizard">
  - `secrets.reload` 重新解析活动的 SecretRefs，并仅在完全成功时交换运行时密钥状态。 - `secrets.resolve` 解析特定命令/目标集的命令目标密钥分配。 - `config.get` 返回当前配置快照和哈希值。 - `config.set` 写入经过验证的配置负载。 - `config.patch` 合并部分配置更新。 - `config.apply` 验证并替换完整的配置负载。 - `config.schema` 返回 Control UI 和 CLI
  工具使用的实时配置架构负载：schema、`uiHints`、版本和生成元数据，包括运行时可加载时的插件和渠道架构元数据。该架构包含字段 `title` / `description` 元数据，这些元数据源自 UI 使用的相同标签和帮助文本，包括嵌套对象、通配符、数组项以及 `anyOf` / `oneOf` / `allOf` 组合分支（当存在匹配的字段文档时）。 - `config.schema.lookup` 返回针对一个配置路径的范围限定查找负载：标准化路径、浅层架构节点、匹配的提示
  + `hintPath`，以及用于 UI/CLI 下钻的直接子项摘要。查找架构节点保留面向用户的文档和通用验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数字/字符串/数组/对象边界，以及诸如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子项摘要公开 `key`、标准化的 `path`、`type`、`required`、`hasChildren`，以及匹配的 `hint` / `hintPath`。 - `update.run`
  运行网关更新流程，并仅在更新本身成功时安排重启。 - `update.status` 返回最新的缓存更新重启标记（如果可用，还包括重启后的运行版本）。 - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 公开新手引导向导。
</Accordion>

<Accordion title="Agent and workspace helpers">- `agents.list` 返回已配置的代理条目。 - `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和工作区连接。 - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理公开的引导工作区文件。 - `agent.identity.get` 返回代理或会话的有效助手身份。 - `agent.wait` 等待运行完成，并在可用时返回终端快照。</Accordion>

<Accordion title="会话控制">
  - `sessions.list` 返回当前会话索引。 - `sessions.subscribe` 和 `sessions.unsubscribe` 切换当前 WS 客户端的会话更改事件订阅。 - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换单个会话的抄本/消息事件订阅。 - `sessions.preview` 返回特定会话键的有界抄本预览。 - `sessions.resolve` 解析或规范化会话目标。 - `sessions.create` 创建新的会话条目。 - `sessions.send`
  向现有会话发送消息。 - `sessions.steer` 是活动会话的中断和引导变体。 - `sessions.abort` 中止会话的活动工作。 - `sessions.patch` 更新会话元数据/覆盖。 - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。 - `sessions.get` 返回完整的存储会话行。 - 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 针对 UI
  客户端进行了显示规范化：内联指令标签从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌被剥离，精确的 `NO_REPLY` / `no_reply` 等纯静默令牌助手行被省略，过大的行可以用占位符替换。
</Accordion>

<Accordion title="设备配对和设备令牌">- `device.pair.list` 返回待定和已批准的配对设备。 - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。 - `device.token.rotate` 在其批准的角色和调用者作用域范围内轮换配对设备令牌。 - `device.token.revoke` 在其批准的角色和调用者作用域范围内撤销配对设备令牌。</Accordion>

<Accordion title="节点配对、调用和待处理工作">
  - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵盖节点配对和引导验证。 - `node.list` 和 `node.describe` 返回已知/已连接的节点状态。 - `node.rename` 更新配对节点标签。 - `node.invoke` 将命令转发到已连接的节点。 - `node.invoke.result` 返回调用请求的结果。 - `node.event` 将节点发起的事件传回网关。 -
  `node.canvas.capability.refresh` 刷新有作用域的画布能力令牌。 - `node.pending.pull` 和 `node.pending.ack` 是已连接节点的队列 API。 - `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开连接节点的持久待处理工作。
</Accordion>

<Accordion title="审批系列">
  - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖了一次性执行审批请求以及待处理审批的查找/重放。 - `exec.approval.waitDecision` 等待一个待处理的执行审批并返回最终决定（超时时返回 `null`）。 - `exec.approvals.get` 和 `exec.approvals.set` 管理网关执行审批策略快照。 - `exec.approvals.node.get` 和 `exec.approvals.node.set`
  通过节点中继命令管理节点本地执行审批策略。 - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖由插件定义的审批流程。
</Accordion>

  <Accordion title="自动化、Skills 和工具">
    - 自动化：`wake` 调度立即或下一次心跳时的唤醒文本注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理已调度的工作。
    - Skills 和工具：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective`。
  </Accordion>
</AccordionGroup>

### 通用事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他仅限转录的聊天
  事件。
- `session.message` 和 `session.tool`：已订阅会话的
  转录/事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统在线状态快照更新。
- `tick`：定期保活 / 存活事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`: cron 运行/作业变更事件。
- `shutdown`: 网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`: 节点配对生命周期。
- `node.invoke.request`: 节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`: 配对设备生命周期。
- `voicewake.changed`: 唤醒词触发配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`: 执行批准
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`: 插件批准
  生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins` 来获取当前可执行技能列表
  以进行自动允许检查。

### 操作员辅助方法

- 操作员可以调用 `commands.list` (`operator.read`) 来获取代理的
  运行时命令清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - `scope` 控制主 `name` 以哪个界面为目标：
    - `text` 返回不带前缀 `/` 的主文本命令令牌
    - `native` 和默认 `both` 路径在可用时返回提供商感知的本地名称
      （提供商-aware native names）
  - `textAliases` 包含精确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 在存在时包含提供商感知的本地命令名称。
  - `provider` 是可选的，仅影响本地命名和本地插件
    命令可用性。
  - `includeArgs=false` 会从响应中省略序列化的参数元数据。
- 操作员可以调用 `tools.catalog` (`operator.read`) 来获取代理的
  运行时工具目录。响应包括分组工具和溯源元数据：
  - `source`: `core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：插件工具是否是可选的
- Operator 可以调用 `tools.effective` (`operator.read`) 来获取会话的运行时有效工具清单。
  - `sessionKey` 是必需的。
  - Gateway 从服务器端的会话中派生可信的运行时上下文，而不是接受调用方提供的身份验证或传递上下文。
  - 响应是会话范围的，反映了当前活动对话可以立即使用的内容，包括核心、插件和渠道工具。
- Operator 可以调用 `skills.status` (`operator.read`) 来获取代理可见的技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺失要求、配置检查以及清理后的安装选项，且不暴露原始机密值。
- Operator 可以调用 `skills.search` 和 `skills.detail` (`operator.read`) 来获取 ClawHub 发现元数据。
- Operator 可以通过两种模式调用 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将技能文件夹安装到默认代理工作区的 `skills/` 目录中。
  - Gateway 安装程序模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` 在 Gateway 主机上运行声明的 `metadata.openclaw.install` 操作。
- Operator 可以通过两种模式调用 `skills.update` (`operator.admin`)：
  - ClawHub 模式更新默认代理工作区中的一个跟踪 slug 或所有跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，例如 `enabled`、`apiKey` 和 `env`。

## 执行批准

- 当执行请求需要批准时，Gateway 会广播 `exec.approval.requested`。
- Operator 客户端通过调用 `exec.approval.resolve` 进行解析（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 获得批准后，转发的 `node.invoke system.run` 调用将重用该规范的 `systemRunPlan` 作为权威的 command/cwd/会话 上下文。
- 如果调用方在 prepare 和最终批准的 `system.run` 转发之间改变了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关将拒绝运行，而不是信任被篡改的负载。

## Agent 传递回退

- `agent` 请求可以包含 `deliver=true` 以请求出站传递。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅限内部的传递目标返回 `INVALID_REQUEST`。
- 当无法解析外部可传递路由（例如内部/webchat 会话或模糊的多渠道配置）时，`bestEffortDeliver=true` 允许回退到仅会话执行。

## 版本控制

- `PROTOCOL_VERSION` 存在于 `src/gateway/protocol/schema/protocol-schemas.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的情况。
- 模式 + 模型是从 TypeBox 定义生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。这些值在协议 v3 中是稳定的，是第三方客户端的预期基线。

| 常量                                  | 默认值                                              | 来源                                                       |
| ------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                    | `3`                                                 | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| 请求超时（每个 RPC）                  | `30_000` 毫秒                                       | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| 预认证 / 连接质询超时                 | `10_000` ms                                         | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| 初始重连退避                          | `1_000` ms                                          | `src/gateway/client.ts` (`backoffMs`)                      |
| 最大重连退避                          | `30_000` ms                                         | `src/gateway/client.ts` (`scheduleReconnect`)              |
| 设备令牌关闭后的快速重试限制          | `250` ms                                            | `src/gateway/client.ts`                                    |
| 在 `terminate()` 之前的强制停止宽限期 | `250` ms                                            | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| `stopAndWait()` 默认超时              | `1_000` ms                                          | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| 默认心跳间隔（pre `hello-ok`）        | `30_000` ms                                         | `src/gateway/client.ts`                                    |
| 心跳超时关闭                          | 当静默超过 `tickIntervalMs * 2` 时，返回代码 `4000` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                   | `25 * 1024 * 1024` (25 MB)                          | `src/gateway/server-constants.ts`                          |

服务器在 `hello-ok` 中通告有效的 `policy.tickIntervalMs`、`policy.maxPayload` 和
`policy.maxBufferedBytes`；客户端应遵守这些值，而不是握手前的默认值。

## 认证

- 共享密钥网关认证使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具体取决于配置的认证模式。
- 承载身份的模式，例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非环回
  `gateway.auth.mode: "trusted-proxy"`，通过请求头满足连接认证检查，而不是通过 `connect.params.auth.*`。
- 私有入口 `gateway.auth.mode: "none"` 完全跳过共享密钥连接认证；
  不要在公共/不受信任的入口上暴露该模式。
- 配对后，Gateway(网关) 会颁发一个作用于连接角色 + 作用域的 **设备令牌**。它在 `hello-ok.auth.deviceToken` 中返回，客户端应将其持久化以供将来连接使用。
- 客户端应在任何
  成功连接后持久化主 `hello-ok.auth.deviceToken`。
- 使用该**已存储的**设备令牌重新连接时，也应重用为该令牌存储的
  已批准范围集。这保留了已授予的读取/探测/状态访问权限，
  并避免将重新连接静默降级为更窄的隐式仅管理员范围。
- 客户端连接认证组装（`selectConnectAuth` 在
  `src/gateway/client.ts` 中）：
  - `auth.password` 是正交的，并在设置时始终被转发。
  - `auth.token` 按优先顺序填充：首先是显式共享令牌，
    然后是显式 `deviceToken`，最后是存储的每设备令牌（由
    `deviceId` + `role` 键控）。
  - `auth.bootstrapToken` 仅在上述均未解析出
    `auth.token` 时发送。共享令牌或任何已解析的设备令牌会抑制它。
  - 在一次性
    `AUTH_TOKEN_MISMATCH` 重试时对存储的设备令牌进行自动提升，仅限于**受信任的端点** —
    环回地址，或具有固定 `tlsFingerprint` 的 `wss://`。没有固定的公共 `wss://`
    不符合条件。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导交接令牌。
  仅当连接在受信任的传输（如 `wss://` 或环回/本地配对）上使用引导认证时，才持久化它们。
- 如果客户端提供了**显式** `deviceToken` 或显式 `scopes`，该
  调用方请求的范围集将保持权威；仅当客户端重用存储的每设备令牌时，才会重用缓存的范围。
- 设备令牌可以通过 `device.token.rotate` 和
  `device.token.revoke` 轮换/撤销（需要 `operator.pairing` 范围）。
- `device.token.rotate` 返回轮换元数据。它仅针对已使用该设备令牌进行身份验证的同设备调用回显替换持有者令牌，以便仅令牌客户端可以在重新连接之前持久化其替换令牌。共享/管理员轮换不会回显持有者令牌。
- 令牌的颁发、轮换和撤销受限于该设备配对条目中记录的已批准角色集；令牌变更不能扩展或定位到配对批准从未授予的设备角色。
- 对于已配对设备的令牌会话，设备管理是自我作用域的，除非调用者还具有 `operator.admin`：非管理员调用者只能删除/撤销/轮换他们**自己**的设备条目。
- `device.token.rotate` 和 `device.token.revoke` 还会根据调用者当前的会话作用域检查目标操作员令牌作用域集。非管理员调用者不能轮换或撤销比他们当前持有的更广泛的操作员令牌。
- 身份验证失败包括 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken` (布尔值)
  - `error.details.recommendedNextStep` (`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`)
- 针对 `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任的客户端可以使用缓存的每设备令牌尝试一次有限的有限重试。
  - 如果该重试失败，客户端应停止自动重连循环并显示操作员操作指导。

## 设备身份 + 配对

- 节点应包含从密钥对指纹派生的稳定设备身份 (`device.id`)。
- 网关按设备 + 角色颁发令牌。
- 除非启用了本地自动批准，否则新的设备 ID 需要配对批准。
- 配对自动批准以直接 local loopback 连接为中心。
- OpenClaw 还有一条狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流程。
- 同主机 tailnet 或 LAN 连接在配对方面仍被视为远程连接，需要批准。
- WS 客户端通常在 `connect` 期间包含 `device` 身份（操作员 + 节点）。唯一的无设备操作员例外情况是显式信任路径：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅限本地主机的不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作员控制 UI 身份验证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (break-glass，严重的安全降级)。
  - 使用共享网关令牌/密码进行身份验证的直接回环 `gateway-client` 后端 RPC。
- 所有连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备身份验证迁移诊断

对于仍使用预挑战签名行为的旧版客户端，`connect` 现在返回
`DEVICE_AUTH_*` 细节代码，位于 `error.details.code` 下，并带有稳定的 `error.details.reason`。

常见的迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或发送了空值）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用了过时/错误的 nonce 进行签名。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名的时间戳超出了允许的偏差范围。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                         |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器 nonce 的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载是 `v3`，它除了设备/客户端/角色/作用域/令牌/nonce 字段外，还绑定了 `platform` 和 `deviceFamily`。
- 出于兼容性考虑，仍接受旧版 `v2` 签名，但在重新连接时，配对设备元数据固定仍控制命令策略。

## TLS + 证书固定

- WS 连接支持 TLS。
- 客户端可以选择固定 Gateway 证书指纹（参见 `gateway.tls`
  配置加上 `gateway.remote.tlsFingerprint` 或 CLI CLI `--tls-fingerprint`）。

## 范围

此协议暴露了**完整的 Gateway API**（状态、频道、模型、聊天、
代理、会话、节点、审批等）。确切的表面由 TypeBox 模式在 `src/gateway/protocol/schema.ts` 中定义。

## 相关

- [Bridge protocol](/zh/gateway/bridge-protocol)
- [Gateway(网关) runbook](/zh/gateway)
