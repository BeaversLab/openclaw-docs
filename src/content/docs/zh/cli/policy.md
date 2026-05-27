---
summary: "CLI用于 `openclaw policy` 合规性检查的 CLI 参考"
read_when:
  - You want to check OpenClaw settings against an authored policy.jsonc
  - You want policy findings in doctor lint
  - You need a policy attestation hash for audit evidence
title: "策略"
---

# `openclaw policy`

`openclaw policy`OpenClaw 由捆绑的策略插件提供。策略是现有 OpenClaw 设置之上的企业合规层。它不会添加
第二个配置系统。`policy.jsonc`OpenClaw 定义了编写的需求，
OpenClaw 将活动工作区作为证据进行观察，策略健康检查
通过 `doctor --lint` 报告偏差。最终的合规信号是一次干净的
`doctor --lint` 运行；策略将发现结果贡献给该共享的 lint 表面，
而不是创建单独的健康关卡。

策略目前管理配置的渠道、MCP 服务器、模型提供商、
网络 SSRF 姿态、Gateway(网关) 暴露姿态、代理工作区姿态、
OpenClaw 配置密钥提供商/认证配置文件姿态以及受管工具
declarations。例如，IT 或工作区操作员可以记录 Telegram
不是批准的渠道提供商，将 MCP 服务器和模型引用限制为
批准的条目，要求保持禁用专用网络获取/浏览器访问，
要求 Gateway(网关) 绑定/认证/HTTP 暴露保持在已审查的
范围内，要求代理工作区访问和工具拒绝保持在已审查的
姿态中，要求 OpenClaw 配置 SecretRefs 使用托管提供商，
要求配置认证配置文件携带提供商/模式元数据，要求受管工具
carry 风险和敏感度元数据，然后使用 Gateway(网关)OpenClawTelegramGateway(网关)OpenClaw`doctor --lint` 作为共享
合规关卡。

当工作区需要持久的声明（例如“不得启用这些渠道”
或“受管工具必须声明审批元数据”）以及可重复的
方式来证明 OpenClaw 仍符合该声明时，请使用策略。如果您只需要本地行为且
do 不需要策略发现结果或证明输出，请仅使用常规配置和工作区文档。

## 快速开始

首次使用前，请启用内置的 Policy 插件：

```bash
openclaw plugins enable policy
```

启用 policy 后，doctor 可以加载 policy 健康检查，而无需激活任意插件。如果 `policy.jsonc` 缺失，该插件将保持启用状态，以便 doctor 能够报告缺失的构件。

Policy 是编写的，而不是从用户当前设置生成的。针对通道、MCP 服务器、模型提供商、网络态势、Gateway(网关) 暴露、代理工作区态势、OpenClaw 配置机密提供商/身份验证配置文件态势以及工具元数据的最小策略如下所示：

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

规则具有权威性。类别块只是一个命名空间；只有在存在具体规则时才会进行检查。OpenClaw 会读取当前的 OpenClaw`channels.*` 设置 `mcp.servers.*`、`models.providers.*`Gateway(网关)TailscaleOpenClaw、选定的代理模型引用、网络 SSRF 设置、Gateway（网关）绑定/身份验证/Control UI/Tailscale/远程/HTTP 状态、OpenClaw 配置代理沙盒工作区访问和工具拒绝状态、配置密钥提供商和 SecretRef 来源、配置身份验证配置文件元数据、配置的全局/每代理工具状态，以及 `TOOLS.md`Gateway(网关) 声明作为证据，然后报告不符合要求的观察状态。如果策略拒绝非环回 Gateway（网关）绑定，仅当您愿意审查运行时默认值时才省略 `gateway.bind`；设置 `gateway.bind=loopback` 以实现严格的配置一致性。对于只读代理状态，请在适用的默认值或代理上配置沙盒模式，并将 `workspaceAccess` 设置为 `none` 或 `ro`；省略或 `off` 沙盒模式不满足只读/无写入策略。`agents.workspace.denyTools` 支持 `exec`、`process`、`write`、`edit` 和 `apply_patch`OpenClaw；OpenClaw 配置 `group:fs` 涵盖文件变更工具，`group:runtime` 涵盖 shell/进程工具。工具状态策略会观察 `tools.profile`、`tools.allow`、`tools.alsoAllow`、`tools.deny`、`tools.fs.workspaceOnly`、`tools.exec.security`、`tools.exec.ask`、`tools.exec.host`、`tools.elevated.enabled` 以及相同的每代理 `agents.list[].tools.*` 覆盖。它不会读取运行时/操作员审批状态（例如 exec-approvals.），也不会在运行时强制执行工具调用。密钥证据记录提供商/来源状态和 SecretRef 元数据，从不记录原始密钥值。策略不会读取或证明每代理凭证存储（如 `auth-profiles.json`）；这些存储仍由现有的身份验证和凭证流程拥有。

