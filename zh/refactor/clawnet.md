---
summary: "Clawnet 重构：统一网络协议、角色、身份验证、审批和身份"
read_when:
  - Planning a unified network protocol for nodes + operator clients
  - Reworking approvals, pairing, TLS, and presence across devices
title: "Clawnet 重构"
---

# Clawnet 重构（协议与认证统一）

## 你好

嗨 Peter —— 方向很棒；这将带来更简单的用户体验和更强的安全性。

## 目的

一份单一、严谨的文档，用于：

- 当前状态：协议、流程、信任边界。
- 痛点：审批、多跳路由、UI 重复。
- 提议的新状态：单一协议、限定范围的角色、统一的认证/配对、TLS 固定。
- 身份模型：稳定的 ID + 可爱的别名。
- 迁移计划、风险、未解决的问题。

## 目标（来自讨论）

- 适用于所有客户端（mac 应用、CLI、iOS、Android、无头节点）的单一协议。
- 每个网络参与者都经过认证和配对。
- 角色清晰：节点 vs 操作员。
- 中央审批路由至用户所在位置。
- 对所有远程流量进行 TLS 加密和可选固定。
- 最小化代码重复。
- 单台机器应只显示一次（无 UI/节点重复条目）。

## 非目标（明确）

- 移除能力分离（仍需遵循最小权限原则）。
- 在不进行范围检查的情况下暴露完整的网关控制平面。
- 使认证依赖于人工标签（别名保持非安全性质）。

---

# 当前状态（现状）

## 两种协议

### 1) Gateway WebSocket（控制平面）

- 完整的 API 表面：配置、频道、模型、会话、代理运行、日志、节点等。
- 默认绑定：环回。通过 SSH/Tailscale 进行远程访问。
- 身份验证：通过 `connect` 进行令牌/密码验证。
- 无 TLS 固定（依赖环回/隧道）。
- 代码：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（节点传输）

- 狭义的允许列表表面，节点身份 + 配对。
- 基于 TCP 的 JSONL；可选 TLS + 证书指纹固定。
- TLS 在发现 TXT 记录中通告指纹。
- 代码：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 当前控制平面客户端

- CLI → 通过 `callGateway` 连接到 Gateway WS (`src/gateway/call.ts`)。
- macOS 应用 UI → Gateway WS (`GatewayConnection`)。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- 浏览器控制使用其自己的 HTTP 控制服务器。

## 目前的节点

- 节点模式下的 macOS 应用连接到 Gateway 网桥 (`MacNodeBridgeSession`)。
- iOS/Android 应用连接到 Gateway bridge。
- 配对和每个节点的令牌存储在 gateway 上。

## 当前的审批流程 (exec)

- Agent 通过 Gateway 使用 `system.run`。
- Gateway 通过 bridge 调用节点。
- 节点运行时决定是否批准。
- 由 mac 应用显示 UI 提示（当 node == mac app 时）。
- 节点向 Gateway 返回 `invoke-res`。
- 多跳，UI 绑定到节点主机。

## 目前的在线状态 + 身份

- 来自 WS 客户端的 Gateway 在线状态条目。
- 来自 bridge 的节点在线状态条目。
- mac 应用可以为同一台机器显示两个条目（UI + 节点）。
- 节点身份存储在配对存储中；UI 身份是分开的。

---

# 问题 / 痛点

- 需要维护两个协议栈（WS + Bridge）。
- 远程节点上的审批：提示出现在节点主机上，而不是用户所在的位置。
- TLS pinning 仅存在于 bridge 上；WS 依赖于 SSH/Tailscale。
- 身份重复：同一台机器显示为多个实例。
- 角色模糊：UI + 节点 + CLI 的功能没有明确分离。

---

# 拟议的新状态

## 一种协议，两种角色

带有角色 + 范围的单一 WS 协议。

- **角色：node**（能力主机）
- **角色：operator**（控制平面）
- Operator 的可选 **scope**（范围）：
  - `operator.read` (状态 + 查看)
  - `operator.write` (agent 运行，发送)
  - `operator.admin` (配置，频道，模型)

### 角色行为

**Node**

- 可以注册功能 (`caps`，`commands`，权限)。
- 可以接收 `invoke` 命令 (`system.run`，`camera.*`，`canvas.*`，`screen.record` 等)。
- 可以发送事件：`voice.transcript`，`agent.request`，`chat.subscribe`。
- 无法调用 config/models/channels/sessions/agent 控制平面 API。

