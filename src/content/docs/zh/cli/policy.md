---
summary: "CLICLI reference for `openclaw policy` conformance checks"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "Policy"
---

# `openclaw policy`

`openclaw policy`OpenClaw 由捆绑的策略插件提供。策略是现有 OpenClaw 设置之上的企业一致性层。它不添加第二个配置系统。`policy.jsonc`OpenClaw 定义了编写的要求，OpenClaw 将活动工作区作为证据进行观察，策略健康检查通过 `doctor --lint` 报告偏差。最终的一致性信号是一次干净的 `doctor --lint` 运行；策略将发现结果贡献到该共享的 lint 表面，而不是创建单独的健康网关。

策略目前管理已配置的渠道、MCP 服务器、模型提供商、网络 SSRF 状态、入口/渠道访问状态、Gateway(网关) 暴露状态、代理工作区状态、OpenClaw 配置密钥提供商/身份验证配置文件状态以及受管工具声明。例如，IT 或工作区操作员可以记录 Telegram 不是批准的渠道提供商，将 MCP 服务器和模型引用限制为批准的条目，要求专用网络获取/浏览器访问保持禁用状态，要求直接消息会话隔离和渠道入口状态保持在审查的边界内，要求 Gateway(网关) 绑定/身份验证/HTTP 暴露保持在审查的边界内，要求代理工作区访问和工具拒绝保持在审查的状态中，要求 OpenClaw 配置 SecretRefs 使用托管提供商，要求配置身份验证配置文件携带提供商/模式元数据，要求受管工具携带风险和敏感性元数据，然后使用 Gateway(网关)OpenClawTelegramGateway(网关)OpenClaw`doctor --lint` 作为共享的一致性网关。

当工作区需要持久的声明（例如“不得启用这些渠道”
或“受管工具必须声明审批元数据”）以及可重复的
方式来证明 OpenClaw 仍符合该声明时，请使用策略。如果您只需要本地行为且
do 不需要策略发现结果或证明输出，请仅使用常规配置和工作区文档。

## 快速开始

首次使用前，请启用内置的 Policy 插件：

```bash
openclaw plugins enable policy
```

启用策略后，doctor 可以加载策略健康检查而无需激活任意插件。如果缺少 `policy.jsonc`，该插件将保持启用状态，以便 doctor 可以报告缺失的工件。

Policy 是编写的，而非根据用户当前设置生成的。针对渠道、MCP 服务器、模型提供商、网络态势、入口/渠道访问、Gateway(网关) 暴露、代理工作区态势、已配置的沙箱运行时态势、OpenClaw 配置密钥提供商/身份验证配置文件态势以及工具元数据的最小策略如下所示：

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-telegram",
        "when": { "provider": "telegram" },
        "reason": "Telegram is not approved for this workspace.",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
    },
  },
  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },
  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
    },
  },
  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },
  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

