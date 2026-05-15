---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets management"
sidebarTitle: "Secrets management"
---

OpenClaw 支持累加式 SecretRef，因此支持的凭证无需以明文形式存储在配置中。

<Note>Plaintext still works. SecretRefs are opt-in per credential.</Note>

## 目标和运行时模型

密钥被解析为内存中的运行时快照。

- 解析在激活期间是急切的，而不是在请求路径上惰性进行。
- 当有效的活跃 SecretRef 无法解析时，启动快速失败。
- 重新加载使用原子交换：要么完全成功，要么保留最后一次已知良好的快照。
- SecretRef 策略违规（例如结合了 SecretRef 输入的 OAuth 模式身份验证配置文件）将在运行时交换之前导致激活失败。
- 运行时请求仅从活动的内存快照中读取。
- 在首次成功激活/加载配置后，运行时代码路径将继续读取该活动的内存快照，直到成功的重新加载将其交换。
- 出站交付路径也从该活动快照读取（例如 Discord 回复/线程交付和 Telegram 操作发送）；它们不会在每次发送时重新解析 SecretRef。

这确保了 secret 提供商的中断不会影响热请求路径。

## 活动面过滤

SecretRef 仅在有效的活动面上进行验证。

- 启用的面：未解析的引用会阻止启动/重新加载。
- 未启用的面：未解析的引用不会阻止启动/重新加载。
- Inactive refs emit non-fatal diagnostics with code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