### 策略规则参考

以下每个策略字段都是可选的。仅当匹配的规则存在于 `policy.jsonc` 中时才会运行检查。观察到的状态是现有的 OpenClaw 配置或工作区元数据；策略报告偏差但不会重写运行时行为，除非明确提供并启用了修复路径。

#### 渠道

| 策略字段                             | 观察到的状态                  | 使用场景                                        |
| ------------------------------------ | ----------------------------- | ----------------------------------------------- |
| `channels.denyRules[].when.provider` | `channels.*` 提供商和启用状态 | 拒绝来自提供商（例如 `telegram`）的已配置渠道。 |
| `channels.denyRules[].reason`        | 发现消息和修复提示上下文      | 解释为何拒绝该提供商。                          |

#### MCP 服务器

| 策略字段            | 观察到的状态       | 使用场景                                          |
| ------------------- | ------------------ | ------------------------------------------------- |
| `mcp.servers.allow` | `mcp.servers.*` ID | 要求每个已配置的 MCP 服务器都必须位于允许列表中。 |
| `mcp.servers.deny`  | `mcp.servers.*` ID | 拒绝特定的已配置 MCP 服务器 ID。                  |

#### 模型提供商

| 策略字段                 | 观察到的状态                           | 使用场景                                             |
| ------------------------ | -------------------------------------- | ---------------------------------------------------- |
| `models.providers.allow` | `models.providers.*` ID 和所选模型引用 | 要求已配置的提供商和所选模型引用使用已批准的提供商。 |
| `models.providers.deny`  | `models.providers.*` ID 和所选模型引用 | 按提供商 ID 拒绝已配置的提供商和所选模型引用。       |

#### 网络

| 策略字段                       | 观察到的状态           | 使用场景                                    |
| ------------------------------ | ---------------------- | ------------------------------------------- |
| `network.privateNetwork.allow` | 私有网络 SSRF 逃逸保护 | 设置为 `false` 以要求保持禁用私有网络访问。 |

#### Gateway(网关)

| 策略字段                                | 观察到的状态                              | 使用场景                                                    |
| --------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `gateway.exposure.allowNonLoopbackBind` | `gateway.bind`                            | 设置为 `false` 以要求环回 Gateway(网关) 绑定。              |
| `gateway.exposure.allowTailscaleFunnel` | Tailscale serve/funnel Gateway(网关) 姿态 | 设置为 `false` 以拒绝 Tailscale Funnel 暴露。               |
| `gateway.auth.requireAuth`              | `gateway.auth.mode`                       | 设置为 `true` 以拒绝禁用 Gateway(网关) 身份验证。           |
| `gateway.auth.requireExplicitRateLimit` | `gateway.auth.rateLimit`                  | 设置为 `true` 以要求显式的身份验证速率限制配置。            |
| `gateway.controlUi.allowInsecure`       | 控制 UI 不安全的身份验证/设备/源切换开关  | 设置为 `false` 以拒绝不安全的控制 UI 暴露切换开关。         |
| `gateway.remote.allow`                  | 远程 Gateway(网关) 模式/配置              | 设置为 `false`Gateway(网关) 以拒绝远程 Gateway(网关) 模式。 |
| `gateway.http.denyEndpoints`            | Gateway(网关) HTTP API 端点               | 拒绝端点 ID，例如 `chatCompletions` 或 `responses`。        |
| `gateway.http.requireUrlAllowlists`     | Gateway(网关) HTTP URL 获取输入           | 设置为 `true` 以要求 URL 获取输入具有 URL 允许列表。        |

#### Agent 工作区

