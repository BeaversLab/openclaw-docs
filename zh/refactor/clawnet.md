---
summary: "Clawnet refactor: unify network protocol, roles, auth, approvals, identity"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet Refactor"
---

# Clawnet refactor (protocol + auth unification)

## Hi

Hi Peter — great direction; this unlocks simpler UX + stronger security.

## Purpose

Single, rigorous document for:

- Current state: protocols, flows, trust boundaries.
- Pain points: approvals, multi‑hop routing, UI duplication.
- Proposed new state: one protocol, scoped roles, unified auth/pairing, TLS pinning.
- Identity 模型: stable IDs + cute slugs.
- Migration plan, risks, open questions.

## Goals (from discussion)

- One protocol for all clients (mac app, CLI, iOS, Android, headless node).
- Every network participant authenticated + paired.
- Role clarity: nodes vs operators.
- Central approvals routed to where the user is.
- TLS encryption + optional pinning for all remote traffic.
- Minimal code duplication.
- Single machine should appear once (no UI/node duplicate entry).

## Non‑goals (explicit)

- Remove capability separation (still need least‑privilege).
- Expose full gateway control plane without scope checks.
- Make auth depend on human labels (slugs remain non‑security).

---

# Current state (as‑is)

## Two protocols

### 1) Gateway(网关) WebSocket (control plane)

- Full API surface: config, channels, models, sessions, agent runs, logs, nodes, etc.
- Default bind: loopback. Remote access via SSH/Tailscale.
- Auth: token/password via `connect`.
- No TLS pinning (relies on loopback/tunnel).
- Code:
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge (node transport)

- Narrow allowlist surface, node identity + pairing.
- JSONL over TCP; optional TLS + cert fingerprint pinning.
- TLS advertises fingerprint in discovery TXT.
- Code:
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## Control plane clients today

- CLI → Gateway(网关) WS via `callGateway` (`src/gateway/call.ts`).
- macOS app UI → Gateway(网关) WS (`GatewayConnection`).
- Web Control UI → Gateway(网关) WS.
- ACP → Gateway(网关) WS。
- Browser control uses its own HTTP control server.

## Nodes today

- macOS app in node mode connects to Gateway(网关) bridge (`MacNodeBridgeSession`)。
- iOS/Android apps connect to Gateway(网关) bridge。
- Pairing + per‑node token stored on gateway.

## Current approval flow (exec)

- Agent uses `system.run` via Gateway(网关)。
- Gateway(网关) invokes node over bridge.
- Node runtime decides approval.
- UI prompt shown by mac app (when node == mac app).
- Node returns `invoke-res` to Gateway(网关)。
- Multi‑hop, UI tied to node host.

## Presence + identity today

- Gateway(网关) presence entries from WS clients.
- Node presence entries from bridge.
- mac app can show two entries for same machine (UI + node).
- Node identity stored in pairing store; UI identity separate.

---

# Problems / pain points

- Two protocol stacks to maintain (WS + Bridge).
- Approvals on remote nodes: prompt appears on node host, not where user is.
- TLS pinning only exists for bridge; WS depends on SSH/Tailscale.
- Identity duplication: same machine shows as multiple instances.
- Ambiguous roles: UI + node + CLI capabilities not clearly separated.

---

# Proposed new state (Clawnet)

## One protocol, two roles

Single WS protocol with role + scope.

- **Role: node** (capability host)
- **Role: operator** (control plane)
- Optional **scope** for operator:
  - `operator.read` (status + viewing)
  - `operator.write` (agent run, sends)
  - `operator.admin` (config, channels, models)

### Role behaviors

**Node**

- Can register capabilities (`caps`, `commands`, permissions).
- Can receive `invoke` commands (`system.run`, `camera.*`, `canvas.*`, `screen.record`, etc).
- Can send events: `voice.transcript`, `agent.request`, `chat.subscribe`.
- Cannot call config/models/channels/sessions/agent control plane APIs.

**Operator**

- Full control plane API, gated by scope.
- Receives all approvals.
- Does not directly execute OS actions; routes to nodes.

### Key rule

Role is per‑connection, not per device. A device may open both roles, separately.

---

# 统一身份验证 + 配对

## 客户端身份

每个客户端提供：