<AccordionGroup>
  <Accordion title="非活动界面示例">
    - 已禁用的渠道/账户条目。
    - 没有已启用账户继承的顶级渠道凭据。
    - 已禁用的工具/功能界面。
    - 未被 `tools.web.search.provider` 选中的 Web 搜索提供商特定密钥。在自动模式（未设置提供商）下，系统会按优先级顺序查询密钥以进行提供商自动检测，直到解析成功。选择后，未选中的提供商密钥将被视为非活动状态，直到被选中。
    - 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData` 以及每个代理的覆盖项）仅当默认代理或已启用代理的有效沙箱后端为 `ssh` 时才处于活动状态。
    - 如果满足以下任一条件，`gateway.remote.token` / `gateway.remote.password` SecretRefs 处于活动状态：
      - `gateway.mode=remote`
      - 已配置 `gateway.remote.url`
      - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
      - 在没有这些远程界面的本地模式下：
        - 当令牌认证可以生效且未配置环境变量/认证令牌时，`gateway.remote.token` 处于活动状态。
        - 仅当密码认证可以生效且未配置环境变量/认证密码时，`gateway.remote.password` 处于活动状态。
    - 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 对启动认证解析处于非活动状态，因为对于该运行时，环境令牌输入优先。

  </Accordion>
</AccordionGroup>

## Gateway(网关) auth surface diagnostics

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置了 SecretRef 时，网关启动/重载会显式记录表面状态：

- `active`：SecretRef 是有效认证表面的一部分，必须进行解析。
- `inactive`：在此运行时 SecretRef 被忽略，因为另一个认证表面生效，或者因为远程认证被禁用/未激活。

这些条目使用 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活动表面策略使用的原因，因此您可以了解凭据被视为活动或非活动的原因。

## 新手引导引用预检查

当新手引导在交互模式下运行且您选择 SecretRef 存储时，OpenClaw 会在保存之前运行预检查验证：

- 环境变量引用：验证环境变量名称，并确认在设置期间可见非空值。
- 提供商引用（`file` 或 `exec`）：验证提供商选择，解析 `id`，并检查解析后的值类型。
- 快速入门重用路径：当 `gateway.auth.token` 已经是 SecretRef 时，新手引导会在探针/仪表板引导之前使用相同的快速失败（fail-fast）门来解析它（用于 `env`、`file` 和 `exec` 引用）。

如果验证失败，新手引导会显示错误并允许您重试。

## SecretRef 契约

在各处使用单一对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须是绝对 JSON 指针 (`/...`)
    - 片段中的 RFC6901 转义： `~` => `~0`， `/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` 不得包含 `.` 或 `..` 作为以斜杠分隔的路径片段（例如 `a/../b` 会被拒绝）

  </Tab>
</Tabs>

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

<AccordionGroup>
  <Accordion title="Env 提供商">
    - 通过 `allowlist` 进行可选的允许列表配置。
    - 缺失/为空的环境变量值将导致解析失败。

  </Accordion>
  <Accordion title="文件提供商">
    - 从 `path` 读取本地文件。
    - `mode: "json"` 期望 JSON 对象负载并将 `id` 解析为指针。
    - `mode: "singleValue"` 期望引用 ID `"value"` 并返回文件内容。
    - 路径必须通过所有权/权限检查。
    - Windows 失败关闭说明：如果路径的 ACL 验证不可用，解析将失败。仅限受信任路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

  </Accordion>
  <Accordion title="Exec 提供商">
    - 运行配置的绝对二进制路径，无 shell。
    - 默认情况下，`command` 必须指向常规文件（而非符号链接）。
    - 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 验证解析后的目标路径。
    - 将 `allowSymlinkCommand` 与 `trustedDirs` 配对用于包管理器路径（例如 `["/opt/homebrew"]`）。
    - 支持超时、无输出超时、输出字节限制、环境变量允许列表和受信任目录。
    - Windows 失败关闭说明：如果命令路径无法进行 ACL 验证，解析将失败。仅对于受信任的路径，请在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

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

  </Accordion>
</AccordionGroup>

## Exec 集成示例

<AccordionGroup>
  <Accordion title="1Password CLI">
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
  </Accordion>
  <Accordion title="HashiCorp Vault CLI">
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
  </Accordion>
  <Accordion title="sops">
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
  </Accordion>
</AccordionGroup>

## MCP 服务器环境变量

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器环境变量支持 SecretInput。这可以防止 API 密钥和令牌以明文形式出现在配置中：

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

纯文本字符串值仍然有效。如 `${MCP_SERVER_API_KEY}` 的环境模板引用和 SecretRef 对象会在生成 MCP 服务器进程之前的网关激活期间解析。与其他 SecretRef 表面一样，当 `acpx` 插件处于有效活动状态时，未解析的引用才会阻止激活。

## 沙箱 SSH 认证材料

核心 `ssh` 沙箱后端也为 SSH 认证材料提供 SecretRef 支持：

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
- 解析出的值会写入具有严格权限的临时文件，并在生成的 SSH 配置中使用。
- 如果有效的沙箱后端不是 `ssh`，这些引用将保持非活动状态，且不会阻止启动。

## 支持的凭证范围

规范的支持和不支持的凭证列于：

- [SecretRef 凭证范围](/zh/reference/secretref-credential-surface)

<Note>运行时生成的或轮换的凭证以及 OAuth 刷新材料被有意排除在只读 SecretRef 解析之外。</Note>

## 必需的行为和优先级

- 没有引用的字段：保持不变。
- 带有引用的字段：在激活期间，对于活动范围是必需的。
- 如果同时存在明文和引用，引用在支持的优先级路径上优先。
- 编辑哨兵 `__OPENCLAW_REDACTED__` 保留用于内部配置编辑/还原，并会被拒绝作为字面提交的配置数据。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` （运行时警告）
- `REF_SHADOWED` （当 `auth-profiles.json` 凭证优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当设置了同级引用时，明文值将被忽略。

## 激活触发器

密钥激活运行于：

- 启动（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- Gateway(网关) 配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），用于在持久化编辑之前检查提交的配置负载中活动范围 SecretRef 的可解析性

激活约定：

- 成功会原子性地交换快照。
- 启动失败会中止网关启动。
- 运行时重新加载失败会保留最后已知良好的快照。
- 写入-RPC 预检失败会拒绝提交的配置，并保持磁盘配置和活动运行时快照均不变。
- 为出站 helper/工具 调用提供显式的每次调用渠道令牌不会触发 SecretRef 激活；激活点仍为启动、重新加载和显式 `secrets.reload`。

## 降级和恢复信号

当在健康状态后重新加载时激活失败，OpenClaw 将进入降级 secrets 状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后已知良好的快照。
- 恢复：在下次成功激活后发出一次。
- 在已处于降级状态时重复失败会记录警告，但不会发送垃圾事件。
- 启动快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择加入支持的 SecretRef 解析。

主要有两种广泛的行为：