| 策略字段                         | 观察状态                                                                             | 使用时机                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `agents.workspace.allowedAccess` | `agents.defaults.sandbox.workspaceAccess` 和 `agents.list[].sandbox.workspaceAccess` | 仅允许沙盒工作区访问值，例如 `none` 或 `ro`。                                             |
| `agents.workspace.denyTools`     | 全局和按代理的工具拒绝配置                                                           | 要求拒绝工作区/运行时变更工具，例如 `exec`、`process`、`write`、`edit` 或 `apply_patch`。 |

#### 密钥

| 策略字段                          | 观察状态                                     | 使用时机                                            |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `secrets.requireManagedProviders` | 配置 SecretRef 和 `secrets.providers.*` 声明 | 设置为 `true` 以要求 SecretRef 指向已声明的提供商。 |
| `secrets.denySources`             | 密钥提供商源和 SecretRef 源                  | 拒绝源，例如 `exec`、`file` 或其他已配置的源名称。  |
| `secrets.allowInsecureProviders`  | 不安全的密钥提供商态势标志                   | 设置为 `false` 以拒绝选择不安全态势的提供商。       |

#### 身份验证配置文件

| 策略字段                        | 观察状态                             | 使用时机                                                                            |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `auth.profiles.requireMetadata` | `auth.profiles.*` 提供商和模式元数据 | 要求配置身份验证配置文件具有元数据键，例如 `provider` 和 `mode`。                   |
| `auth.profiles.allowModes`      | `auth.profiles.*.mode`               | 仅允许受支持的身份验证配置文件模式，例如 `api_key`、`aws-sdk`、`oauth` 或 `token`。 |

#### 工具元数据

| 策略字段                | 观察状态             | 使用时机                                                          |
| ----------------------- | -------------------- | ----------------------------------------------------------------- |
| `tools.requireMetadata` | 受管 `TOOLS.md` 声明 | 要求受管工具声明元数据键，例如 `risk`、`sensitivity` 或 `owner`。 |

#### 工具姿态

| 策略字段                        | 观察状态                                            | 使用时机                                                                     |
| ------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `tools.profiles.allow`          | `tools.profile` 和 `agents.list[].tools.profile`    | 仅允许工具配置文件 ID，例如 `minimal`、`messaging` 或 `coding`。             |
| `tools.fs.requireWorkspaceOnly` | `tools.fs.workspaceOnly` 和每个代理 `tools.fs` 覆盖 | 设置为 `true` 以要求仅限工作区的文件系统工具姿态。                           |
| `tools.exec.allowSecurity`      | `tools.exec.security` 和每个代理 exec 安全性        | 仅允许 exec 安全模式，例如 `deny` 或 `allowlist`。                           |
| `tools.exec.requireAsk`         | `tools.exec.ask` 和每个代理 exec 询问模式           | 要求批准姿态，例如 `always`。                                                |
| `tools.exec.allowHosts`         | `tools.exec.host` 和每个代理 exec 主机路由          | 仅允许 exec 主机路由模式，例如 `sandbox`。                                   |
| `tools.elevated.allow`          | `tools.elevated.enabled` 和每个代理提升姿态         | 设置为 `false` 以要求提升的工具模式保持禁用状态。                            |
| `tools.denyTools`               | `tools.deny` 和 `agents.list[].tools.deny`          | 要求配置的工具拒绝列表包括工具 ID 或组，例如 `group:runtime` 和 `group:fs`。 |

在编写期间仅运行策略检查：

```bash
openclaw policy check
openclaw policy check --json
openclaw policy check --severity-min error
```

`policy check` 仅运行策略检查集并输出证据、发现和证明哈希。当启用策略插件时，相同的发现也会出现在 `openclaw doctor --lint` 中。

示例干净的 JSON 输出包含可由操作员或主管记录的稳定哈希：

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

策略配置位于 `plugins.entries.policy.config` 下。

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

| 设置                      | 用途                                             |
| ------------------------- | ------------------------------------------------ |
| `enabled`                 | 即使在 `policy.jsonc` 存在之前也启用策略检查。   |
| `workspaceRepairs`        | 允许 `doctor --fix` 编辑由策略管理的工作区设置。 |
| `expectedHash`            | 已批准策略构件的可选哈希锁定。                   |
| `expectedAttestationHash` | 上次接受的干净策略检查的可选哈希锁定。           |
| `path`                    | 策略构件的工作区相对位置。                       |

