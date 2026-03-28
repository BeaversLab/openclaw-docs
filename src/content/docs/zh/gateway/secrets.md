---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# 密钥管理

OpenClaw 支持累加式 SecretRef，因此支持的凭证无需以明文形式存储在配置中。

明文仍然有效。SecretRef 对每个凭证是可选启用的。

## 目标和运行时模型

密钥被解析为内存中的运行时快照。

- 解析在激活期间是急切的，而不是在请求路径上惰性进行。
- 当有效的活跃 SecretRef 无法解析时，启动快速失败。
- 重新加载使用原子交换：要么完全成功，要么保留最后一次已知良好的快照。
- 运行时请求仅从活跃的内存快照中读取。
- 出站传递路径也从该活跃快照读取（例如 Discord 回复/线程传递和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRef。

这使密钥提供程序的中断远离热请求路径。

## 活跃表面过滤

SecretRef 仅在有效活跃的表面上进行验证。

- 已启用的表面：未解析的引用会阻止启动/重新加载。
- 未启用的表面：未解析的引用不会阻止启动/重新加载。
- Inactive refs emit non-fatal diagnostics with code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

未启用表面的示例：

- 已禁用的频道/账户条目。
- 没有任何已启用账户继承的顶级频道凭证。
- 已禁用的工具/功能表面。
- Web search 提供商-specific keys that are not selected by `tools.web.search.provider`.
  In auto mode (提供商 unset), keys are consulted by precedence for 提供商 auto-detection until one resolves.
  After selection, non-selected 提供商 keys are treated as inactive until selected.
- 沙箱 SSH auth material (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus per-agent overrides) is active only
  when the effective sandbox backend is `ssh` for the default agent or an enabled agent.
- `gateway.remote.token` / `gateway.remote.password` SecretRefs are active if one of these is true:
  - `gateway.mode=remote`
  - `gateway.remote.url` is configured
  - `gateway.tailscale.mode` is `serve` or `funnel`
  - In local mode without those remote surfaces:
    - `gateway.remote.token` is active when token auth can win and no env/auth token is configured.
    - `gateway.remote.password` is active only when password auth can win and no env/auth password is configured.
- 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 对启动身份解析处于非活动状态，因为在该运行时中环境令牌输入优先。

## Gateway auth surface diagnostics

当在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，网关启动/重新加载会显式记录
表面状态：

- `active`：SecretRef 是有效身份表面的一部分，必须进行解析。
- `inactive`：在此运行时中忽略 SecretRef，因为另一个身份表面优先，或者
  因为远程身份已禁用/未处于活动状态。

这些条目使用 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活动表面策略使用的原因，因此您可以查看凭证为何被视为活动或非活动。

## 新手引导参考预检

当新手引导以交互模式运行并且您选择 SecretRef 存储时，OpenClaw 会在保存之前运行预检验证：

- Env refs：验证环境变量名称并确认在设置期间可见非空值。
- 提供商引用（`file` 或 `exec`）：验证提供商选择，解析 `id`，并检查解析的值类型。
- 快速启动重用路径：当 `gateway.auth.token` 已经是 SecretRef 时，新手引导会在探针/仪表板引导之前（针对 `env`、`file` 和 `exec` 引用）使用相同的快速失败门对其进行解析。

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

- 通过 `allowlist` 进行可选的允许列表配置。
- 缺失或为空的环境变量值将导致解析失败。

### 文件提供商

- 从 `path` 读取本地文件。
- `mode: "json"` 期望 JSON 对象负载并将 `id` 解析为指针。
- `mode: "singleValue"` 期望 ref id `"value"` 并返回文件内容。
- 路径必须通过所有权/权限检查。
- Windows 失败关闭（fail-closed）说明：如果某个路径的 ACL 验证不可用，解析将失败。仅限受信任路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

### Exec 提供商

- 运行配置的绝对二进制路径，不使用 shell。
- 默认情况下，`command` 必须指向常规文件（而非符号链接）。
- 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 会验证解析后的目标路径。
- 将 `allowSymlinkCommand` 与 `trustedDirs` 配对使用，用于包管理器路径（例如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、环境变量白名单和受信任目录。
- Windows 失败关闭（fail-closed）说明：如果命令路径的 ACL 验证不可用，解析将失败。仅限受信任路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

请求负载（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应负载（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

可选的按 ID 错误：

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

## 沙箱 SSH 认证材料

核心 `ssh` 沙盒后端还支持用于 SSH 认证材料的 SecretRefs：

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

- OpenClaw 在沙箱激活期间解析这些引用，而不是在每次 SSH 调用期间延迟解析。
- 解析后的值将写入具有限制性权限的临时文件，并在生成的 SSH 配置中使用。
- 如果有效的沙盒后端不是 `ssh`，这些引用将保持非活动状态且不会阻塞启动。

## 支持的凭证面

规范的支持和不支持的凭证列于：

