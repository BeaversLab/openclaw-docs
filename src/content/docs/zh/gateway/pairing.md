---
summary: "适用于 iOS 和其他远程节点的 Gateway(网关) 网关 拥有的节点配对（选项 B）"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Gateway(网关) 网关 拥有的配对"
---

# Gateway(网关) 网关 拥有型配对（选项 B）

在 Gateway(网关) 网关 拥有型配对中，**Gateway(网关) 网关**是决定允许哪些节点加入的唯一事实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要提示：** WS 节点在 `connect` 期间使用 **设备配对**（角色 `node`）。
`node.pair.*` 是一个单独的配对存储，**不**会限制 WS 握手。
只有显式调用 `node.pair.*` 的客户端才会使用此流程。

## 概念

- **待处理请求**：请求加入的节点；需要批准。
- **已配对节点**：已获批准且拥有已颁发身份验证令牌的节点。
- **传输**：Gateway（网关）WS 端点转发请求但不决定成员资格。（已移除旧版 TCP 网桥支持。）

## 配对如何工作

1. 节点连接到 Gateway(网关) 网关 WebSocket 并请求配对。
2. Gateway(网关) 存储一个 **pending request** 并发出 `node.pair.requested`。
3. 您批准或拒绝该请求（CLI 或 UI）。
4. 批准后，Gateway(网关) 会颁发一个**新令牌**（令牌在重新配对时会轮换）。
5. 节点使用该令牌重新连接，此时已“配对”。

待处理请求会在 **5 分钟**后自动过期。

## CLI 工作流（无头模式友好）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接的节点及其功能。

## API 表面（网关协议）

事件：

- `node.pair.requested` — 当创建新的待处理请求时发出。
- `node.pair.resolved` — 当请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` — 创建或复用待处理请求。
- `node.pair.list` — 列出待处理和已配对的节点 (`operator.pairing`)。
- `node.pair.approve` — 批准待处理的请求（颁发令牌）。
- `node.pair.reject` — 拒绝待处理的请求。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注意事项：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的待处理请求。
- 对同一待处理节点的重复请求也会刷新存储的节点元数据，以及最新的已列入允许列表的声明命令快照，以便操作员查看。
- 批准操作**始终**生成一个新的令牌；`node.pair.request` 从不返回任何令牌。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 使用待处理请求中声明的命令来强制执行额外的批准范围：
  - 无命令请求：`operator.pairing`
  - 非执行命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：
    `operator.pairing` + `operator.admin`

重要：

- 节点配对是一个信任/身份流程外加令牌颁发。
- 它**不**固定每个节点的实时节点命令表面。
- 实时节点命令来自节点在连接时声明的内容，并在应用了网关的全局节点命令策略 (`gateway.nodes.allowCommands` /
  `denyCommands`) 之后。
- 每个节点的 `system.run` 允许/询问策略存储在节点的 `exec.approvals.node.*` 中，而不是在配对记录中。

## 节点命令门控 (2026.3.31+)

<Warning>**重大变更**：从 `2026.3.31` 开始，节点命令在节点配对获得批准之前被禁用。仅凭设备配对已不足以暴露声明的节点命令。</Warning>

当节点首次连接时，会自动请求配对。在配对请求获得批准之前，来自该节点的所有待处理节点命令都将被过滤且不会执行。一旦通过配对批准建立了信任，节点的声明命令将变为可用，但需遵循常规命令策略。

这意味着：

- 以前仅依靠设备配对来暴露命令的节点现在必须完成节点配对。
- 在配对批准之前排队的命令将被丢弃，而不是推迟。

## 节点事件信任边界 (2026.3.31+)

<Warning>**重大变更：** 节点发起的运行现在保持在缩减的受信任表面上。</Warning>

节点发起的摘要及相关会话事件仅限于预期的受信任表面。以前依赖更广泛的主机或会话工具访问的通知驱动或节点触发的流程可能需要调整。这种强化确保节点事件无法升级到超出节点信任边界允许的主机级工具访问。

## 自动批准 (macOS app)

macOS 应用程序可以选择性地尝试 **静默批准**，当：

- 该请求被标记为 `silent`，并且
- 该应用程序可以使用同一用户验证到网关主机的 SSH 连接。

如果静默批准失败，它将回退到正常的“批准/拒绝”提示。

## 存储（本地，私有）

配对状态存储在 Gateway(网关) 状态目录下（默认为 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之移动。

安全说明：

- 令牌是机密；请将 `paired.json` 视为敏感信息。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 传输是 **无状态** 的；它不存储成员身份。
- 如果 Gateway(网关) 离线或禁用了配对，节点将无法配对。
- 如果 Gateway(网关) 处于远程模式，配对仍然针对远程 Gateway(网关) 的存储进行。