将 `plugins.entries.policy.config.enabled` 设置为 `false` 以禁用工作区的策略检查，同时保留已安装的插件。

工具元数据要求是在 `policy.jsonc` 中使用 `tools.requireMetadata` 编写的，例如 `["risk", "sensitivity", "owner"]`。

## 接受策略状态

示例 JSON 输出：

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

策略哈希标识编写的规则构件。证据块记录策略检查所观察到的 OpenClaw 状态。OpenClaw`workspace.hash` 值标识检查范围的该证据负载。发现哈希标识检查返回的确切发现集。`checkedAt` 记录评估运行的时间。证明哈希标识稳定声明：策略哈希、证据哈希、发现哈希以及结果是否干净。它故意不包括 `checkedAt`，因此相同的策略状态在重复检查中产生相同的证明。这些共同构成了此策略检查的审计元组。

如果后续的网关或监管程序使用策略来阻止、批准或标注运行时操作，它应记录最近一次策略检查通过的证明哈希。`checkedAt` 会保留在 JSON 输出中以用于审计日志，但不是稳定证明哈希的一部分。

在接受策略状态时，请使用此生命周期：

1. 编写或审核 `policy.jsonc`。
2. 运行 `openclaw policy check --json`。
3. 如果结果正常，则将 `attestation.policy.hash` 记录为 `expectedHash`。
4. 将 `attestation.attestationHash` 记录为 `expectedAttestationHash`。
5. 在 CI 或发布流程中重新运行 `openclaw doctor --lint`。

如果策略规则是有意更改的，请从通过检查中更新两个已接受的哈希。如果工作区设置是有意更改但策略保持不变，通常只有 `expectedAttestationHash` 会发生变化。

启用或升级 `agents.workspace` 规则会向工作区哈希和证明哈希添加 `agentWorkspace` 证据。操作员应在启用这些规则后审核新证据并刷新已接受的证明哈希。启用或升级工具姿态规则会以相同方式添加 `toolPosture` 证据。

`openclaw policy watch` 会重复运行相同的检查，并在当前证据不再匹配 `expectedAttestationHash` 时进行报告：

```bash
openclaw policy watch --json
```

在 CI 或仅需要一次漂移评估的脚本中使用 `--once`。如果不使用 `--once`，该命令默认每两秒轮询一次；使用 `--interval-ms` 可以选择不同的间隔。

## 发现结果

策略目前验证：

