---
title: "形式验证（安全模型）"
summary: OpenClaw 最高风险路径的机器校验安全模型。
permalink: /security/formal-verification/
---

# 形式化验证（安全模型）

本页追踪 OpenClaw 的 **形式化安全模型**（目前为 TLA+/TLC；需要时扩展）。

> 说明：部分旧链接可能仍指向之前的项目名。

**目标（北极星）：** 在明确假设下，提供机器校验的论证，证明 OpenClaw 能执行其预期的安全策略（授权、会话隔离、工具门控与配置安全）。

**今天的含义：** 一个可执行、攻击者视角的 **安全回归套件**：
- 每个主张都有在有限状态空间内可运行的 model-check。
- 许多主张配有 **负模型**，用于生成现实 bug 类的反例轨迹。

**尚未达到：** “OpenClaw 在所有方面都安全”的证明，也不是对完整 TypeScript 实现的证明。

## 模型位置

模型维护在单独仓库中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是 **模型**，不是完整 TypeScript 实现。模型与代码可能漂移。
- 结果受 TLC 探索的状态空间约束；“绿”不代表超出已建模假设与边界的安全性。
- 部分主张依赖明确环境假设（如正确部署、正确配置输入）。

## 复现实验结果

目前通过本地克隆模型仓库并运行 TLC 复现（见下）。未来可能提供：
- 在 CI 运行模型并发布产物（反例轨迹、运行日志）
- 托管的“小范围模型运行”工作流

开始：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# 需要 Java 11+（TLC 运行在 JVM 上）。
# 该仓库内置固定版本的 `tla2tools.jar`（TLA+ 工具），并提供 `bin/tlc` + Make targets。

make <target>
```

### Gateway 暴露与 open gateway 误配置

**主张：** 未加认证地绑定到非 loopback 会导致远程入侵可能性/暴露增加；token/password 可阻止未授权攻击者（在模型假设下）。

- 绿（通过）：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红（预期）：
  - `make gateway-exposure-v2-negative`

另见：模型仓库中的 `docs/gateway-exposure-matrix.md`。

### Nodes.run 流水线（最高风险能力）

**主张：** `nodes.run` 需要 (a) 节点命令 allowlist + 已声明命令，且 (b) 在配置时需要实时审批；审批在模型中带 token 以防重放。

- 绿（通过）：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（DM 门控）

**主张：** 配对请求遵守 TTL 与待处理请求上限。

- 绿（通过）：
  - `make pairing`
  - `make pairing-cap`
- 红（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入站门控（mentions + control-command 绕过）

**主张：** 在需要 mention 的群聊中，未授权的 “control command” 不能绕过 mention 门控。

- 绿：
  - `make ingress-gating`
- 红（预期）：
  - `make ingress-gating-negative`

### 路由/会话键隔离

**主张：** 不同 peer 的私聊不会折叠到同一会话，除非明确链接/配置。

- 绿：
  - `make routing-isolation`
- 红（预期）：
  - `make routing-isolation-negative`


## v1++：更多有界模型（并发、重试、追踪正确性）

这些后续模型用于更贴近真实故障模式（非原子更新、重试、消息扇出）。

### 配对存储并发 / 幂等

**主张：** 配对存储应在并发交错下仍强制 `MaxPending` 与幂等（即“先检查再写入”必须原子/加锁；刷新不应产生重复）。

含义：
- 并发请求下，频道的 `MaxPending` 不可被超出。
- 同一 `(channel, sender)` 的重复请求/刷新不应生成重复的活跃 pending 条目。

- 绿（通过）：
  - `make pairing-race`（原子/锁定的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红（预期）：
  - `make pairing-race-negative`（非原子 begin/commit 上限竞态）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入站追踪关联 / 幂等

**主张：** ingestion 应在扇出时保持追踪关联，并在 provider 重试下保持幂等。

含义：
- 当一个外部事件映射为多个内部消息时，每一部分保持同一 trace/event identity。
- 重试不会导致重复处理。
- 若 provider 缺少事件 ID，去重应回退到安全键（如 trace ID），以避免丢弃不同事件。

- 绿：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**主张：** 路由默认保持 DM 会话隔离，仅在明确配置时才折叠（频道优先级 + identity links）。

含义：
- 频道级 dmScope 覆盖必须优先于全局默认。
- identityLinks 只能在明确链接组内折叠，不能跨无关 peer。

- 绿：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
