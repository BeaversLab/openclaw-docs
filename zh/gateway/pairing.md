---
summary: "Gateway 自主的 node 配对（Option B），适用于 iOS 与远程 nodes"
read_when:
  - 实现无需 macOS UI 的 node 配对审批
  - 添加 CLI 的远程 node 审批流程
  - 通过 node 管理扩展 gateway 协议
title: "Gateway 自主配对（Option B）"
---
# Gateway 自主配对（Option B）

在 Gateway 自主配对中，**Gateway** 是决定哪些 nodes 可加入的事实来源。
UI（macOS app、未来客户端）只是前端，用于批准或拒绝待处理请求。

**重要：**WS nodes 在 `connect` 时使用**设备配对**（`role: node`）。
`node.pair.*` 是独立的配对存储，**不会**门控 WS 握手。
只有显式调用 `node.pair.*` 的客户端才会使用该流程。

## 概念

- **Pending request**：node 请求加入，需审批。
- **Paired node**：已批准并获得 auth token 的 node。
- **Transport**：Gateway WS 仅转发请求，不决定成员资格。（旧 TCP bridge 支持已弃用/移除。）

## 配对流程

1. node 连接 Gateway WS 并请求配对。
2. Gateway 存储一个 **pending request** 并发出 `node.pair.requested`。
3. 你批准或拒绝该请求（CLI 或 UI）。
4. 批准后，Gateway 颁发**新 token**（重新配对会轮换 token）。
5. node 使用 token 重新连接，即成为 “paired”。

Pending requests 在 **5 分钟**后自动过期。

## CLI 流程（无头友好）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接节点及其能力。

## API 面（gateway 协议）

事件：
- `node.pair.requested` — 创建新 pending request 时发出。
- `node.pair.resolved` — 请求被批准/拒绝/过期时发出。

方法：
- `node.pair.request` — 创建或复用 pending request。
- `node.pair.list` — 列出 pending + paired nodes。
- `node.pair.approve` — 批准 pending request（颁发 token）。
- `node.pair.reject` — 拒绝 pending request。
- `node.pair.verify` — 校验 `{ nodeId, token }`。

注：
- `node.pair.request` 对每个 node 是幂等的：重复调用返回同一 pending request。
- 批准**总会**生成新 token；`node.pair.request` 不会返回 token。
- 请求可包含 `silent: true`，作为自动审批流程的提示。

## 自动审批（macOS app）

macOS app 可在以下情况下尝试**静默审批**：
- 请求标记为 `silent`，且
- app 能用同一用户通过 SSH 连接到 gateway 主机。

若静默审批失败，会回退到常规 “Approve/Reject” 提示。

## 存储（本地、私有）

配对状态保存在 Gateway 状态目录（默认 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

若覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 目录随之移动。

安全说明：
- Tokens 属于机密；请将 `paired.json` 视为敏感文件。
- 轮换 token 需要重新审批（或删除该 node 条目）。

## 传输行为

- 传输层是**无状态**的；不会存储成员资格。
- Gateway 离线或禁用配对时，nodes 无法配对。
- 若 Gateway 处于 remote 模式，配对仍针对远端 Gateway 的存储进行。
