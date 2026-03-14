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
- 非活动引用会发出带有代码 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命诊断信息。

未启用表面的示例：

- 已禁用的频道/账户条目。
- 没有任何已启用账户继承的顶级频道凭证。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供商特定密钥。
  在自动模式下（未设置提供程序），系统会按优先级查询密钥以进行提供程序自动检测，直到其中一个解析成功。
  选择后，未选中的提供程序密钥将被视为未启用状态，直到被选中。
- 如果满足以下任一条件，则 `gateway.remote.token` / `gateway.remote.password` SecretRef 为活动状态：
  - `gateway.mode=remote`
  - 配置了 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在没有这些远程表面的本地模式下：
    - 当令牌认证可以获胜且未配置 env/auth 令牌时，`gateway.remote.token` 处于活动状态。
    - 仅当密码认证可以获胜且未配置 env/auth 密码时，`gateway.remote.password` 处于活动状态。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `CLAWDBOT_GATEWAY_TOKEN`）时，`gateway.auth.token` SecretRef 对于启动身份验证解析处于非活动状态，因为环境令牌输入在该运行时中获胜。

## Gateway 网关 身份验证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，网关启动/重新加载会显式记录
表面状态：

- `active`：SecretRef 是有效身份验证表面的一部分，必须进行解析。
- `inactive`：SecretRef 在此运行时中被忽略，因为另一个身份验证表面获胜，或者
  因为远程身份验证已禁用/未激活。

这些条目使用 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活动表面策略使用的原因，因此您可以查看凭证被视为活动或非活动的原因。

## 载入参考预检

当载入以交互模式运行并且您选择 SecretRef 存储时，OpenClaw 会在保存之前运行预检验证：

- 环境变量引用：验证环境变量名称，并确认在载入期间可以看到非空值。
- Provider 引用（`file` 或 `exec`）：验证提供商选择，解析 `id`，并检查解析的值类型。
- 快速入门复用路径：当 `gateway.auth.token` 已经是 SecretRef 时，在探针/仪表板引导之前（针对 `env`、`file` 和 `exec` 引用），入驻（新手引导）会使用相同的快速失败（fail-fast）门对其进行解析。

如果验证失败，载入会显示错误并允许您重试。

## SecretRef 契约

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
- 分段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

验证：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不得包含 `.` 或 `..` 作为以斜杠分隔的路径分段（例如，`a/../b` 会被拒绝）

## 提供程序配置

在 `secrets.providers` 下定义提供者（providers）：

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

### Env 提供程序

- 通过 `allowlist` 进行可选的允许列表（allowlist）设置。
- 缺失/为空的环境值会导致解析失败。

### 文件提供程序

- 从 `path` 读取本地文件。
- `mode: "json"` 期望 JSON 对象有效载荷并将 `id` 解析为指针。
- `mode: "singleValue"` 期望引用 ID `"value"` 并返回文件内容。
- 路径必须通过所有权/权限检查。
- Windows 失败关闭（fail-closed）说明：如果某个路径的 ACL 验证不可用，解析将失败。仅对于受信任的路径，可以在该提供者上设置 `allowInsecurePath: true` 以绕过路径安全检查。

### Exec 提供程序

- 运行配置的绝对二进制路径，不使用 shell。
- 默认情况下，`command` 必须指向常规文件（而非符号链接）。
- 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 会验证解析后的目标路径。
- 将 `allowSymlinkCommand` 与 `trustedDirs` 配对用于包管理器路径（例如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、环境变量允许列表和受信任目录。
- Windows 失败关闭说明：如果命令路径的 ACL 验证不可用，解析将失败。仅对于受信任的路径，在该提供程序上设置 `allowInsecurePath: true` 以绕过路径安全检查。

请求有效载荷 (stdin)：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应有效载荷 (stdout)：

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

## 支持的凭据范围

标准支持和不受支持的凭据列于：

- [SecretRef 凭据范围](/zh/en/reference/secretref-credential-surface)

运行时创建或轮换的凭据以及 OAuth 刷新材料被有意排除在只读 SecretRef 解析之外。

## 所需行为和优先级