**Operator**

- 完整的控制平面 API，受范围限制。
- 接收所有审批请求。
- 不直接执行 OS 操作；路由到节点。

### 关键规则

角色是基于连接的，而不是基于设备的。一个设备可以分别打开两种角色。

---

# 统一认证 + 配对

## 客户端身份

每个客户端提供：

- `deviceId` (稳定，源自设备密钥)。
- `displayName` (人类可读名称)。
- `role` + `scope` + `caps` + `commands`。

## 配对流程（统一）

- 客户端以未认证状态连接。
- Gateway 为该 `deviceId` 创建一个 **配对请求**。
- 操作员收到提示；批准/拒绝。
- 网关颁发绑定到以下内容的凭证：
  - 设备公钥
  - 角色
  - 范围
  - 能力/命令
- 客户端持久化令牌，以认证身份重新连接。

## 设备绑定认证（避免持有者令牌重放）

首选：设备密钥对。

- 设备生成一次密钥对。
- `deviceId = fingerprint(publicKey)`。
- 网关发送随机数；设备签名；网关验证。
- 令牌颁发给公钥（持证证明），而非字符串。

替代方案：

- mTLS（客户端证书）：最强，但运维复杂度更高。
- 仅将短期持有者令牌作为临时阶段使用（轮换并提前撤销）。

## 静默批准（SSH 启发式）

精确定义以避免薄弱环节。首选以下之一：

- **仅限本地**：当客户端通过环回/Unix 套接字连接时自动配对。
- **通过 SSH 挑战**：网关发布随机数；客户端通过获取它来证明 SSH 访问权限。
- **物理在场窗口**：在网关主机 UI 上进行本地批准后，允许在短时间窗口（例如 10 分钟）内自动配对。

始终记录并记录自动批准。

---

# 全 TLS 环境（开发 + 生产）

## 复用现有的 Bridge TLS

使用当前的 TLS 运行时 + 指纹固定：

- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指纹验证逻辑

## 应用于 WS

- WS 服务器支持使用相同证书/密钥 + 指纹的 TLS。
- WS 客户端可以固定指纹（可选）。
- 发现服务为所有端点通告 TLS + 指纹。
  - 发现服务仅提供定位器提示；绝不做信任锚。

## 原因

- 减少对 SSH/Tailscale 保密性的依赖。
- 默认使远程移动连接更安全。

---

# 批准流程重新设计（集中式）

## 当前

批准发生在节点主机（mac 应用节点运行时）上。提示出现在节点运行的位置。

## 建议方案

批准由**网关托管**，UI 发送给操作员客户端。

### 新流程

1. Gateway 接收 `system.run` 意图 (agent)。
2. Gateway 创建审批记录：`approval.requested`。
3. 操作员 UI 显示提示。
4. 批准决定已发送到网关：`approval.resolve`。
5. 如果获得批准，网关调用节点命令。
6. 节点执行，返回 `invoke-res`。

### 批准语义（强化）

- 广播给所有操作员；仅活动 UI 显示模态框（其他收到通知/Toast）。
- 首次解决生效；网关拒绝后续解决，因为已处理。
- 默认超时：N 秒后拒绝（如 60 秒），记录原因。
- 解析需要 `operator.approvals` 作用域。

## 优势

- 提示出现在用户所在的位置（mac/手机）。
- 为远程节点提供一致的批准流程。
- 节点运行时保持无头模式；无 UI 依赖。

---

# 角色清晰度示例

## iPhone 应用

- **节点角色**用于：麦克风、摄像头、语音聊天、位置、按键通话。
- 可选的 **operator.read** 用于状态和聊天视图。
- 仅在明确启用时才具有可选的 **operator.write/admin**。

## macOS 应用

- 默认为操作员角色（控制 UI）。
- 启用“Mac 节点”时为节点角色（system.run、屏幕、摄像头）。
- 两个连接使用相同的 deviceId → 合并的 UI 条目。

## CLI

