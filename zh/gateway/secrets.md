---
summary: "机密管理：SecretRef 契约、运行时快照行为以及安全的单向清理"
read_when:
  - 为提供商凭据和 `auth-profiles.json` 引用配置 SecretRefs
  - 在生产环境中安全地操作机密重新加载、审计、配置和应用
  - 了解启动快速失败、非活动表面过滤以及最后已知良好行为
title: "机密管理"
---

# 机密管理

OpenClaw 支持累加式 SecretRefs，因此支持的凭据无需以明文形式存储在配置中。

明文仍然有效。SecretRefs 针对每个凭据是可选加入的。

## 目标和运行时模型

机密会被解析为内存中的运行时快照。

- 解析在激活期间是急切的，而不是在请求路径上惰性进行。
- 当有效的活跃 SecretRef 无法解析时，启动会快速失败。
- 重新加载使用原子交换：要么完全成功，要么保留最后已知的良好快照。
- 运行时请求仅从活动的内存快照中读取。
- 出站传递路径也从该活动快照中读取（例如 Discord 回复/线程传递和 Telegram 操作发送）；它们不会在每次发送时重新解析 SecretRefs。

这使得机密提供商的中断不会影响热请求路径。

## 活动表面过滤

SecretRefs 仅在有效的活动表面上进行验证。

- 启用的表面：未解析的引用会阻止启动/重新加载。
- 非活动的表面：未解析的引用不会阻止启动/重新加载。
- 非活动的引用会发出代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命诊断。

非活动表面的示例：

- 已禁用的渠道/账户条目。
- 没有已启用账户继承的顶级渠道凭据。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的网络搜索提供商特定密钥。
  在自动模式（未设置提供商）下，系统会按优先级查询密钥以进行提供商自动检测，直到解析出一个为止。
  选中后，未选中的提供商密钥将被视为非活动状态，直到被选中为止。
