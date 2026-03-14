---
summary: "适用于 iOS 和其他远程节点的 Gateway 网关 拥有的节点配对（选项 B）"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Gateway 网关 拥有的配对"
---

# Gateway 网关 拥有型配对（选项 B）

在 Gateway 网关 拥有型配对中，**Gateway 网关**是决定允许哪些节点加入的唯一事实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要提示：** WS 节点在 `connect` 期间使用 **设备配对**（角色 `node`）。
`node.pair.*` 是一个单独的配对存储，**不**会限制 WS 握手。
只有显式调用 `node.pair.*` 的客户端才会使用此流程。

## 概念

- **待处理请求**：请求加入的节点；需要批准。
- **已配对节点**：已获批准且拥有已颁发身份验证令牌的节点。
- **传输**：Gateway 网关 WebSocket 端点转发请求但不决定成员资格。（传统 TCP 桥接支持已被弃用/移除。）

## 配对如何工作

1. 节点连接到 Gateway 网关 WebSocket 并请求配对。
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
- `node.pair.list` — 列出待处理 + 已配对的节点。
- `node.pair.approve` — 批准待处理请求（颁发令牌）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注意事项：

- `node.pair.request` 针对每个节点是幂等的：重复调用返回相同的待处理请求。
- 批准**始终**会生成一个新令牌；`node.pair.request` 从不返回任何令牌。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。

## 自动批准（macOS 应用）

macOS 应用可以在以下情况下尝试**静默批准**：

- 该请求被标记为 `silent`，并且
- 该应用可以使用同一用户验证与网关主机的 SSH 连接。

如果静默批准失败，它将回退到正常的“批准/拒绝”提示。

## 存储（本地，私有）

配对状态存储在 Gateway(网关) 状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之移动。

安全注意事项：

- 令牌（Token）是机密信息；请将 `paired.json` 视为敏感信息处理。
- 轮换令牌需要重新审批（或删除节点条目）。

## 传输行为

- 传输层是**无状态**的；它不存储成员资格信息。
- 如果 Gateway(网关) 处于离线状态或已禁用配对，节点将无法进行配对。
- 如果 Gateway(网关) 处于远程模式，配对仍然针对远程 Gateway(网关) 的存储进行。

import zh from '/components/footer/zh.mdx';

<zh />