<Tabs>
  <Tab title="Strict command paths">
    例如 `openclaw memory` remote-memory 路径，以及当它需要远程共享 secret 引用时的 `openclaw qr --remote`。它们从活动快照中读取，并在所需的 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="Read-only command paths">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 以及只读的 doctor/config 修复流程。它们也首选活动快照，但在该命令路径中所需的 SecretRef 不可用时会降级而不是中止。

    只读行为：

    - 当网关正在运行时，这些命令首先从活动快照读取。
    - 如果网关解析不完整或网关不可用，它们将尝试针对特定命令表面的本地回退。
    - 如果所需的 SecretRef 仍不可用，该命令将继续以降级的只读输出和显式诊断（例如“已配置但在此命令路径中不可用”）运行。
    - 这种降级行为仅限于命令本地。它不会削弱运行时启动、重新加载或发送/身份验证路径。

  </Tab>
</Tabs>

其他说明：

- 后端密钥轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway RPC 方法：`secrets.resolve`。

## 审计和配置工作流

默认操作员流程：

<Steps>
  <Step title="审计当前状态">```bash openclaw secrets audit --check ```</Step>
  <Step title="配置 SecretRefs">```bash openclaw secrets configure ```</Step>
  <Step title="重新审计">```bash openclaw secrets audit --check ```</Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    发现结果包括：

    - 静态明文值 (`openclaw.json`, `auth-profiles.json`, `.env`, 以及生成的 `agents/*/agent/models.json`)
    - 生成的 `models.json` 条目中的明文敏感提供商 标头残留
    - 未解析的引用
    - 优先级遮蔽 (`auth-profiles.json` 优先于 `openclaw.json` 引用)
    - 遗留残留 (`auth.json`, OAuth 提醒)

    Exec 说明：

    - 默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec 提供商。

    标头残留说明：

    - 敏感提供商 标头检测基于名称启发式（常见的身份验证/凭据标头名称和片段，例如 `authorization`, `x-api-key`, `token`, `secret`, `password`, 和 `credential`）。

  </Accordion>
  <Accordion title="secrets configure">
    交互式助手，其功能如下：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
    - 允许您为单个代理范围选择 `openclaw.json` 中支持的承载机密的字段以及 `auth-profiles.json`
    - 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
    - 捕获 SecretRef 详情（`source`、`provider`、`id`）
    - 运行预检解析
    - 可以立即应用

    Exec 说明：

    - 预检会跳过 exec SecretRef 检查，除非设置了 `--allow-exec`。
    - 如果您直接从 `configure --apply` 应用，并且计划包含 exec 引用/提供者，请在应用步骤中也保持 `--allow-exec` 设置。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 应用默认设置：

    - 从 `auth-profiles.json` 中清除针对提供者的匹配静态凭据
    - 从 `auth.json` 中清除旧的静态 `api_key` 条目
    - 从 `<config-dir>/.env` 中清除匹配的已知机密行

  </Accordion>
  <Accordion title="secrets apply">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Exec 说明：

    - dry-run 跳过 exec 检查，除非设置了 `--allow-exec`。
    - 写入模式拒绝包含 exec SecretRefs/提供者的计划，除非设置了 `--allow-exec`。

    有关严格的目标/路径契约详情和确切的拒绝规则，请参阅 [Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 单向安全策略

<Warning>OpenClaw 故意不写入包含历史纯文本机密值的回滚备份。</Warning>

安全模型：

- 在写入模式之前预检必须成功
- 在提交之前验证运行时激活
- 应用更新文件时使用原子文件替换，并在失败时尽力恢复

## 旧版身份验证兼容性说明

对于静态凭据，运行时不再依赖纯文本旧版身份验证存储。

- 运行时凭据来源是解析后的内存快照。
- 发现旧的静态 `api_key` 条目时会将其清除。
- 与 OAuth 相关的兼容性行为保持独立。

## Web UI 说明

与在表单模式下相比，某些 SecretInput 联合类型在原始编辑器模式下更容易配置。

## 相关

- [身份验证](/zh/gateway/authentication) — 身份验证设置
- [CLI：secrets](/zh/cli/secrets) — CLI 命令
- [环境变量](/zh/help/environment) — 环境优先级
- [SecretRef 凭据范围](/zh/reference/secretref-credential-surface) — 凭据范围
- [Secrets 应用计划契约](/zh/gateway/secrets-plan-contract) — 计划契约详细信息
- [安全](/zh/gateway/security) — 安全态势
