---
summary: "Clawnet 重构：统一网络协议、角色、认证、审批与身份"
read_when:
  - 规划用于节点 + 操作端的统一网络协议
  - 重做设备间审批、配对、TLS 与 presence
title: "Clawnet 重构"
---
# Clawnet 重构（协议 + 认证统一）

## Hi
Hi Peter — 方向很棒；能带来更简洁的 UX + 更强的安全性。

## 目的
用一份严谨的文档覆盖：
- 当前状态：协议、流程、信任边界。
- 痛点：审批、多跳路由、UI 重复。
- 目标状态：单一协议、范围化角色、统一认证/配对、TLS pinning。
- 身份模型：稳定 ID + 可爱 slug。
- 迁移计划、风险、开放问题。

## 目标（讨论中）
- 所有客户端使用一套协议（mac app、CLI、iOS、Android、headless node）。
- 所有网络参与者都经过认证 + 配对。
- 角色清晰：节点 vs 操作端。
- 审批集中路由到用户所在位置。
- 所有远程流量支持 TLS 加密 + 可选 pinning。
- 最小化代码重复。
- 同一台机器只出现一次（不再出现 UI/node 重复条目）。

## 非目标（明确）
- 不移除能力隔离（仍需最小权限）。
- 不在未做 scope 校验的情况下暴露完整 gateway 控制面。
- 不让认证依赖人类标签（slug 仍非安全要素）。

---

# 当前状态（现状）

## 两套协议

### 1) Gateway WebSocket（控制面）
- 完整 API 面：配置、频道、模型、会话、代理运行、日志、节点等。
- 默认绑定：loopback。远程通过 SSH/Tailscale。
- 认证：`connect` 里的 token/password。
- 无 TLS pinning（依赖 loopback/隧道）。
- 代码：
  - `src/gateway/server/ws-connection/message-handler.ts`
  - `src/gateway/client.ts`
  - `docs/gateway/protocol.md`

### 2) Bridge（节点传输）
- 窄 allowlist 面，节点身份 + 配对。
- TCP 上的 JSONL；可选 TLS + 证书指纹 pinning。
- TLS 指纹在发现 TXT 中广播。
- 代码：
  - `src/infra/bridge/server/connection.ts`
  - `src/gateway/server-bridge.ts`
  - `src/node-host/bridge-client.ts`
  - `docs/gateway/bridge-protocol.md`

## 当前控制面客户端
- CLI → Gateway WS（`callGateway`，`src/gateway/call.ts`）。
- macOS app UI → Gateway WS（`GatewayConnection`）。
- Web Control UI → Gateway WS。
- ACP → Gateway WS。
- Browser control 使用自有 HTTP control server。

## 当前节点
- macOS app 以 node 模式连接 Gateway bridge（`MacNodeBridgeSession`）。
- iOS/Android app 连接 Gateway bridge。
- 配对 + per‑node token 存在 gateway。

## 当前审批流程（exec）
- 代理通过 Gateway 调用 `system.run`。
- Gateway 通过 bridge 调用节点。
- 节点运行时决定审批。
- mac app（当节点 == mac app）显示 UI 提示。
- 节点返回 `invoke-res` 到 Gateway。
- 多跳；UI 绑定节点 host。

## 当前 presence + 身份
- WS 客户端产生 Gateway presence 条目。
- 节点通过 bridge 产生 presence 条目。
- mac app 同一台机器可能显示两条（UI + node）。
- 节点身份在配对存储中；UI 身份独立。

---

# 问题 / 痛点

- 维护两套协议栈（WS + Bridge）。
- 远程节点审批：提示出现在节点 host，而不是用户所在设备。
- TLS pinning 只在 bridge；WS 依赖 SSH/Tailscale。
- 身份重复：同一台机器显示为多个实例。
- 角色模糊：UI + node + CLI 能力未清晰分离。

---

# 目标状态（Clawnet）

## 一套协议，两类角色
单一 WS 协议 + 角色 + scope。
- **角色：node**（能力宿主）
- **角色：operator**（控制面）
- operator 可选 **scope**：
  - `operator.read`（状态 + 查看）
  - `operator.write`（代理运行、发送）
  - `operator.admin`（配置、频道、模型）

### 角色行为