- [SecretRef 凭证 Surface](/zh/reference/secretref-credential-surface)

运行时创建或轮换的凭据和 OAuth 刷新材料被有意排除在只读 SecretRef 解析之外。

## 所需行为和优先级

- 没有 ref 的字段：保持不变。
- 带有 ref 的字段：在激活期间在活动表面上为必需项。
- 如果同时存在明文和 ref，则 ref 在支持的优先级路径上优先。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 凭证优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于纯文本 `serviceAccount`。
- 当设置了同级 ref 时，明文值将被忽略。

## 激活触发器

Secret 激活在以下情况下运行：

- 启动（预检加上最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载

激活契约：

- 成功会原子地交换快照。
- 启动失败会中止网关启动。
- 运行时重新加载失败将保留最后一个已知良好的快照。
- 为出站 helper/工具 调用提供明确的每次调用渠道 token 不会触发 SecretRef 激活；激活点仍为启动、重新加载和显式 `secrets.reload`。

## 降级和恢复信号

当在健康状态后重新加载时激活失败，OpenClaw 将进入降级 secrets 状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后一个已知良好的快照。
- 恢复：在下次成功激活后发送一次。
- 在已经降级时重复失败会记录警告，但不会垃圾邮件式地发送事件。
- 启动快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择加入支持的 SecretRef 解析。

有两种广泛的行为：

- 严格命令路径（例如 `openclaw memory` 远程内存路径和 `openclaw qr --remote`）从活动快照读取，并在所需的 SecretRef 不可用时快速失败。
- 只读命令路径（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 以及只读 doctor/config 修复流程）也优先使用活动快照，但在该命令路径中目标 SecretRef 不可用时会降级而不是中止。

只读行为：

- 当 Gateway 运行时，这些命令首先从活动快照中读取。
- 如果 Gateway 解析不完整或 Gateway 不可用，它们将尝试针对特定命令表面的目标本地回退。
- 如果目标 SecretRef 仍然不可用，该命令将继续运行并输出降级的只读结果以及明确的诊断信息，例如“已配置但在此命令路径中不可用”。
- 这种降级行为仅限于命令本地。它不会削弱运行时启动、重载或发送/认证路径。

其他说明：

- 后端 secret 轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway(网关) RPC 方法：`secrets.resolve`。

## 审计和配置工作流

默认操作员流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

发现项包括：

- 静态纯文本值（`openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `agents/*/agent/models.json`）
- 生成的 `models.json` 条目中的静态敏感提供商 header 残留
- 未解析的引用
- 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` refs）
- 遗留残留（`auth.json`、OAuth 提醒）

Exec 注释：

- 默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。
- 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec providers。

Header 残留注释：

- 敏感提供商 header 检测基于名称启发式方法（常见的 auth/credential header 名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

交互式助手，用于：

- 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
- 允许您在 `openclaw.json` 以及 `auth-profiles.json` 中为一个代理范围选择支持的秘密承载字段
- 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详细信息（`source`、`provider`、`id`）
- 运行预检解析
- 可以立即应用

Exec 注释：

- 除非设置了 `--allow-exec`，否则预检将跳过 exec SecretRef 检查。
- 如果您直接从 `configure --apply` 应用，并且计划包含 exec 引用/提供程序，请在应用步骤中也保持 `--allow-exec` 的设置。

有用的模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 应用默认值：

- 从 `auth-profiles.json` 中清除目标提供程序的匹配静态凭据
- 从 `auth.json` 中清除旧的静态 `api_key` 条目
- 从 `<config-dir>/.env` 中清除匹配的已知秘密行

### `secrets apply`

应用保存的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Exec 注释：

- 除非设置了 `--allow-exec`，否则 dry-run 会跳过 exec 检查。
- 写入模式会拒绝包含 exec SecretRefs/提供程序的计划，除非设置了 `--allow-exec`。

有关严格的目标/路径契约详细信息和确切的拒绝规则，请参阅：

- [Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 故意不写入包含历史明文机密值的回滚备份。

安全模型：

- 预检查必须在写入模式之前成功
- 运行时激活在提交前经过验证
- apply 使用原子文件替换更新文件，并在失败时尽力恢复

## 旧版身份验证兼容性说明

对于静态凭证，运行时不再依赖明文旧版身份验证存储。

- 运行时凭证源是已解析的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清除。
- OAuth 相关的兼容性行为保持独立。

## Web UI 说明

某些 SecretInput 联合在原始编辑器模式下比在表单模式下更容易配置。

## 相关文档

- CLI 命令：[secrets](/zh/cli/secrets)
- 计划合同详细信息：[Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)
- 凭据范围：[SecretRef Credential Surface](/zh/reference/secretref-credential-surface)
- 身份验证设置：[Authentication](/zh/gateway/authentication)
- 安全态势：[Security](/zh/gateway/security)
- 环境优先级：[Environment Variables](/zh/help/environment)