| 检查 ID                                      | 发现结果                                                       |
| -------------------------------------------- | -------------------------------------------------------------- |
| `policy/policy-jsonc-missing`                | 策略已启用但缺少 `policy.jsonc`。                              |
| `policy/policy-jsonc-invalid`                | 策略无法解析或包含格式错误的规则条目。                         |
| `policy/policy-hash-mismatch`                | 策略与配置的 `expectedHash` 不匹配。                           |
| `policy/attestation-hash-mismatch`           | 当前策略证据不再匹配已接受的证明。                             |
| `policy/channels-denied-provider`            | 启用的渠道匹配了渠道拒绝规则。                                 |
| `policy/mcp-denied-server`                   | 配置的 MCP 服务器被策略拒绝。                                  |
| `policy/mcp-unapproved-server`               | 配置的 MCP 服务器在允许列表之外。                              |
| `policy/models-denied-provider`              | 配置的模型提供商或模型引用使用了被拒绝的提供商。               |
| `policy/models-unapproved-provider`          | 配置的模型提供商或模型引用在允许列表之外。                     |
| `policy/network-private-access-enabled`      | 当策略拒绝时，启用了私有网络 SSRF 逃生舱。                     |
| `policy/gateway-non-loopback-bind`           | 当策略拒绝时，Gateway(网关) 绑定姿态允许非环回暴露。           |
| `policy/gateway-auth-disabled`               | 当策略要求身份验证时，Gateway(网关) 身份验证已被禁用。         |
| `policy/gateway-rate-limit-missing`          | 当策略要求时，Gateway(网关) 身份验证速率限制姿态不明确。       |
| `policy/gateway-control-ui-insecure`         | Gateway(网关) 控制 UI 不安全暴露开关已启用。                   |
| `policy/gateway-tailscale-funnel`            | 当策略拒绝时，启用了 Gateway(网关) Tailscale Funnel 暴露。     |
| `policy/gateway-remote-enabled`              | 当策略拒绝时，Gateway(网关) 远程模式处于活动状态。             |
| `policy/gateway-http-endpoint-enabled`       | 启用了 Gateway(网关) HTTP API 端点，但被策略拒绝。             |
| `policy/gateway-http-url-fetch-unrestricted` | Gateway(网关) HTTP URL 获取输入缺少必需的 URL 允许列表。       |
| `policy/agents-workspace-access-denied`      | 代理沙箱模式或工作区访问在策略允许列表之外。                   |
| `policy/agents-tool-not-denied`              | 代理或默认配置未拒绝策略要求的工具。                           |
| `policy/tools-profile-unapproved`            | 配置的全局或每个代理的工具配置文件在允许列表之外。             |
| `policy/tools-fs-workspace-only-required`    | 文件系统工具未配置为仅限工作区路径姿态。                       |
| `policy/tools-exec-security-unapproved`      | Exec 安全模式在策略允许列表之外。                              |
| `policy/tools-exec-ask-unapproved`           | Exec 询问模式在策略允许列表之外。                              |
| `policy/tools-exec-host-unapproved`          | Exec 主机路由在策略允许列表之外。                              |
| `policy/tools-elevated-enabled`              | 当策略拒绝时，启用了提升工具模式。                             |
| `policy/tools-required-deny-missing`         | 全局或特定于代理的工具拒绝列表未包含必需的拒绝工具。           |
| `policy/secrets-unmanaged-provider`          | 配置 SecretRef 引用了未在 `secrets.providers` 下声明的提供商。 |
| `policy/secrets-denied-provider-source`      | 配置机密提供商或 SecretRef 使用了策略拒绝的源。                |
| `policy/secrets-insecure-provider`           | 当策略拒绝机密提供商时，该提供商却选择了不安全的姿态。         |
| `policy/auth-profile-invalid-metadata`       | 配置身份验证配置文件缺少有效的提供商或模式元数据。             |
| `policy/auth-profile-unapproved-mode`        | 配置身份验证配置文件模式不在策略允许列表中。                   |
| `policy/tools-missing-risk-level`            | 受管工具声明缺少风险元数据。                                   |
| `policy/tools-unknown-risk-level`            | 受管工具声明使用了未知的风险值。                               |
| `policy/tools-missing-sensitivity-token`     | 受管工具声明缺少敏感度元数据。                                 |
| `policy/tools-missing-owner`                 | 受管工具声明缺少所有者元数据。                                 |
| `policy/tools-unknown-sensitivity-token`     | 受管工具声明使用了未知的敏感度值。                             |

策略发现结果可以包含 `target` 和 `requirement`。`target` 是不符合
要求的工作区观察对象。`requirement` 是将其标记为发现结果的编撰策略规则。
这两个值目前都是地址，通常是 `oc://` 路径，但字段名称描述的是它们的策略角色，
而不是地址格式。

JSON 发现结果示例：

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

工具发现结果示例：

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

MCP 发现结果示例：

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

模型提供商发现结果示例：

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

网络发现结果示例：

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

Gateway(网关) 暴露发现结果示例：

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

代理工作区发现结果示例：

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

只有当显式启用 `workspaceRepairs` 时，`doctor --fix` 才会编辑
策略管理的工作区设置。如果没有选择加入，策略检查会报告它们将要修复的内容，并保持设置不变。

在此版本中，repair 可以禁用在 OpenClaw 配置中启用但被 `channels.denyRules` 拒绝的渠道。仅在审查策略文件后启用 `workspaceRepairs`，因为有效的拒绝规则可以关闭已配置的渠道：

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

| 命令           | `0`                            | `1`                            | `2`                |
| -------------- | ------------------------------ | ------------------------------ | ------------------ |
| `policy check` | 未达到阈值的发现。             | 一个或多个发现达到阈值。       | 参数或运行时故障。 |
| `policy watch` | 无发现且已接受的哈希是最新的。 | 发现存在或已接受的证明已过期。 | 参数或运行时故障。 |

## 相关

- [Doctor lint 模式](/zh/cli/doctor#lint-mode)
- [Path CLI](/zh/cli/path)