- `deviceId`（稳定，从设备密钥派生）。
- `displayName`（人类可读名称）。
- `role` + `scope` + `caps` + `commands`。

## 配对流程（统一）

- 客户端以未身份验证的方式连接。
- Gateway(网关) 为该 `deviceId` 创建一个**配对请求**。
- 操作员收到提示；批准/拒绝。
- Gateway(网关) 颁发绑定到以下内容的凭证：
  - 设备公钥
  - 角色
  - 范围
  - 能力/命令
- 客户端持久化令牌，并以已身份验证的状态重新连接。

## 设备绑定身份验证（避免不记名令牌重放）

首选：设备密钥对。

- 设备生成一次密钥对。
- `deviceId = fingerprint(publicKey)`。
- Gateway(网关) 发送随机数；设备签名；网关验证。
- 令牌是颁发给公钥（持有证明），而不是字符串。

替代方案：

- mTLS（客户端证书）：最强，但运维复杂性更高。
- 短期不记名令牌仅作为临时阶段（轮换 + 提前撤销）。

## 静默批准（SSH 启发式）

精确定义它以避免薄弱环节。倾向于以下其中之一：

- **仅限本地**：当客户端通过回环/Unix 套接字连接时自动配对。
- **通过 SSH 质询**：网关发送随机数；客户端通过获取它来证明 SSH 访问权限。
- **物理存在窗口**：在网关主机 UI 上进行本地批准后，允许在短时间内（例如 10 分钟）自动配对。

始终记录并记录自动批准。

---

# TLS 无处不在（开发 + 生产）

## 复用现有的网桥 TLS

使用当前的 TLS 运行时 + 指纹锁定：

- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指纹验证逻辑

## 应用于 WS

- WS 服务器支持使用相同证书/密钥 + 指纹的 TLS。
- WS 客户端可以锁定指纹（可选）。
- 设备发现 为所有端点通告 TLS + 指纹。
  - 设备发现 仅仅是定位提示；绝不是信任锚点。

## 原因

- 减少对 SSH/Tailscale 的机密性依赖。
- 默认情况下确保远程移动连接安全。

---

# 批准流程重新设计（集中式）

## 当前

批准发生在节点主机（mac 应用节点运行时）上。提示出现在运行节点的位置。

## 建议

批准流程是**由网关托管**的，UI 提供给操作员客户端。

### 新流程

1. Gateway(网关) 接收 `system.run` 意图（代理）。
2. Gateway(网关) 创建审批记录：`approval.requested`。
3. 操作员 UI 显示提示。
4. 审批决定发送到网关：`approval.resolve`。
5. 如果获得批准，Gateway(网关) 将调用节点命令。
6. 节点执行并返回 `invoke-res`。

### 审批语义（强化）

- 广播给所有操作员；只有活动的 UI 显示模态框（其他收到通知 toast）。
- 首次解决为准；网关拒绝后续的解决请求，视为已解决。
- 默认超时：N 秒后拒绝（例如 60s），并记录原因。
- 解决需要 `operator.approvals` 作用域。

## 优势

- 提示出现在用户所在位置（Mac/手机）。
- 远程节点的审批保持一致。
- 节点运行时保持无头模式；无 UI 依赖。

---

# 角色清晰度示例

## iPhone 应用

- 针对以下功能的 **节点角色**：麦克风、摄像头、语音聊天、位置、按键通话。
- 可选的 **operator.read** 用于状态和聊天视图。
- 可选的 **operator.write/admin** 仅在明确启用时可用。

## macOS 应用

- 默认为操作员角色（控制 UI）。
- 启用“Mac 节点”时为节点角色（system.run、屏幕、摄像头）。
- 两个连接使用相同的 deviceId → 合并的 UI 条目。

## CLI

- 始终为操作员角色。
- 作用域由子命令派生：
  - `status`、`logs` → read
  - `agent`、`message` → write
  - `config`、`channels` → admin
  - 审批 + 配对 → `operator.approvals` / `operator.pairing`

---

# 身份 + 标识

## 稳定 ID

身份验证必需；永不更改。
首选：

- 密钥对指纹（公钥哈希）。

## 可爱的标识（龙虾主题）

仅限人工标签。

