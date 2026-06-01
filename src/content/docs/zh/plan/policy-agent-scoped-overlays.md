---
summary: "基于全局策略规则叠加的每代理策略插件覆盖层。"
read_when:
  - You are designing per-agent policy requirements
  - You need to distinguish tool posture policy from workspace policy
  - You are configuring stricter policy for one named agent
title: "代理范围策略覆盖层"
---

# 代理范围策略覆盖层

OpenClaw 策略支持全局要求以及针对显式运行时代理 ID 的更严格要求。某些部署需要某一个代理使用比其他代理更严格的工作空间和工具姿态，但部署范围的规则不应强制所有代理使用相同的姿态。

本页描述了代理范围覆盖模型。字段参考保留在[`openclaw policy`](/zh/cli/policy)。

## 设计目标

- 将全局策略作为部署基线。
- 允许命名代理添加更严格的要求，而不削弱全局规则。
- 在证据可以归属于代理的地方，复用现有的策略部分形状。
- 避免将 `agents.workspace` 变成第二个工具权限系统。
- 在证据可以映射到代理之前，保持仅全局检查为全局范围。

## 形状

使用 `scopes.<scopeName>` 来表示特定用途的代理策略范围。每个范围列出了它适用的运行时 `agentIds`，然后在部分证据可以归属于这些代理的地方，复用正常的顶级策略部分语法。初始发布的范围部分是 `tools` 和 `agents.workspace`；sandbox 和 ingress 暂不包含在此 PR 中，可以在那些策略 PR 合并并且其证据携带代理身份后加入同一容器。范围字段清单由策略规则元数据支持，该元数据记录每个字段的严格性语义，以便以后进行策略文件一致性检查。