规则具有最高权威。类别块只是一个命名空间；仅在存在具体规则时才运行检查。OpenClaw 读取当前的 OpenClaw`channels.*` 设置 `mcp.servers.*`、`models.providers.*`Gateway(网关)TailscaleOpenClaw、选定的代理模型引用、网络 SSRF 设置、私信会话范围、渠道 私信 策略、渠道组策略、渠道/组提及门控、Gateway(网关) 绑定/身份验证/控制 UI/Tailscale/远程/HTTP 状态、OpenClaw 配置代理沙盒工作区访问和工具拒绝状态、配置密钥提供商和 SecretRef 出处、配置身份验证配置文件元数据、配置的全局/每代理工具状态，以及 `TOOLS.md`Gateway(网关) 声明作为证据，然后报告不符合的观察状态。如果策略拒绝非环回 Gateway(网关) 绑定，请仅在您愿意审查运行时默认值时省略 `gateway.bind`；设置 `gateway.bind=loopback` 以实现严格的配置一致性。对于只读代理状态，请在适用的默认值或代理上配置沙盒模式，并将 `workspaceAccess` 设置为 `none` 或 `ro`；省略或 `off` 沙盒模式不满足只读/无写入策略。`agents.workspace.denyTools` 支持 `exec`、`process`、`write`、`edit` 和 `apply_patch`OpenClaw；OpenClaw 配置 `group:fs` 涵盖文件变更工具，`group:runtime` 涵盖 shell/进程工具。工具状态策略观察 `tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、`tools.exec.host`、`tools.elevated.enabled` 以及相同的每代理 `agents.list[].tools.*` 覆盖。它不读取运行时/操作员批准状态（如 exec-approvals.），也不在运行时强制执行工具调用。密钥证据记录提供商/源状态和 SecretRef 元数据，从不记录原始密钥值。策略不读取或证明每代理凭证存储（例如 `auth-profiles.json`）；这些存储仍由现有的身份验证和凭证流程所有。

### 策略规则参考

下方的每个策略字段都是可选的。仅当 `policy.jsonc` 中存在匹配规则时，才会运行检查。观察到的状态是现有的 OpenClaw 配置或工作区元数据；策略会报告偏差，但除非明确提供并启用了修复路径，否则不会重写运行时行为。

策略覆盖层将广泛的全局规则保持在全局范围，然后允许命名的作用域块为显式选择器添加更严格的常规策略部分。作用域名称仅是一个描述性的分类；匹配使用作用域内的选择器值。覆盖层是累加的：全局声明仍然运行，且作用域声明可以针对同一观察到的配置发出其自己的发现。

#### 作用域覆盖层

当一组代理或通道需要比顶层基线更严格的策略时，请使用 `scopes.<scopeName>`。代理作用域部分使用 `agentIds`，它支持 `tools.*`、`agents.workspace.*` 和 `sandbox.*`。通道作用域入口使用 `channelIds`，它支持 `ingress.channels.*`。不支持的部分将被拒绝，而不是被忽略。如果 `agents.list[]` 中不存在 `agentIds` 条目，OpenClaw 将针对该运行时代理 ID 继承的全局/默认姿态来评估作用域规则。

```jsonc
{
  "tools": {
    "exec": {
      "allowHosts": ["sandbox", "node"],
    },
  },
  "sandbox": {
    "requireMode": ["all", "non-main"],
  },
  "scopes": {
    "release-workspace": {
      "agentIds": ["release-agent", "review-agent"],
      "agents": {
        "workspace": {
          "allowedAccess": ["none", "ro"],
        },
      },
    },
    "release-lockdown": {
      "agentIds": ["release-agent"],
      "tools": {
        "exec": {
          "allowHosts": ["sandbox"],
          "allowSecurity": ["deny", "allowlist"],
          "requireAsk": ["always"],
        },
        "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
    },
    "shell-sandbox": {
      "agentIds": ["shell-agent"],
      "sandbox": {
        "allowBackends": ["openshell"],
        "containers": {
          "requireReadOnlyMounts": false,
        },
      },
    },
    "telegram-ingress": {
      "channelIds": ["telegram"],
      "ingress": {
        "channels": {
          "allowDmPolicies": ["pairing"],
          "denyOpenGroups": true,
          "requireMentionInGroups": true,
        },
      },
    },
  },
}
```

如上所示，当每个作用域管理不同的字段时，同一个代理可以出现在多个作用域中。根据策略元数据，同一代理的重复作用域字段必须具有同等或更严格的限制；较弱的重复声明将被拒绝。严格性元数据将允许列表视为子集，将拒绝列表视为超集，并将必需的布尔值视为固定要求。

容器姿态策略仅针对 OpenClaw 可以针对匹配的代理观察到的证据进行评估。如果启用的 `sandbox.containers.*` 规则适用于其沙盒后端无法公开该字段的代理，则策略会报告 `policy/sandbox-container-posture-unobservable` 而不是将该声明视为通过。对于使用不同沙盒后端的代理组，请使用单独的 `agentIds` 作用域，并为那些无法观察这些字段的组将不支持的容器规则保留为未设置或 false。

顶级 `ingress.session.requireDmScope` 仍然是全局的，因为 `session.dmScope` 不是可归因于渠道的证据。

| 选择器       | 支持的部分                               | 使用时机                               |
| ------------ | ---------------------------------------- | -------------------------------------- |
| `agentIds`   | `tools`、`agents.workspace` 和 `sandbox` | 一个或多个运行时代理需要更严格的规则。 |
| `channelIds` | `ingress.channels`                       | 一个或多个渠道需要更严格的入口规则。   |

`policy.jsonc` 中存在的每个作用域都必须是有效且可执行的。

#### 渠道

| 策略字段                             | 观察到的状态                  | 使用时机                                        |
| ------------------------------------ | ----------------------------- | ----------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` 提供商和启用状态 | 拒绝来自提供商（例如 `telegram`）的已配置渠道。 |
| `channels.denyRules[].reason`        | 发现消息和修复提示上下文      | 解释为什么拒绝该提供商。                        |

#### MCP 服务器

| 策略字段            | 观察到的状态       | 使用时机                                      |
| ------------------- | ------------------ | --------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ID | 要求每个配置的 MCP 服务器都必须在允许列表中。 |
| `mcp.servers.deny`  | `mcp.servers.*` ID | 拒绝特定的已配置 MCP 服务器 ID。              |

#### 模型提供商

| 策略字段                 | 观察到的状态                             | 使用时机                                             |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ID 和选定的模型引用 | 要求配置的提供商和选定的模型引用使用已批准的提供商。 |
| `models.providers.deny`  | `models.providers.*` ID 和选定的模型引用 | 按提供商 ID 拒绝配置的提供商和选定的模型引用。       |

#### 网络

| 策略字段                       | 观察到的状态                | 使用时机                                             |
| ------------------------------ | --------------------------- | ---------------------------------------------------- |
| `network.privateNetwork.allow` | Private-network SSRF 逃生舱 | 设置为 `false` 以要求保持禁用 private-network 访问。 |

#### Ingress 和 渠道 访问

| Policy 字段                               | 观测状态                                           | 使用时机                                      |
| ----------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `ingress.session.requireDmScope`          | `session.dmScope`                                  | 要求经过审查的 私信 隔离范围。                |
| `ingress.channels.allowDmPolicies`        | `channels.*.dmPolicy` 和旧版 渠道 私信 Policy 字段 | 仅允许经过审查的 私信 渠道 Policy。           |
| `ingress.channels.denyOpenGroups`         | 渠道、账户和组 Ingress Policy                      | 拒绝已配置 渠道 和账户的开放组 Ingress。      |
| `ingress.channels.requireMentionInGroups` | 渠道、账户、组、公会和嵌套提及网关配置             | 当组 Ingress 开放或提及门控时，要求提及网关。 |

#### Gateway(网关)

| Policy 字段                             | 观测状态                                  | 使用时机                                               |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                            | 设置为 `false` 以要求 loopback Gateway(网关) 绑定。    |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway(网关) 状态 | 设置为 `false` 以拒绝 Tailscale Funnel 暴露。          |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                       | 设置为 `true` 以拒绝禁用的 Gateway(网关) 认证。        |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                  | 设置为 `true` 以要求明确的认证速率限制配置。           |
| `gateway.controlUi.allowInsecure`       | 控制 UI 不安全认证/设备/源切换            | 设置为 `false` 以拒绝不安全的控制 UI 暴露切换。        |
| `gateway.remote.allow`                  | 远程 Gateway(网关) 模式/配置              | 设置为 `false` 以拒绝远程 Gateway(网关) 模式。         |
| `gateway.http.denyEndpoints`            | Gateway(网关) HTTP API 端点               | 拒绝端点 ID，例如 `chatCompletions` 或 `responses`。   |
| `gateway.http.requireUrlAllowlists`     | Gateway(网关) HTTP URL 获取输入           | 设置为 `true` 以要求对 URL 获取输入使用 URL 允许列表。 |

#### Agent 工作区

| 策略字段                         | 观察状态                                                                             | 使用场景                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.list[].sandbox.workspaceAccess` | 仅允许沙箱工作区访问值，例如 `none` 或 `ro`。                                             |
| `agents.workspace.denyTools`     | 全局和按 Agent 的工具拒绝配置                                                        | 要求拒绝工作区/运行时变更工具，例如 `exec`、`process`、`write`、`edit` 或 `apply_patch`。 |

#### 沙箱姿态

| 策略字段                                              | 观察状态                                          | 使用场景                                           |
| ----------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `sandbox.requireMode`                                 | `agents.defaults.sandbox.mode` 和按 Agent 模式    | 仅允许已审查的沙箱模式，例如 `all` 或 `non-main`。 |
| `sandbox.allowBackends`                               | `agents.defaults.sandbox.backend` 和按 Agent 后端 | 仅允许已审查的沙箱后端，例如 `docker`。            |
| `sandbox.containers.denyHostNetwork`                  | 容器支持的沙箱/浏览器网络模式                     | 拒绝主机网络模式。                                 |
| `sandbox.containers.denyContainerNamespaceJoin`       | 容器支持的沙箱/浏览器网络模式                     | 拒绝加入另一个容器的网络命名空间。                 |
| `sandbox.containers.requireReadOnlyMounts`            | 容器支持的沙箱/浏览器挂载模式                     | 要求挂载为只读。                                   |
| `sandbox.containers.denyContainerRuntimeSocketMounts` | 容器支持的沙箱/浏览器挂载目标                     | 拒绝容器运行时套接字挂载。                         |
| `sandbox.containers.denyUnconfinedProfiles`           | 容器安全配置文件姿态                              | 拒绝不受限制的容器安全配置文件。                   |
| `sandbox.browser.requireCdpSourceRange`               | 沙箱浏览器 CDP 源范围                             | 要求浏览器 CDP 暴露声明源范围。                    |

策略将缺失的 `sandbox.mode` 视为隐式默认值 `off`，因此
`sandbox.requireMode` 会将全新或未配置的沙箱报告为位于允许列表之外，
例如 `["all"]`。

#### 机密

| 策略字段                          | 观察状态                                      | 使用场景                                             |
| --------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `secrets.requireManagedProviders` | 配置 SecretRefs 和 `secrets.providers.*` 声明 | 设置为 `true` 以要求 SecretRefs 指向已声明的提供商。 |
| `secrets.denySources`             | Secret 提供商源和 SecretRef 源                | 拒绝诸如 `exec`、`file` 或其他已配置的源名称。       |
| `secrets.allowInsecureProviders`  | 不安全的 secret-提供商 姿态标志               | 设置为 `false` 以拒绝选择不安全姿态的提供商。        |

#### 认证配置文件

| 策略字段                        | 观察状态                             | 使用场景                                                                      |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | `auth.profiles.*` 提供商和模式元数据 | 要求配置认证配置文件上包含诸如 `provider` 和 `mode` 之类的元数据键。          |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`               | 仅允许支持的认证配置文件模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。 |

#### 工具元数据

| 策略字段                | 观察状态                 | 使用场景                                                              |
| ----------------------- | ------------------------ | --------------------------------------------------------------------- |
| `tools.requireMetadata` | 受管辖的 `TOOLS.md` 声明 | 要求受管辖的工具声明元数据键，例如 `risk`、`sensitivity` 或 `owner`。 |

#### 工具姿态

| 策略字段                        | 观察状态                                            | 使用场景                                                                     |
| ------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.list[].tools.profile`    | 仅允许工具配置文件 ID，例如 `minimal`、`messaging` 或 `coding`。             |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和每个代理 `tools.fs` 覆盖 | 设置为 `true` 以要求仅限工作区的文件系统工具姿态。                           |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和每个代理执行安全性          | 仅允许执行安全性模式，例如 `deny` 或 `allowlist`。                           |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和每个代理执行询问模式             | 要求批准姿态，例如 `always`。                                                |
| `tools.exec.allowHosts`         | `tools.exec.host` 和每代理执行主机路由              | 仅允许执行主机路由模式，例如 `sandbox`。                                     |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和每代理提升姿态           | 设置为 `false` 以要求提升工具模式保持禁用状态。                              |
| `tools.alsoAllow.expected`      | `tools.alsoAllow` 和每代理 `tools.alsoAllow`        | 要求确切的 `alsoAllow` 条目，并报告缺失或意外的附加工具授权。                |
| `tools.denyTools`               | `tools.deny` 和 `agents.list[].tools.deny`          | 要求配置的工具拒绝列表包含工具 ID 或组，例如 `group:runtime` 和 `group:fs`。 |

在创作期间运行仅策略检查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 仅运行策略检查集并发出证据、发现结果和
证明哈希。当启用 Policy 插件时，相同的发现结果也会出现在 `openclaw doctor --lint`
中。

将操作员策略文件与创作的基准策略文件进行比较：

```bash
openclaw policy compare --baseline official.policy.jsonc
openclaw policy compare --baseline official.policy.jsonc --policy policy.jsonc --json
```

`policy compare` 将策略文件语法与策略文件语法进行比较。它不
检查 OpenClaw 运行时状态、证据、凭证或机密。该命令
使用与管控范围覆盖相同的策略规则元数据：允许列表必须
保持相等或更窄，拒绝列表必须保持相等或更宽，所需的布尔值
必须保持其所需值，有序字符串必须仅向配置顺序的
更受限端移动，且精确列表必须匹配。

基准文件可以是组织创作的策略。被检查的策略可以
使用更严格的值或添加额外的策略规则。当顶层检查规则同等或更受限时，它也可以
满足范围基准规则，因为
顶层策略应用广泛。范围名称不需要匹配；范围
比较通过选择器值（例如 `agentIds` 或 `channelIds`）以及
正在检查的策略字段作为键。

干净的 JSON 比较输出示例仅报告策略文件比较状态：

```json
{
  "ok": true,
  "baselinePath": "official.policy.jsonc",
  "policyPath": "policy.jsonc",
  "rulesChecked": 3,
  "findings": []
}
```

干净的 `policy check --json` 输出示例包含可由操作员或主管记录的稳定哈希：

```json
{
  "ok": true,
  "attestation": {
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": []
}
```

## 配置策略

策略配置位于 `plugins.entries.policy.config` 之下。

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "enabled": true,
        "config": {
          "enabled": true,
          "path": "policy.jsonc",
          "workspaceRepairs": false,
          "expectedHash": "sha256:...",
          "expectedAttestationHash": "sha256:...",
        },
      },
    },
  },
}
```

| 设置                      | 用途                                           |
| ------------------------- | ---------------------------------------------- |
| `enabled`                 | 即使在 `policy.jsonc` 存在之前也启用策略检查。 |
| `workspaceRepairs`        | 允许 `doctor --fix` 编辑策略管理的工作区设置。 |
| `expectedHash`            | 已批准策略制品的可选哈希锁定。                 |
| `expectedAttestationHash` | 上次接受的无误策略检查的可选哈希锁定。         |
| `path`                    | 策略制品相对于工作区的位置。                   |

将 `plugins.entries.policy.config.enabled` 设置为 `false` 可在工作区禁用策略检查，同时保留已安装的插件。

工具元数据要求是在 `policy.jsonc` 中使用 `tools.requireMetadata` 编写的，例如 `["risk", "sensitivity", "owner"]`。

## 接受策略状态

JSON 输出示例：

```json
{
  "ok": true,
  "attestation": {
    "checkedAt": "2026-05-10T20:00:00.000Z",
    "policy": {
      "path": "policy.jsonc",
      "hash": "sha256:..."
    },
    "workspace": {
      "scope": "policy",
      "hash": "sha256:..."
    },
    "findingsHash": "sha256:...",
    "attestationHash": "sha256:..."
  },
  "evidence": {
    "channels": [
      {
        "id": "telegram",
        "provider": "telegram",
        "source": "oc://openclaw.config/channels/telegram",
        "enabled": false
      }
    ],
    "mcpServers": [
      {
        "id": "docs",
        "transport": "stdio",
        "source": "oc://openclaw.config/mcp/servers/docs",
        "command": "npx"
      }
    ],
    "modelProviders": [
      {
        "id": "openai",
        "source": "oc://openclaw.config/models/providers/openai"
      }
    ],
    "modelRefs": [
      {
        "ref": "openai/gpt-5.5",
        "provider": "openai",
        "model": "gpt-5.5",
        "source": "oc://openclaw.config/agents/defaults/model"
      }
    ],
    "network": [
      {
        "id": "browser-private-network",
        "source": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
        "value": false
      }
    ],
    "gatewayExposure": [
      {
        "id": "gateway-bind",
        "kind": "bind",
        "source": "oc://openclaw.config/gateway/bind",
        "value": "loopback",
        "nonLoopback": false,
        "explicit": true
      }
    ],
    "agentWorkspace": [
      {
        "id": "agents-defaults-workspace-access",
        "kind": "workspaceAccess",
        "source": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
        "scope": "defaults",
        "value": "ro",
        "sandboxMode": "all",
        "sandboxModeSource": "oc://openclaw.config/agents/defaults/sandbox/mode",
        "sandboxEnabled": true,
        "explicit": true
      },
      {
        "id": "agents-defaults-tool-exec",
        "kind": "toolDeny",
        "source": "oc://openclaw.config/tools/deny",
        "scope": "defaults",
        "tool": "exec",
        "denied": true,
        "explicit": true
      }
    ],
    "secrets": [
      {
        "id": "vault",
        "kind": "provider",
        "source": "oc://openclaw.config/secrets/providers/vault",
        "providerSource": "env"
      },
      {
        "id": "oc://openclaw.config/models/providers/openai/apiKey",
        "kind": "input",
        "source": "oc://openclaw.config/models/providers/openai/apiKey",
        "provenance": "secretRef",
        "refSource": "env",
        "refProvider": "vault"
      }
    ],
    "authProfiles": [
      {
        "id": "github",
        "source": "oc://openclaw.config/auth/profiles/github",
        "validMetadata": true,
        "provider": "github",
        "mode": "token"
      }
    ],
    "tools": [
      {
        "id": "deploy",
        "source": "oc://TOOLS.md/tools/deploy",
        "line": 12,
        "risk": "critical",
        "sensitivity": "restricted",
        "capabilities": ["IRREVERSIBLE_EXTERNAL"]
      }
    ]
  },
  "checksRun": 30,
  "checksSkipped": 0,
  "findings": []
}
```

策略哈希标识已编写的规则制品。证据块记录策略检查所用的观察到的 OpenClaw 状态。OpenClaw`workspace.hash` 值标识所检查范围的该证据载荷。发现哈希标识检查返回的确切发现集合。`checkedAt` 记录评估运行的时间。证明哈希标识稳定声明：策略哈希、证据哈希、发现哈希，以及结果是否干净。它有意不包括 `checkedAt`，因此相同的策略状态在重复检查中会产生相同的证明。这些共同构成了此策略检查的审计元组。

如果后续的网关或主管使用策略来阻止、批准或注释运行时操作，它应记录上次无误策略检查的证明哈希。`checkedAt` 保留在 JSON 输出中用于审计日志，但不是稳定证明哈希的一部分。

在接受策略状态时使用此生命周期：

1. 编写或审核 `policy.jsonc`。
2. 运行 `openclaw policy check --json`。
3. 如果结果是干净的，则将 `attestation.policy.hash` 记录为 `expectedHash`。
4. 将 `attestation.attestationHash` 记录为 `expectedAttestationHash`。
5. 在 CI 或发布门控中重新运行 `openclaw doctor --lint`。

如果策略规则有意更改，请从干净的检查中更新两个接受的哈希值。如果工作区设置有意更改但策略保持不变，通常只有 `expectedAttestationHash` 会更改。

启用或升级 `agents.workspace` 规则会将 `agentWorkspace` 证据添加到工作区哈希和证明哈希中。操作员应在启用这些规则后审查新证据并刷新接受的证明哈希。启用或升级工具姿态规则也会以相同方式添加 `toolPosture` 证据。

`openclaw policy watch` 反复运行相同的检查，并在当前证据不再匹配 `expectedAttestationHash` 时进行报告：

```bash
openclaw policy watch --json
```

在 CI 或仅需一次漂移评估的脚本中使用 `--once`。如果没有 `--once`，该命令默认每两秒轮询一次；使用 `--interval-ms` 选择不同的间隔。

## 发现

策略当前验证：

| 检查 ID                                           | 发现                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                     | 策略已启用但缺少 `policy.jsonc`。                                   |
| `policy/policy-jsonc-invalid`                     | 策略无法解析或包含格式错误的规则条目。                              |
| `policy/policy-hash-mismatch`                     | 策略与配置的 `expectedHash` 不匹配。                                |
| `policy/attestation-hash-mismatch`                | 当前策略证据不再匹配接受的证明。                                    |
| `policy/policy-conformance-invalid`               | 基线或受检查的策略文件具有无效的比较语法。                          |
| `policy/policy-conformance-missing`               | 受检查的策略文件缺少基线策略文件所需的规则。                        |
| `policy/policy-conformance-weaker`                | 受检查的策略文件的值比基线策略文件的值更弱。                        |
| `policy/channels-denied-provider`                 | 启用的渠道匹配渠道拒绝规则。                                        |
| `policy/mcp-denied-server`                        | 配置的 MCP 服务器被策略拒绝。                                       |
| `policy/mcp-unapproved-server`                    | 配置的 MCP 服务器不在允许列表中。                                   |
| `policy/models-denied-provider`                   | 配置的模型提供商或模型引用使用了被拒绝的提供商。                    |
| `policy/models-unapproved-provider`               | 配置的模型提供商或模型引用不在允许列表中。                          |
| `policy/network-private-access-enabled`           | 当策略拒绝时，启用了私有网络 SSRF 逃生舱口。                        |
| `policy/ingress-dm-policy-unapproved`             | 渠道私信策略不在策略允许列表中。                                    |
| `policy/ingress-dm-scope-unapproved`              | `session.dmScope` 与策略要求的私信隔离范围不匹配。                  |
| `policy/ingress-open-groups-denied`               | 渠道组策略为 `open`，而策略拒绝开放组入口。                         |
| `policy/ingress-group-mention-required`           | 当策略要求提及门控（mention gates）时，某个渠道或群组条目将其禁用。 |
| `policy/gateway-non-loopback-bind`                | 当策略拒绝时，Gateway(网关) 绑定姿态允许非环回暴露。                |
| `policy/gateway-auth-disabled`                    | 当策略要求身份验证时，Gateway(网关) 身份验证已禁用。                |
| `policy/gateway-rate-limit-missing`               | 当策略要求时，Gateway(网关) 身份验证速率限制姿态不明确。            |
| `policy/gateway-control-ui-insecure`              | Gateway(网关) 控制 UI 不安全暴露开关已启用。                        |
| `policy/gateway-tailscale-funnel`                 | 当策略拒绝时，Gateway(网关) Tailscale Funnel 暴露已启用。           |
| `policy/gateway-remote-enabled`                   | 当策略拒绝时，Gateway(网关) 远程模式处于活动状态。                  |
| `policy/gateway-http-endpoint-enabled`            | Gateway(网关) HTTP API 端点已启用，但被策略拒绝。                   |
| `policy/gateway-http-url-fetch-unrestricted`      | Gateway(网关) HTTP URL 获取输入缺少必需的 URL 允许列表。            |
| `policy/agents-workspace-access-denied`           | 代理沙盒模式或工作区访问权限不在策略允许列表中。                    |
| `policy/agents-tool-not-denied`                   | 代理或默认配置未拒绝策略要求的工具。                                |
| `policy/tools-profile-unapproved`                 | 配置的全局或每个代理的工具配置文件不在允许列表中。                  |
| `policy/tools-fs-workspace-only-required`         | 文件系统工具未配置为仅工作区路径姿态。                              |
| `policy/tools-exec-security-unapproved`           | Exec 安全模式超出了策略允许列表。                                   |
| `policy/tools-exec-ask-unapproved`                | Exec 询问模式超出了策略允许列表。                                   |
| `policy/tools-exec-host-unapproved`               | Exec 主机路由超出了策略允许列表。                                   |
| `policy/tools-elevated-enabled`                   | 当策略拒绝时，启用了提升工具模式。                                  |
| `policy/tools-also-allow-missing`                 | 配置的 `alsoAllow` 列表缺少策略所需的条目。                         |
| `policy/tools-also-allow-unexpected`              | 配置的 `alsoAllow` 列表包含策略未预期的条目。                       |
| `policy/tools-required-deny-missing`              | 全局或每个代理的工具拒绝列表未包含必需的被拒绝工具。                |
| `policy/sandbox-mode-unapproved`                  | 沙箱模式超出了策略允许列表。                                        |
| `policy/sandbox-backend-unapproved`               | 沙箱后端超出了策略允许列表。                                        |
| `policy/sandbox-container-posture-unobservable`   | 为无法观察它的后端启用了容器姿态规则。                              |
| `policy/sandbox-container-host-network-denied`    | 容器支持的沙箱或浏览器使用了主机网络模式。                          |
| `policy/sandbox-container-namespace-join-denied`  | 容器支持的沙箱或浏览器加入了另一个容器命名空间。                    |
| `policy/sandbox-container-mount-mode-required`    | 容器支持的沙箱或浏览器挂载不是只读的。                              |
| `policy/sandbox-container-runtime-socket-mount`   | 容器支持的沙箱或浏览器挂载暴露了容器运行时套接字。                  |
| `policy/sandbox-container-unconfined-profile`     | 当策略拒绝时，容器沙箱配置文件不受限制。                            |
| `policy/sandbox-browser-cdp-source-range-missing` | 当策略要求时，缺少沙箱浏览器 CDP 源范围。                           |
| `policy/secrets-unmanaged-provider`               | 配置 SecretRef 引用了未在 `secrets.providers` 下声明的提供商。      |
| `policy/secrets-denied-provider-source`           | 配置密钥提供商或 SecretRef 使用了策略拒绝的来源。                   |
| `policy/secrets-insecure-provider`                | 当策略拒绝时，密钥提供商选择了不安全的姿态。                        |
| `policy/auth-profile-invalid-metadata`            | 配置身份验证配置文件缺少有效的提供商或模式元数据。                  |
| `policy/auth-profile-unapproved-mode`             | 配置身份验证配置文件模式超出了策略允许列表。                        |
| `policy/tools-missing-risk-level`                 | 受管工具声明缺少风险元数据。                                        |
| `policy/tools-unknown-risk-level`                 | 受管工具声明使用了未知的风险值。                                    |
| `policy/tools-missing-sensitivity-token`          | 受管工具声明缺少敏感度元数据。                                      |
| `policy/tools-missing-owner`                      | 受管工具声明缺少所有者元数据。                                      |
| `policy/tools-unknown-sensitivity-token`          | 受管工具声明使用了未知的敏感度值。                                  |

策略发现可以同时包含 `target` 和 `requirement`。`target` 是
不符合规范的已观察工作区对象。`requirement` 是导致其成为发现的
已编写策略规则。这两个值目前都是地址，通常是
`oc://` 路径，但字段名称描述的是它们的策略角色，而不是
地址格式。

JSON 发现示例：

```json
{
  "checkId": "policy/channels-denied-provider",
  "severity": "error",
  "message": "Channel 'telegram' uses denied provider 'telegram'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/channels/telegram",
  "target": "oc://openclaw.config/channels/telegram",
  "requirement": "oc://policy.jsonc/channels/denyRules/#0",
  "fixHint": "Telegram is not approved for this workspace."
}
```

工具发现示例：

```json
{
  "checkId": "policy/tools-missing-risk-level",
  "severity": "error",
  "message": "TOOLS.md tool 'deploy' has no explicit risk classification.",
  "source": "policy",
  "path": "TOOLS.md",
  "line": 12,
  "ocPath": "oc://TOOLS.md/tools/deploy",
  "target": "oc://TOOLS.md/tools/deploy",
  "requirement": "oc://policy.jsonc/tools/requireMetadata"
}
```

MCP 发现示例：

```json
{
  "checkId": "policy/mcp-unapproved-server",
  "severity": "error",
  "message": "MCP server 'remote' is not in the policy allowlist.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/mcp/servers/remote",
  "target": "oc://openclaw.config/mcp/servers/remote",
  "requirement": "oc://policy.jsonc/mcp/servers/allow"
}
```

模型提供商发现示例：

```json
{
  "checkId": "policy/models-unapproved-provider",
  "severity": "error",
  "message": "Model ref 'anthropic/claude-sonnet-4.7' uses unapproved provider 'anthropic'.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "target": "oc://openclaw.config/agents/defaults/model/fallbacks/#0",
  "requirement": "oc://policy.jsonc/models/providers/allow"
}
```

网络发现示例：

```json
{
  "checkId": "policy/network-private-access-enabled",
  "severity": "error",
  "message": "Network setting 'browser-private-network' allows private-network access.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "target": "oc://openclaw.config/browser/ssrfPolicy/dangerouslyAllowPrivateNetwork",
  "requirement": "oc://policy.jsonc/network/privateNetwork/allow"
}
```

Gateway(网关) 暴露发现示例：

```json
{
  "checkId": "policy/gateway-non-loopback-bind",
  "severity": "error",
  "message": "Gateway bind setting 'gateway-bind' permits non-loopback exposure.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/gateway/bind",
  "target": "oc://openclaw.config/gateway/bind",
  "requirement": "oc://policy.jsonc/gateway/exposure/allowNonLoopbackBind"
}
```

Agent 工作区发现示例：

```json
{
  "checkId": "policy/agents-workspace-access-denied",
  "severity": "error",
  "message": "agents.defaults sandbox workspaceAccess 'rw' is not allowed by policy.",
  "source": "policy",
  "path": "openclaw config",
  "ocPath": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "target": "oc://openclaw.config/agents/defaults/sandbox/workspaceAccess",
  "requirement": "oc://policy.jsonc/agents/workspace/allowedAccess"
}
```

## 修复

`doctor --lint` 和 `policy check` 是只读的。

`doctor --fix` 仅在
明确启用 `workspaceRepairs` 时才会编辑策略管理的工作区设置。如果没有该选择性加入，策略检查
将报告其修复内容并保持设置不变。

在此版本中，修复可以禁用 OpenClaw 配置中启用但被 OpenClaw`channels.denyRules` 拒绝的渠道。仅在
审查策略文件后启用 `workspaceRepairs`，因为有效的拒绝规则可能会关闭
已配置的渠道：

```jsonc
{
  "plugins": {
    "entries": {
      "policy": {
        "config": {
          "workspaceRepairs": true,
        },
      },
    },
  },
}
```

## 退出代码

| 命令             | `0`                            | `1`                                | `2`                |
| ---------------- | ------------------------------ | ---------------------------------- | ------------------ |
| `policy check`   | 未达到阈值的发现。             | 一个或多个发现达到了阈值。         | 参数或运行时失败。 |
| `policy compare` | 策略文件至少与基线一样严格。   | 策略文件无效、缺失或弱于基线规则。 | 参数或运行时失败。 |
| `policy watch`   | 没有发现且接受的哈希是最新的。 | 发现结果存在或已接受的认证已过时。 | 参数或运行时失败。 |

## 相关

- [Doctor lint 模式](/zh/cli/doctor#lint-mode)
- [Path CLI](CLI/en/cli/path)