- 示例：`scarlet-claw`、`saltwave`、`mantis-pinch`。
- 存储在网关注册表中，可编辑。
- 冲突处理：`-2`、`-3`。

## UI 分组

不同角色下相同的 `deviceId` → 单个“实例”行：

- 徽章：`operator`、`node`。
- 显示功能 + 最后一次出现的时间。

---

# 迁移策略

## 第 0 阶段：文档 + 对齐

- 发布此文档。
- 盘点所有协议调用 + 审批流程。

## 阶段 1：为 WS 添加角色/范围

- 使用 `role`、`scope`、`deviceId` 扩展 `connect` 参数。
- 为节点角色添加允许列表控制。

## 阶段 2：Bridge 兼容性

- 保持 bridge 运行。
- 并行添加 WS 节点支持。
- 通过配置标志控制功能。

## 阶段 3：集中审批

- 在 WS 中添加审批请求 + 解决事件。
- 更新 mac 应用 UI 以进行提示 + 响应。
- 节点运行时停止提示 UI。

## 阶段 4：TLS 统一

- 使用 bridge TLS 运行时为 WS 添加 TLS 配置。
- 为客户端添加证书锁定。

## 阶段 5：弃用 bridge

- 将 iOS/Android/mac 节点迁移到 WS。
- 保留 bridge 作为后备；稳定后移除。

## 阶段 6：设备绑定认证

- 所有非本地连接都需要基于密钥的身份。
- 添加撤销 + 轮换 UI。

---

# 安全说明

- 角色/允许列表在网关边界强制执行。
- 没有客户端可以在没有操作员范围的情况下获得“完整”API。
- 所有连接都需要配对。
- TLS + 证书锁定降低了移动端的 MITM 风险。
- SSH 静默审批是一种便利；仍然会记录并可撤销。
- 设备发现绝非信任锚点。
- 根据平台/类型对照服务器允许列表验证能力声明。

# 流式传输 + 大负载（节点媒体）

WS 控制平面适用于小消息，但节点也执行以下操作：

- 摄像头片段
- 屏幕录制
- 音频流

选项：

1. WS 二进制帧 + 分块 + 背压规则。
2. 单独的流式端点（仍然 TLS + 认证）。
3. 针对媒体繁重的命令保留 bridge 更长时间，最后迁移。

在实施前选择一种，以避免偏差。

# 能力 + 命令策略

- 节点报告的能力/命令被视为**声明**。
- Gateway(网关) 强制执行每平台允许列表。
- 任何新命令都需要操作员批准或明确的允许列表更改。
- 使用时间戳审计更改。

# 审计 + 速率限制

- 日志：配对请求、批准/拒绝、令牌颁发/轮换/撤销。
- 速率限制配对垃圾邮件和审批提示。

# 协议规范

- 明确的协议版本 + 错误代码。
- 重连规则 + 心跳策略。
- 在线状态 TTL 和最后可见性语义。

---

# 未决问题

1. 同时运行两个角色的单个设备：令牌模型
   - 建议每个角色使用单独的令牌（节点 vs 操作员）。
   - 相同的 deviceId；不同的作用域；更清晰的撤销。

2. 操作员作用域粒度
   - 读/写/管理员 + 批准 + 配对（最小可行性）。
   - 后续考虑针对特定功能的作用域。

3. 令牌轮换 + 撤销用户体验
   - 角色变更时自动轮换。
   - 用于通过 deviceId + 角色撤销的 UI。

4. 设备发现
   - 扩展现有的 Bonjour TXT 记录以包含 WS TLS 指纹 + 角色提示。
   - 仅视为定位器提示。

5. 跨网络批准
   - 广播给所有操作员客户端；活动 UI 显示模态框。
   - 首个响应获胜；网关强制执行原子性。

---

# 摘要（TL;DR）

- 现状：WS 控制平面 + Bridge 节点传输。
- 痛点：批准 + 重复 + 两个堆栈。
- 提案：一种具有显式角色 + 作用域的 WS 协议，统一的配对 + TLS 锁定，网关托管的批准，稳定的设备 ID + 友好的别名。
- 结果：更简单的用户体验，更强的安全性，更少的重复，更好的移动端路由。

import en from "/components/footer/en.mdx";

<en />