- 始终为操作员角色。
- 作用域由子命令推导：
  - `status`，`logs` → read
  - `agent`，`message` → write
  - `config`，`channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# 身份 + 别名

## 稳定 ID

身份验证必需；永不改变。
首选：

- 密钥对指纹（公钥哈希）。

## 可爱别名（龙虾主题）

仅限人工标签。

- 示例：`scarlet-claw`、`saltwave`、`mantis-pinch`。
- 存储在网关注册表中，可编辑。
- 冲突处理：`-2`、`-3`。

## UI 分组

角色之间使用相同的 `deviceId` → 单个“Instance”行：

- 徽章：`operator`、`node`。
- 显示功能 + 上次在线时间。

---

# 迁移策略

## 阶段 0：文档 + 对齐

- 发布此文档。
- 清点所有协议调用 + 批准流程。

## 阶段 1：向 WS 添加角色/范围

- 使用 `role`、`scope`、`deviceId` 扩展 `connect` 参数。
- 为节点角色添加允许列表准入控制。

## 阶段 2：Bridge 兼容性

- 保持 bridge 运行。
- 并行添加 WS 节点支持。
- 通过配置标志控制功能。

## 阶段 3：集中批准

- 在 WS 中添加批准请求 + 解决事件。
- 更新 mac app UI 以进行提示 + 响应。
- 节点运行时停止提示 UI。

## 阶段 4：TLS 统一

- 使用 bridge TLS 运行时添加 WS 的 TLS 配置。
- 向客户端添加证书固定。

## 阶段 5：弃用 bridge

- 将 iOS/Android/mac 节点迁移至 WS。
- 将 bridge 保留为后备；稳定后移除。

## 阶段 6：设备绑定身份验证

- 要求所有非本地连接使用基于密钥的身份。
- 添加撤销 + 轮换 UI。

---

# 安全说明

- 在网关边界执行角色/允许列表。
- 没有客户端能在没有 operator 范围的情况下获得“完整”API。
- 所有连接都需要配对。
- TLS + 证书固定降低了移动端的 MITM 风险。
- SSH 静默批准是一种便利；仍然会被记录并可撤销。
- 发现绝不作为信任锚点。
- 根据平台/类型，对照服务器允许列表验证功能声明。

# 流式传输 + 大负载（节点媒体）

WS 控制平面适用于小消息，但节点还执行：

- 摄像头片段
- 屏幕录制
- 音频流

选项：

1. WS 二进制帧 + 分块 + 背压规则。
2. 独立的流式传输端点（仍然需要 TLS + 身份验证）。
3. 对于媒体繁重的命令，保留 bridge 更长时间，最后迁移。

在实施之前选择一种，以避免出现偏差。

# 功能 + 命令策略

- 节点报告的功能/命令被视为**声明**。
- 网关强制执行特定平台的允许列表。
- 任何新命令都需要操作员批准或明确的允许列表更改。
- 使用时间戳审计更改。

# 审计 + 速率限制

- 日志：配对请求、批准/拒绝、令牌签发/轮换/撤销。
- 对配对垃圾请求和批准提示进行速率限制。

# 协议卫生

- 明确的协议版本和错误代码。
- 重连规则和心跳策略。
- 在线状态 TTL 和最后可见语义。

---

# 未决问题

1. 同时运行两种角色的单设备：令牌模型
   - 建议按角色（节点 vs 运维）使用独立的令牌。
   - 相同的 deviceId；不同的作用域；更清晰的撤销机制。

2. 运维作用域的粒度
   - 读写/管理员 + 批准 + 配对（最小可行性）。
   - 稍后考虑按功能划分的作用域。

3. 令牌轮换与撤销体验
   - 角色变更时自动轮换。
   - 支持按 deviceId + role 撤销的 UI。

4. 发现
   - 扩展当前的 Bonjour TXT 记录以包含 WS TLS 指纹和角色提示。
   - 仅将其视为定位提示。

5. 跨网络批准
   - 广播至所有运维客户端；活跃 UI 显示模态框。
   - 首个响应生效；网关强制执行原子性。

---

# 摘要 (TL;DR)

- 现状：WS 控制平面 + Bridge 节点传输。
- 痛点：批准 + 重复 + 两套技术栈。
- 提议：一个 WS 协议，包含明确的角色和作用域，统一的配对和 TLS 固定，网关托管的批准，稳定的设备 ID 和简短易记的名称。
- 结果：更简单的 UX，更强的安全性，更少的重复，更好的移动端路由。

import zh from '/components/footer/zh.mdx';

<zh />