**Node**
- 可注册能力（`caps`、`commands`、权限）。
- 可接收 `invoke` 命令（`system.run`、`camera.*`、`canvas.*`、`screen.record` 等）。
- 可发送事件：`voice.transcript`、`agent.request`、`chat.subscribe`。
- 不能调用 config/models/channels/sessions/agent 控制面 API。

**Operator**
- 具备控制面 API，受 scope 限制。
- 接收所有审批。
- 不直接执行 OS 动作；改为路由给 nodes。

### 关键规则
角色是 **连接级**，不是设备级。同一设备可分别建立两种角色连接。

---

# 统一认证 + 配对

## 客户端身份
每个客户端提供：
- `deviceId`（稳定，来自设备密钥）。
- `displayName`（人类名称）。
- `role` + `scope` + `caps` + `commands`。

## 配对流程（统一）
- 客户端未认证连接。
- Gateway 为该 `deviceId` 创建 **配对请求**。
- Operator 接收提示；批准/拒绝。
- Gateway 颁发凭据，绑定：
  - 设备公钥
  - 角色
  - scope
  - 能力/命令
- 客户端保存 token 并认证重连。

## 设备绑定认证（避免 bearer token 重放）
首选：设备密钥对。
- 设备生成一次密钥对。
- `deviceId = fingerprint(publicKey)`。
- Gateway 发 nonce；设备签名；Gateway 验证。
- Token 绑定公钥（proof‑of‑possession），而非字符串。

替代：
- mTLS（客户端证书）：最强但运维复杂。
- 短期 bearer token 仅作为过渡（尽早轮换 + 撤销）。

## 静默批准（SSH 规则）
必须明确定义以避免弱点。推荐之一：
- **仅本地**：loopback/Unix socket 自动配对。
- **SSH 挑战**：gateway 生成 nonce；客户端通过 SSH 获取并证明。
- **物理窗口**：在 gateway host UI 本地批准后，允许短时间自动配对（如 10 分钟）。

所有自动批准都要记录 + 可追溯。

---

# 全面 TLS（开发 + 生产）

## 复用现有 bridge TLS
使用当前 TLS 运行时 + 指纹 pinning：
- `src/infra/bridge/server/tls.ts`
- `src/node-host/bridge-client.ts` 中的指纹校验逻辑

## 应用于 WS
- WS 服务端支持 TLS，复用同一证书/私钥 + 指纹。
- WS 客户端可选 pin 指纹。
- 发现机制为所有端点广播 TLS + 指纹。
  - 发现仅是定位提示，不是信任锚。

## 原因
- 降低对 SSH/Tailscale 的保密依赖。
- 让远程移动端连接默认安全。

---

# 审批重构（集中式）

## 当前
审批发生在 node host（mac app node runtime）；提示出现在 node 运行的位置。

## 目标
审批 **由 gateway 托管**，UI 在 operator 客户端呈现。

### 新流程
1) Gateway 接收 `system.run` 意图（来自代理）。
2) Gateway 创建审批记录：`approval.requested`。
3) Operator UI 显示提示。
4) Operator 将决定发回 gateway：`approval.resolve`。
5) 若批准，Gateway 调用节点命令。
6) 节点执行，返回 `invoke-res`。

### 审批语义（加固）
- 广播到所有 operators；只有当前活跃 UI 显示 modal（其他显示 toast）。
- 先到先得；gateway 拒绝后续 resolve。
- 默认超时：N 秒后拒绝（如 60s），记录原因。
- 需要 `operator.approvals` scope。

## 好处
- 提示出现在用户所在设备（mac/手机）。
- 远程节点审批一致。
- 节点运行时保持无界面；不依赖 UI。

---

# 角色清晰示例

## iPhone app
- **node** 角色：麦克风、相机、语音聊天、定位、按住说话。
- 可选 **operator.read** 用于状态与聊天视图。
- 仅在明确启用时才授予 **operator.write/admin**。

## macOS app
- 默认 operator 角色（控制 UI）。
- 开启 “Mac node” 时作为 node 角色（system.run、屏幕、相机）。
- 同一 deviceId 的双连接 → UI 合并成单条。

