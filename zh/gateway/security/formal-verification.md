---
title: 形式化验证（安全模型）
summary: 针对 OpenClaw 最高风险路径的机器检查安全模型。
permalink: /security/formal-verification/
---

# 形式化验证（安全模型）

此页面跟踪 OpenClaw 的**形式化安全模型**（目前为 TLA+/TLC；必要时会扩展更多）。

> 注意：一些旧的链接可能指的是以前的项目名称。

**目标（北极星）：** 提供一个经过机器检查的论证，证明在明确假设的前提下，OpenClaw 执行了其预期的安全策略（授权、会话隔离、工具门控和错误配置安全）。

**目前这代表什么：** 一个可执行的、由攻击者驱动的**安全回归套件**：

- 每个声明都在有限状态空间上有一个可运行的模型检查。
- 许多声明都有一个配对的**负向模型**，该模型可以为现实的错误类别生成反例跟踪。

**目前这不代表什么：** 证明“OpenClaw 在所有方面都是安全的”或证明完整的 TypeScript 实现是正确的。

## 模型所在位置

模型在单独的仓库中维护：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，不是完整的 TypeScript 实现。模型与代码之间可能出现差异。
- 结果受 TLC 探索的状态空间限制；“绿色”并不意味着在模型假设和范围之外具有安全性。
- 某些声明依赖于明确的环境假设（例如，正确的部署、正确的配置输入）。

## 复现结果

目前，通过在本地克隆模型仓库并运行 TLC 来复现结果（见下文）。未来的迭代可能提供：

- 包含公共产物（反例跟踪、运行日志）的 CI 运行模型
- 针对小型、有限检查的托管“运行此模型”工作流

入门指南：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### 网关暴露和开放网关错误配置

**声明：** 在没有身份验证的情况下绑定到环回地址之外的地址可能导致远程入侵 / 增加暴露面；令牌/密码会阻止未经身份验证的攻击者（根据模型假设）。

- 通过运行的检查（Green runs）：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另请参阅：models 仓库中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run 流水线（最高风险能力）

**声明：** `nodes.run` 需要 节点命令允许列表加上已声明的命令，以及在配置时进行的实时批准；批准已令牌化以防止重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**声明：** 配对请求遵守 TTL 和待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口门控（提及 + 控制命令绕过）

**声明：** 在需要提及的群组上下文中，未经授权的“控制命令”无法绕过提及门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由/会话密钥隔离

**声明：** 来自不同对等方的私信不会合并到同一个会话中，除非显式链接/配置。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`

## v1++：额外的有界模型（并发、重试、跟踪正确性）

这些是后续模型，它们围绕现实世界的故障模式（非原子更新、重试和消息扇出）提高了保真度。

### 配对存储并发 / 幂等性

**声明：** 即使在交错（即“先检查后写入”必须是原子/锁定的；刷新不应创建重复项）的情况下，配对存储也应强制执行 `MaxPending` 和幂等性。

含义：

- 在并发请求下，对于特定通道您不能超过 `MaxPending`。
- 针对同一个 `(channel, sender)` 的重复请求/刷新不应创建重复的活动待处理记录。

- 绿色运行：
  - `make pairing-race` (原子/锁定上限检查)
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative` (non-atomic begin/commit cap race)
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### Ingress trace correlation / idempotency

**Claim:** ingestion should preserve trace correlation across fan-out and be idempotent under provider retries.

What it means:

- When one external event becomes multiple internal messages, every part keeps the same trace/event identity.
- Retries do not result in double-processing.
- If provider event IDs are missing, dedupe falls back to a safe key (e.g., trace ID) to avoid dropping distinct events.

- Green:
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- Red (expected):
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### Routing dmScope precedence + identityLinks

**Claim:** routing must keep DM sessions isolated by default, and only collapse sessions when explicitly configured (channel precedence + identity links).

What it means:

- Channel-specific dmScope overrides must win over global defaults.
- identityLinks should collapse only within explicit linked groups, not across unrelated peers.

- Green:
  - `make routing-precedence`
  - `make routing-identitylinks`
- Red (expected):
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