- 不带引用的字段：保持不变。
- 带引用的字段：在激活期间，在活动范围内是必需的。
- 如果同时存在明文和引用，则在支持的优先级路径上引用优先。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 凭据优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当设置了同级引用时，将忽略明文值。

## 激活触发器

机密激活运行于：

- 启动（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载

激活协议：

- 成功会原子性地交换快照。
- 启动失败会中止网关启动。
- 运行时重新加载失败将保留上次已知良好的快照。
- 为出站辅助/工具调用提供显式的逐次调用通道令牌不会触发 SecretRef 激活；激活点仍然是启动、重新加载和显式的 `secrets.reload`。

## 降级和恢复信号

当在健康状态后重新加载时的激活失败，OpenClaw 会进入机密降级状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留上次已知良好的快照。
- 恢复：在下次成功激活后发出一次。
- 在已经降级时的重复失败会记录警告，但不会滥发事件。
- 启动快速失败（fail-fast）不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择加入受支持的 SecretRef 解析。

主要有两种广泛的行为：

- 严格的命令路径（例如 `openclaw memory` 远程内存路径和 `openclaw qr --remote`）从活动快照读取，并在所需的 SecretRef 不可用时快速失败。
- 只读命令路径（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve` 和只读 doctor/config 修复流程）也优先使用活动快照，但当该命令路径中目标 SecretRef 不可用时会降级而不是中止。

只读行为：

- 当网关运行时，这些命令首先从活动快照读取。
- 如果网关解析不完整或网关不可用，它们会尝试针对特定命令表面的目标本地回退。
- 如果目标 SecretRef 仍然不可用，命令将继续以降级的只读输出和明确的诊断信息（例如“已配置但在该命令路径中不可用”）执行。
- 这种降级行为仅限于命令本地。它不会削弱运行时启动、重新加载或发送/认证路径。

其他注意事项：

- 后端密钥轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway 网关 RPC 方法：`secrets.resolve`。

## 审计和配置工作流

默认操作员流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

发现结果包括：

- 静态明文值（`openclaw.json`、`auth-profiles.json`、`.env` 以及生成的 `agents/*/agent/models.json`）
- 生成的 `models.json` 条目中明文形式的敏感提供程序头部残留
- 未解析的引用
- 优先级覆盖（`auth-profiles.json` 优先于 `openclaw.json` 引用）
- 旧版残留（`auth.json`、OAuth 提醒）

头残留说明：

- 敏感提供程序头部检测基于名称启发式（常见的身份验证/凭据头部名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

交互式辅助程序：

- 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
- 允许您在 `openclaw.json` 中为单个代理范围选择支持的秘密承载字段，以及 `auth-profiles.json`
- 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
- 捕获 SecretRef 详细信息（`source`、`provider`、`id`）
- 运行预检解析
- 可以立即应用

有用的模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 应用默认值：

- 从目标提供程序的 `auth-profiles.json` 中清除匹配的静态凭据
- 从 `auth.json` 中清除旧版静态 `api_key` 条目
- 从 `<config-dir>/.env` 中清除匹配的已知密钥行

### `secrets apply`

应用已保存的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
```

有关严格的目标/路径契约详情和确切的拒绝规则，请参阅：

- [Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 故意不写入包含历史明文密钥值的回滚备份。

安全模型：

- 进入写入模式前预检必须成功
- 运行时激活在提交前进行验证
- 应用更新使用原子文件替换，失败时尽力恢复

## 旧版身份验证兼容性说明

对于静态凭据，运行时不再依赖明文旧版身份验证存储。

- 运行时凭据来源是已解析的内存快照。
- 发现旧版静态 `api_key` 条目时会将其清除。
- OAuth 相关的兼容性行为保持独立。

## Web UI 说明

某些 SecretInput 联合在原始编辑器模式下比在表单模式下更容易配置。

## 相关文档

- CLI 命令：[secrets](/zh/cli/secrets)
- 计划契约详情：[Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)
- 凭据范围：[SecretRef Credential Surface](/zh/reference/secretref-credential-surface)
- 身份验证设置：[Authentication](/zh/en/gateway/authentication)
- 安全态势：[Security](/zh/en/gateway/security)
- 环境优先级：[Environment Variables](/zh/en/help/environment)

import zh from '/components/footer/zh.mdx';

<zh />