## CLI
- 始终为 operator 角色。
- Scope 根据子命令：
  - `status`, `logs` → read
  - `agent`, `message` → write
  - `config`, `channels` → admin
  - approvals + pairing → `operator.approvals` / `operator.pairing`

---

# 身份 + slugs

## 稳定 ID
用于认证；永不改变。
优选：
- 公钥指纹（keypair fingerprint）。

## 可爱 slug（lobster 主题）
仅做人类标签。
- 例：`scarlet-claw`、`saltwave`、`mantis-pinch`。
- 存在 gateway 注册表中，可编辑。
- 冲突处理：`-2`、`-3`。

## UI 分组
同一 `deviceId` 的多个角色 → 单一 “Instance” 行：
- 徽章：`operator`、`node`。
- 显示能力 + 最近在线。

---

# 迁移策略

## Phase 0：文档 + 对齐
- 发布本文档。
- 盘点所有协议调用 + 审批流程。

## Phase 1：为 WS 添加角色/Scope
- 扩展 `connect` 参数：`role`、`scope`、`deviceId`。
- 为 node 角色增加 allowlist 限制。

## Phase 2：桥接兼容
- 继续运行 bridge。
- 并行增加 WS node 支持。
- 用配置开关控制功能。

## Phase 3：集中审批
- 在 WS 中新增审批请求 + resolve 事件。
- 更新 mac app UI 以提示 + 响应。
- 节点运行时停止 UI 提示。

## Phase 4：TLS 统一
- WS 使用 bridge TLS 运行时配置。
- 客户端支持 pinning。

## Phase 5：弃用 bridge
- 迁移 iOS/Android/mac node 到 WS。
- 保留 bridge 作为兜底；稳定后移除。

## Phase 6：设备绑定认证
- 所有非本地连接要求基于密钥的身份。
- 增加撤销 + 轮换 UI。

---

# 安全说明

- 角色/allowlist 在 gateway 边界强制。
- 无客户端可在未授权 scope 下访问完整 API。
- *所有* 连接都需配对。
- TLS + pinning 降低移动端 MITM 风险。
- SSH 静默批准是便捷措施；仍需记录 + 可撤销。
- 发现机制永不作为信任锚。
- 能力声明按平台/类型由服务端 allowlist 校验。

# 流式与大负载（节点媒体）
WS 控制面适合小消息，但节点还会处理：
- 摄像头片段
- 屏幕录制
- 音频流

选项：
1) WS 二进制帧 + 分块 + 背压规则。
2) 独立流式端点（仍走 TLS + 认证）。
3) 媒体重载命令最后迁移，bridge 保持更久。

实现前需确定方案以避免漂移。

# 能力 + 命令策略
- 节点上报的 caps/commands 视为 **声明**。
- Gateway 按平台 allowlist 强制。
- 新命令需 operator 审批或显式 allowlist 变更。
- 变更要记录时间戳。

# 审计 + 速率限制
- 记录：配对请求、审批/拒绝、token 颁发/轮换/撤销。
- 对配对刷屏与审批提示做速率限制。

# 协议卫生
- 明确协议版本 + 错误码。
- 重连规则 + 心跳策略。
- Presence TTL 与 last‑seen 语义。

---

# 开放问题

1) 单设备双角色：token 模型
   - 推荐每角色独立 token（node vs operator）。
   - 同 deviceId、不同 scope，便于撤销。

2) Operator scope 粒度
   - read/write/admin + approvals + pairing（最小可行）。
   - 后续可细化到功能级。

3) Token 轮换 + 撤销 UX
   - 角色变更时自动轮换。
   - UI 以 deviceId + role 撤销。

4) 发现
   - 扩展当前 Bonjour TXT，包含 WS TLS 指纹 + 角色提示。
   - 仅作为定位提示。

5) 跨网络审批
   - 广播到所有 operator 客户端；活跃 UI 显示 modal。
   - 先响应者获胜；gateway 保证原子性。

---

# 总结（TL;DR）

- 现状：WS 控制面 + Bridge 节点传输。
- 痛点：审批 + 重复 + 两套栈。
- 方案：单一 WS 协议 + 明确角色/Scope、统一配对 + TLS pinning、gateway 托管审批、稳定 deviceId + 可爱 slug。
- 结果：更简洁 UX、更强安全、更少重复、更好的移动端路由。
