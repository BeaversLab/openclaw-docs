---
summary: 针对 OpenClaw 最高风险路径的机器检查安全模型。
title: 形式化验证（安全模型）
read_when:
  - Reviewing formal security model guarantees or limits
  - Reproducing or updating TLA+/TLC security model checks
permalink: /security/formal-verification/
---

本页面跟踪 OpenClaw 的**形式化安全模型**（目前为 TLA+/TLC；根据需要添加更多）。

> 注意：一些较旧的链接可能指的是之前的项目名称。

**目标（北极星）：** 提供一个机器检查的论据，证明 OpenClaw 在明确假设下执行其预期的安全策略（授权、会话隔离、工具门控和配置错误安全）。

**这目前是：** 一个可执行的、由攻击者驱动的**安全回归套件**：

- 每个声明都在有限状态空间上有一个可运行的模型检查。
- 许多声明都有一个配对的**负面模型**，它可以为现实的错误类别生成反例轨迹。

**这（目前）不是：** 一项证明，即“OpenClaw 在所有方面都是安全的”或完整的 TypeScript 实现是正确的。

## 模型所在位置

模型在一个单独的仓库中维护：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，而不是完整的 TypeScript 实现。模型和代码之间可能存在差异。
- 结果受 TLC 探索的状态空间限制；“绿色”并不意味着在模型假设和范围之外具有安全性。
- 某些声明依赖于明确的环境假设（例如，正确的部署、正确的配置输入）。

## 复现结果

目前，通过在本地克隆模型仓库并运行 TLC 来复现结果（见下文）。未来的迭代可能会提供：

- CI 运行模型并提供公共产物（反例轨迹、运行日志）
- 用于小型、有限检查的托管“运行此模型”工作流

入门指南：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway(网关) 暴露和开放 Gateway(网关) 错误配置

**声明：** 在没有身份验证的情况下绑定到环回地址之外可能会导致远程入侵 / 增加暴露；令牌/密码可以阻止未经身份验证的攻击者（根据模型假设）。

- 绿色运行（通过）：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色运行（预期失败）：
  - `make gateway-exposure-v2-negative`

另请参阅模型仓库中的 `docs/gateway-exposure-matrix.md`。

### 节点执行管道（最高风险能力）

**声明：** `exec host=node` 需要 (a) 节点命令允许列表以及已声明的命令，和 (b) 配置时的实时批准；批准已被令牌化以防止重放（在模型中）。

- 绿色运行：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（私信限制）

**声明：** 配对请求遵守 TTL 和待处理请求上限。

- 绿色运行：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口限制（提及 + 控制命令绕过）

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

## v1++：附加的有界模型（并发、重试、追踪正确性）

这些是后续模型，它们加强了围绕现实世界故障模式（非原子更新、重试和消息分发）的保真度。

### 配对存储并发 / 幂等性

**声明：** 配对存储应强制执行 `MaxPending` 和幂等性，即使在交错操作下也是如此（即，“检查后写入”必须是原子的/锁定的；刷新不应创建重复项）。

含义：

- 在并发请求下，对于渠道，您不能超过 `MaxPending`。
- 针对同一 `(channel, sender)` 的重复请求/刷新不应创建重复的实时待处理行。

- 绿色运行：
  - `make pairing-race` （原子/锁定上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative` （非原子开始/提交上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口追踪关联 / 幂等性

**声明：** 接入应在扇出时保留链路关联性，并且在提供商重试下具有幂等性。

含义：

- 当一个外部事件变为多个内部消息时，每个部分都保持相同的链路/事件身份。
- 重试不会导致重复处理。
- 如果提供商事件 ID 缺失，去重会回退到安全密钥（例如链路 ID）以避免丢弃不同的事件。

- 绿色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红色（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**声明：** 路由必须默认保持私两会话隔离，并且仅在明确配置时才合并会话（渠道优先级 + 身份链接）。

含义：

- 特定渠道的 dmScope 覆盖必须优于全局默认值。
- identityLinks 应仅在显式关联的组内合并，而不是跨不相关的对等体。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`

## 相关

- [威胁模型](/zh/security/THREAT-MODEL-ATLAS)
- [为威胁模型做贡献](/zh/security/CONTRIBUTING-THREAT-MODEL)
