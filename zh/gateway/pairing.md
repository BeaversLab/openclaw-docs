---
summary: "适用于 iOS 和其他远程节点的 Gateway(网关) 拥有的节点配对（选项 B）"
read_when:
  - 在不使用 macOS UI 的情况下实现节点配对审批
  - 添加用于审批远程节点的 CLI 流程
  - 使用节点管理扩展 Gateway(网关) 协议
title: "Gateway(网关) 拥有的配对"
---

# Gateway(网关) 拥有的配对（选项 B）

在 Gateway(网关) 拥有的配对中，**Gateway(网关)** 是决定允许哪些节点加入的单一事实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要提示：** WS 节点在 `connect` 期间使用 **设备配对**（角色 `node`）。
`node.pair.*` 是一个单独的配对存储，**不**负责控制 WS 握手。
只有显式调用 `node.pair.*` 的客户端才使用此流程。

## 概念

- **待处理请求**：节点请求加入；需要审批。
- **已配对节点**：具有已颁发身份验证令牌的已批准节点。
- **传输**：Gateway(网关) WS 端点转发请求，但不决定成员身份。（传统 TCP 网桥支持已弃用/移除。）

## 配对如何工作

1. 节点连接到 Gateway(网关) WS 并请求配对。
2. Gateway(网关) 存储 **待处理请求** 并发出 `node.pair.requested`。
3. 您批准或拒绝该请求（CLI 或 UI）。
4. 获得批准后，Gateway(网关) 颁发 **新令牌**（重新配对时会轮换令牌）。
5. 节点使用令牌重新连接，此时即处于“已配对”状态。

待处理请求会在 **5 分钟** 后自动过期。

## CLI 工作流程（无头友好）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接的节点及其功能。

## API 表面（Gateway(网关) 协议）

事件：

- `node.pair.requested` — 创建新的待处理请求时发出。
- `node.pair.resolved` — 请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` — 创建或重用待处理请求。
- `node.pair.list` — 列出待处理和已配对的节点。
- `node.pair.approve` — 批准待处理请求（颁发令牌）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的待处理请求。
- 批准 **始终** 会生成一个新的令牌；`node.pair.request` 不会返回任何令牌。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。

## 自动批准 (macOS app)

当满足以下条件时，macOS 应用可以选择尝试 **静默批准**：

- 请求被标记为 `silent`，且
- 应用可以使用同一用户验证到 Gateway 主机的 SSH 连接。

如果静默批准失败，它将回退到正常的“批准/拒绝”提示。

## 存储（本地，私有）

配对状态存储在 Gateway(网关) 状态目录下（默认为 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之移动。

安全说明：

- 令牌是机密信息；请将 `paired.json` 视为敏感信息。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 传输是 **无状态** 的；它不存储成员信息。
- 如果 Gateway(网关) 处于离线状态或禁用了配对，节点将无法配对。
- 如果 Gateway(网关) 处于远程模式，配对仍然会针对远程 Gateway(网关) 的存储进行。

import en from "/components/footer/en.mdx";

<en />