- 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`，
  `certificateData`，`knownHostsData`，加上每个代理的覆盖配置）仅在默认代理或已启用代理的有效沙箱后端为 `ssh` 时才处于活动状态。
- 如果满足以下任一条件，则 `gateway.remote.token` / `gateway.remote.password` SecretRefs 处于活跃状态：
  - `gateway.mode=remote`
  - 已配置 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在未包含这些远程表面的本地模式下：
    - 当令牌认证可生效且未配置环境变量/认证令牌时，`gateway.remote.token` 处于活跃状态。
    - 仅当密码认证可生效且未配置环境变量/认证密码时，`gateway.remote.password` 处于活跃状态。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `CLAWDBOT_GATEWAY_TOKEN`）时，`gateway.auth.token` SecretRef 对于启动认证解析处于非活跃状态，因为在该运行时环境变量令牌输入优先。

## Gateway(网关) 认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上配置了 SecretRef 时，网关启动/重新加载会明确记录
表面状态：

- `active`：SecretRef 是有效认证表面的一部分，必须进行解析。
- `inactive`：对于此运行时，SecretRef 被忽略，因为另一个认证表面优先，
  或者因为远程认证已禁用/未激活。

这些条目使用 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活跃表面策略使用的原因，因此您可以查看凭据被视为活跃或非活跃的原因。

## 新手引导参考预检

当新手引导以交互模式运行并且您选择 SecretRef 存储时，OpenClaw 会在保存之前运行预检验证：

- 环境变量引用：验证环境变量名称并确认在设置期间可见非空值。
- 提供商引用（`file` 或 `exec`）：验证提供商选择，解析 `id`，并检查解析值的类型。
- 快速入门重用路径：当 `gateway.auth.token` 已经是 SecretRef 时，新手引导会在探测/仪表板引导之前（针对 `env`、`file` 和 `exec` 引用）使用相同的快速失败门对其进行解析。

如果验证失败，新手引导会显示错误并允许您重试。

## SecretRef 合约

在任何地方使用一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

验证：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

验证：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须是绝对 JSON 指针（`/...`）
- 段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

验证：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作为以斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

## 提供商配置

在 `secrets.providers` 下定义提供商：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### Env 提供商

- 通过 `allowlist` 进行可选的允许列表。
- 缺失/空的环境值会导致解析失败。

### 文件提供商

- 从 `path` 读取本地文件。
- `mode: "json"` 期望 JSON 对象负载并将 `id` 解析为指针。
- `mode: "singleValue"` 期望引用 ID `"value"` 并返回文件内容。
- 路径必须通过所有权/权限检查。
- Windows 失败关闭说明：如果路径无法进行 ACL 验证，解析将失败。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

### Exec 提供商

- 运行配置的绝对二进制路径，不使用 shell。
- 默认情况下，`command` 必须指向常规文件（而非符号链接）。
- 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 验证解析后的目标路径。
- 结合使用 `allowSymlinkCommand` 和 `trustedDirs` 以获取包管理器路径（例如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、环境变量允许列表和受信任目录。
- Windows 失败关闭说明：如果命令路径的 ACL 验证不可用，解析将失败。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

请求负载（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应负载（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

可选的每个 ID 错误：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Exec 集成示例

### 1Password CLI

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### HashiCorp Vault CLI

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## 沙箱 SSH 认证资料

核心 `ssh` 沙箱后端也支持 SSH 认证资料的 SecretRefs：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

运行时行为：

- OpenClaw 在沙箱激活期间解析这些引用，而不是在每次 SSH 调用期间惰性解析。
- 解析出的值将以限制性权限写入临时文件，并用于生成的 SSH 配置中。
- 如果有效的沙箱后端不是 `ssh`，这些引用将保持非活动状态，并且不会阻止启动。

## 支持的凭据表面

规范的支持和不支持的凭据列于：

- [SecretRef 凭据表面](/zh/reference/secretref-credential-surface)

运行时创建或轮换的凭据以及 OAuth 刷新材料有意排除在只读 SecretRef 解析之外。

## 所需行为和优先级

- 没有引用的字段：保持不变。
- 带有引用的字段：在激活期间的活动表面上为必需项。
- 如果同时存在明文和引用，则在支持的优先级路径上引用优先。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 凭据优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当设置了同级引用时，将忽略明文值。

## 激活触发器

秘密激活在以下情况运行：

- 启动（预检加上最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载

激活契约：

- 成功会原子性地交换快照。
- 启动失败会中止网关启动。
- 运行时重新加载失败会保留上次已知的良好快照。
- 为出站辅助程序/工具调用提供显式的单次调用渠道令牌不会触发 SecretRef 激活；激活点仍为启动、重新加载和显式 `secrets.reload`。

## 降级和恢复信号

当在健康状态后重新加载时激活失败，OpenClaw 会进入降级机密状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留上次已知的良好快照。
- 已恢复：在下次成功激活后发出一次。
- 已经处于降级状态时的重复失败会记录警告，但不会刷屏发送事件。
- 启动快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以选择通过网关快照 RPC 支持的 SecretRef 解析。

有两种广泛的行为：

- 严格命令路径（例如 `openclaw memory` 远程内存路径和 `openclaw qr --remote`）从活动快照读取，并在所需的 SecretRef 不可用时快速失败。
- 只读命令路径（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和只读 doctor/config 修复流程）也更倾向于活动快照，但在该命令路径中目标 SecretRef 不可用时降级而不是中止。

只读行为：

- 当网关正在运行时，这些命令首先从活动快照读取。
- 如果网关解析不完整或网关不可用，它们会尝试针对特定命令表面的目标本地回退。
- 如果目标 SecretRef 仍然不可用，命令将继续使用降级的只读输出和显式诊断信息，例如“已配置但在此命令路径中不可用”。
- 这种降级行为仅限于命令本地。它不会削弱运行时启动、重新加载或发送/身份验证路径。

其他说明：

- 后端密钥轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway RPC 方法：`secrets.resolve`。

## 审核和配置工作流

默认操作员流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

结果包括：

- 静态明文值（`openclaw.json`、`auth-profiles.json`、`.env` 以及生成的 `agents/*/agent/models.json`）
- 生成的 `models.json` 条目中残留的明文敏感提供商标头
- 未解析的引用
- 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
- 遗留残留（`auth.json`、OAuth 提醒）

执行注意事项：

- 默认情况下，审核会跳过对 exec SecretRef 可解析性的检查，以避免命令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在审核期间执行 exec 提供商。

标头残留注意事项：

- 敏感提供商标头检测基于名称启发式（常见的身份验证/凭据标头名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

交互式帮助工具，用于：

- 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
- 允许您在 `openclaw.json` 以及 `auth-profiles.json` 中为一个代理范围选择支持的秘密承载字段
- 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详细信息（`source`、`provider`、`id`）
- 运行预检解析
- 可以立即应用

执行注意事项：

- 除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。
- 如果您直接从 `configure --apply` 应用，并且计划包含 exec 引用/提供商，请在应用步骤中也保持 `--allow-exec` 设置。

有用的模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 应用默认值：

- 从 `auth-profiles.json` 中清除匹配的静态凭据，用于目标提供者
- 从 `auth.json` 中清除旧的静态 `api_key` 条目
- 从 `<config-dir>/.env` 中清除匹配的已知密钥行

### `secrets apply`

应用已保存的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

执行说明：

- 除非设置了 `--allow-exec`，否则试运行会跳过执行检查。
- 写入模式会拒绝包含 exec SecretRefs/提供者的计划，除非设置了 `--allow-exec`。

有关严格的目标/路径契约详情和确切的拒绝规则，请参阅：

- [密钥应用计划契约](/zh/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 故意不写入包含历史明文密钥值的回滚备份。

安全模型：

- 写入模式前必须通过预检
- 在提交前验证运行时激活
- apply 使用原子文件替换来更新文件，并在失败时尽力恢复

## 旧版身份验证兼容性说明

对于静态凭据，运行时不再依赖明文旧版身份验证存储。

- 运行时凭据源是已解析的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清除。
- 与 OAuth 相关的兼容性行为保持独立。

## Web UI 说明

在原始编辑器模式下配置某些 SecretInput 联合类型比在表单模式下更容易。

## 相关文档

- CLI 命令：[secrets](/zh/cli/secrets)
- 计划契约详情：[密钥应用计划契约](/zh/gateway/secrets-plan-contract)
- 凭据表面：[SecretRef 凭据表面](/zh/reference/secretref-credential-surface)
- 身份验证设置：[身份验证](/zh/gateway/authentication)
- 安全态势：[安全](/zh/gateway/security)
- 环境优先级：[环境变量](/zh/help/environment)

import zh from "/components/footer/zh.mdx";

<zh />