```jsonc
{
  "tools": {
    "denyTools": ["process"],
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
    },
  },
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
      "tools": {
        "profiles": { "allow": ["minimal", "messaging"] },
        "fs": { "requireWorkspaceOnly": true },
        "exec": {
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
          "allowHosts": ["sandbox"],
        },
        "elevated": { "allow": false },
        "alsoAllow": { "expected": ["message", "read"] },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

`agents.workspace` 仍然是现有的全代理工作区基线。
`scopes.<scopeName>` 是一个范围覆盖，而不是全局策略的替代品。
范围名称仅用于描述；匹配使用 `agentIds`，而非显示名称。
它有意包含正常的章节名称，而不是专用的每代理迷你语法。
`policy.jsonc` 中存在的每个范围都必须有效且可执行。
在此 PR 中，唯一支持的选择器是 `agentIds`，并且它仅支持 `tools.*`
和 `agents.workspace.*`。

## 分层语义

策略评估是累加的：

1. 顶级策略适用于所有匹配的证据。
2. 现有的 `agents.workspace` 适用于默认值和每个列出的代理。
3. `scopes.<scopeName>` 适用于 `agentIds` 中每个标准化运行时
   id 的证据。
4. 当多个范围块控制不同的字段，或者根据策略元数据，同一字段的后续值
   具有同等或更严格的限制时，它们可以针对同一个代理。
5. 命名代理覆盖可以收紧策略，但不能使全局违规变得可接受。

如果全局和代理范围的规则都失败了，发现结果应指向被违反的规则：

```text
oc://policy.jsonc/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/tools/denyTools
oc://policy.jsonc/scopes/release-agent-lockdown/agents/workspace/allowedAccess
```

这即使广泛的工具姿态、命名代理工具姿态和工作区姿态观察相同的配置字段，
也能将其作为单独的要求进行审计。

精确列表声明（如 `tools.alsoAllow.expected`）将配置列表
与预期列表进行比较，并报告缺失的预期条目和意外的多余条目。
这适用于累加姿态，如 `alsoAllow`，其中一个
额外的条目可能会超出代理的审查范围。

## 策略和配置分层

覆盖模型将策略的编写位置与 OpenClaw 配置的
观察位置分离开来：

| 策略范围                                | 观察的配置                            | 适用于                   | 示例结果                                                                 |
| --------------------------------------- | ------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| 顶级 `tools.*`                          | 全局 `tools.*` 和继承的代理工具姿态   | 所有使用匹配姿态的代理   | 拒绝每个代理的 `gateway` exec host，除非全局策略允许。                   |
| 顶层 `tools.*`                          | `agents.list[].tools.*` 覆盖          | 任何具有覆盖的 Agent     | 标记一个将 `tools.exec.host` 覆盖为未批准值的 Agent。                    |
| `scopes.<scopeName>.tools.*`            | 匹配 `agents.list[]` 条目和继承的姿态 | 仅该指定的 Agent         | 让大多数 Agent 使用 `node` 执行主机，而一个 Agent 必须仅使用 `sandbox`。 |
| `agents.workspace`                      | 默认值和每个列出的 Agent 工作区姿态   | 默认值和所有列出的 Agent | 要求每个 Agent 工作区访问都为 `none` 或 `ro`。                           |
| `scopes.<scopeName>.agents.workspace.*` | 匹配 `agents.list[]` 工作区姿态       | 仅该指定的 Agent         | 要求一个 Agent 为只读，而不要求 `main` 如此。                            |

每个 Agent 的覆盖是叠加的。命名 Agent 的规则可以比顶层规则更严格，但它不能使全局违规变为可接受。对于允许列表规则，当两者同时存在时，有效允许集是全局规则和命名 Agent 覆盖的交集。

例如，如果顶层 `tools.exec.allowHosts` 允许 `["sandbox", "node"]`
且 `scopes.release-agent-lockdown.tools.exec.allowHosts` 仅允许
`["sandbox"]`，当 `release-agent` 的有效执行主机为 `node` 时 `release-agent` 将失败；
另一个 Agent 仍可
使用 `node` 通过。

## 工具姿态与工作区姿态

工具姿态属于 `tools` 之下，因为它描述配置可能公开的工具行为。现有的 `tools.*` 策略同时观察全局 `tools.*` 配置和每个 Agent 的 `agents.list[].tools.*` 覆盖。

工作区姿态属于 `workspace` 之下，因为它描述沙盒模式和工作区访问。工作区部分不应扩展为通用工具策略命名空间。如果一个 Agent 需要更严格的工具限制以使其工作区姿态有意义，请将这些限制置于同一 Agent 覆盖下的 `scopes.<scopeName>.tools` 中。

对于受限制的发布代理，预期的划分是：

```jsonc
{
  "scopes": {
    "release-agent-lockdown": {
      "agentIds": ["release-agent"],
      "agents": {
        "workspace": { "allowedAccess": ["none", "ro"] },
      },
      "tools": {
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
    },
  },
}
```

## 章节适用性

仅当策略证据携带代理 ID 或可在不猜测的情况下归因于某个代理时，才应添加代理范围的章节。

| 章节        | 初始代理范围状态 | 原因                                                         |
| ----------- | ---------------- | ------------------------------------------------------------ |
| `workspace` | 包含             | 代理沙盒/工作区证据已具有代理身份。                          |
| `tools`     | 包含             | 工具姿态证据包括全局和每个代理的工具配置。                   |
| `sandbox`   | 管道后续工作     | 在沙盒姿态 PR 合并并且证据可以确定范围之前，将其排除在外。   |
| `ingress`   | 管道后续工作     | 在入口/渠道姿态落地并具有代理归属之前，将其排除在外。        |
| `models`    | 映射时包含       | 选定的模型引用可以是特定于代理的。                           |
| `mcp`       | 映射时包含       | 仅当 MCP 服务器证据可归因于某个代理时才使用。                |
| `auth`      | 推迟             | 除非代理绑定明确，否则身份验证配置文件元数据是一个配置目录。 |
| `channels`  | 推迟             | 在路由确定范围之前，渠道提供商姿态是部署级别的。             |
| `gateway`   | 保持全局         | Gateway(网关) 曝光/身份验证/http 姿态是进程级别的。          |
| `network`   | 保持全局         | 私有网络 SSRF 姿态是运行时级别的。                           |
| `secrets`   | 首先保持全局     | 除非引用具有代理归属，否则密钥提供商姿态是共享的。           |

## 兼容性

该实现是增量式的：

- 保持所有现有的顶级策略字段有效；
- 保持 `agents.workspace` 语义不变；
- 在评估范围规则之前验证 `scopes`；
- 在范围章节的证据和策略合约实施之前，明确拒绝不支持的范围章节；
- 不要将顶级 `tools.requireMetadata` 重新解释为代理范围的，因为
  工具元数据描述的是已声明的工作区工具目录；
- 当存在任何范围规则时，将代理范围的证据包含在证明哈希中。

这使得广泛的工具姿态可以保持为顶级策略合约，而命名代理
可以在不削弱全局基线的情况下添加更严格的可观察声明。
