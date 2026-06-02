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

<Warning>如果凭据以代理可以检查的文件形式存储，包括 `openclaw.json`、`auth-profiles.json`、`.env` 或 生成的 `agents/*/agent/models.json` 文件，则明文凭据仍然可被代理读取。仅当所有支持的凭据都已迁移且 `openclaw secrets audit --check` 报告没有明文机密残留时，SecretRefs 才会减小该本地影响范围。</Warning>

## 目标和运行时模型

机密会被解析到内存中的运行时快照中。

- 解析在激活期间是急切的，而不是在请求路径上惰性的。
- 当有效的活跃 SecretRef 无法解析时，启动会快速失败。
- 重新加载使用原子交换：要么完全成功，要么保留最后已知的良好快照。
- SecretRef 策略违规（例如，将 OAuth 模式身份验证配置文件与 SecretRef 输入结合使用）会在运行时交换之前导致激活失败。
- 运行时请求仅从活跃的内存快照中读取。
- 在首次成功激活/加载配置后，运行时代码路径会继续读取该活跃的内存快照，直到成功的重新加载将其交换为止。
- 出站传递路径也从该活跃快照读取（例如 Discord 回复/线程传递和 Telegram 操作发送）；它们不会在每次发送时重新解析 SecretRefs。

这确保了机密提供商的中断不会影响热请求路径。

## 代理访问边界

SecretRefs 保护凭据不被持久化到受支持的配置和生成的模型表面中，但它们不是进程隔离边界。如果
明文凭据仍保留在代理可以读取的磁盘路径中，代理可以使用文件或 Shell 工具检查该文件，从而绕过 API 级别的编辑。

对于代理可访问文件在范围内的生产部署，只有在满足以下所有条件时，才将 SecretRef 迁移视为完成：

- 支持的凭证使用 SecretRefs 而不是明文值
- 遗留的明文残留已从 `openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `models.json` 文件中清除
- `openclaw secrets audit --check` 在迁移后是干净的
- 任何剩余的不支持或轮换凭证都受操作系统隔离、容器隔离或外部凭证代理保护

这就是为什么审计/配置/应用工作流是一个安全迁移网关，而不仅仅是一个便利助手。

<Warning>SecretRefs 并不能使任意可读文件变得安全。备份、复制的配置、旧的生成的模型目录和不支持的凭证类必须被视为生产机密，直到它们被删除、移出代理信任边界或受到单独隔离层的保护。</Warning>

## Active-surface filtering

SecretRefs 仅在有效活动的表面上进行验证。

- 启用的表面：未解析的引用会阻止启动/重载。
- 未启用的表面：未解析的引用不会阻止启动/重载。
- 未启用的引用会发出代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 的非致命诊断信息。

<AccordionGroup>
  <Accordion title="不活跃面的示例">
    - 已禁用的渠道/帐户条目。
    - 没有任何已启用帐户继承的顶级渠道凭据。
    - 已禁用的工具/功能面。
    - 未被 `tools.web.search.provider` 选择的网络搜索提供商特定密钥。在自动模式（未设置提供商）下，系统会按优先级顺序查询密钥以进行提供商自动检测，直到解析成功。选择后，未选中的提供商密钥将被视为不活跃，直到被选中为止。
    - 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每个代理的覆盖配置）仅当默认代理或已启用代理的有效沙箱后端为 `ssh` 时才处于活跃状态。
    - 如果满足以下任一条件，则 `gateway.remote.token` / `gateway.remote.password` SecretRef 处于活跃状态：
      - `gateway.mode=remote`
      - 已配置 `gateway.remote.url`
      - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
      - 在没有这些远程面的本地模式下：
        - 当令牌认证可以获胜且未配置环境变量/认证令牌时，`gateway.remote.token` 处于活跃状态。
        - 仅当密码认证可以获胜且未配置环境变量/认证密码时，`gateway.remote.password` 处于活跃状态。
    - 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 在启动认证解析期间处于不活跃状态，因为对于该运行时，环境令牌输入优先。

  </Accordion>
</AccordionGroup>

## Gateway(网关) 认证面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，网关启动/重新加载会显式记录面状态：

- `active`：SecretRef 是有效认证面的一部分，必须进行解析。
- `inactive`：SecretRef 在此运行时被忽略，因为另一个认证面获胜，或者因为远程认证被禁用/未活跃。

这些条目使用 `SECRETS_GATEWAY_AUTH_SURFACE` 记录，并包含活动表面策略使用的原因，因此您可以了解为什么凭证被视为活动或非活动状态。

## 新手引导参考预检

当新手引导以交互模式运行并且您选择 SecretRef 存储时，OpenClaw 会在保存之前运行预检验证：

- 环境变量引用：验证环境变量名称，并确认在设置期间可见的值非空。
- 提供商引用（`file` 或 `exec`）：验证提供商选择，解析 `id`，并检查解析出的值类型。
- 快速入门重用路径：当 `gateway.auth.token` 已经是 SecretRef 时，新手引导会在探针/仪表板引导之前（针对 `env`、`file` 和 `exec` 引用）使用相同的快速失败门来解析它。

如果验证失败，新手引导会显示错误并允许您重试。

## SecretRef 约定

在任何地方使用相同的对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    支持的 SecretInput 字段也接受精确的字符串简写形式：

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
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
    - `id` 必须是绝对 JSON 指针（`/...`）
    - 段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    验证：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持例如 `secret#json_key` 等选择器）
    - `id` 不得包含 `.` 或 `..` 作为以斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

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
      "team-secrets": {
        source: "exec",
        pluginIntegration: {
          pluginId: "acme-secrets",
          integrationId: "secret-store",
        },
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
    - 通过 `allowlist` 进行可选允许列表配置。
    - 缺失/为空的环境变量值会导致解析失败。

  </Accordion>
  <Accordion title="File 提供商">
    - 从 `path` 读取本地文件。
    - `mode: "json"` 期望 JSON 对象有效载荷并将 `id` 解析为指针。
    - `mode: "singleValue"` 期望引用 ID `"value"` 并返回文件内容。
    - 路径必须通过所有权/权限检查。
    - Windows 失败关闭说明：如果某个路径的 ACL 验证不可用，解析将失败。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

  </Accordion>
  <Accordion title="Exec 提供商">
    - 运行配置的绝对二进制路径，不使用 shell。
    - 默认情况下，`command` 必须指向常规文件（而非符号链接）。
    - 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shims）。OpenClaw 会验证解析后的目标路径。
    - 将 `allowSymlinkCommand` 与 `trustedDirs` 配对使用，以处理包管理器路径（例如 `["/opt/homebrew"]`）。
    - 支持超时、无输出超时、输出字节限制、环境变量允许列表以及受信任目录。
    - Windows 失败关闭提示：如果命令路径无法进行 ACL 验证，解析将失败。仅对于受信任的路径，在该提供商上设置 `allowInsecurePath: true` 可绕过路径安全检查。
    - 插件管理的 exec 提供商可以使用 `pluginIntegration`，而不是
      复制的 `command`/`args`。OpenClaw 会在启动/重载期间从已安装的插件清单中解析当前命令详细信息。如果插件被
      禁用、移除、不受信任或不再声明该集成，
      使用该提供商的活跃 SecretRefs 将以失败关闭的方式处理。

    请求负载 (stdin):

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    响应负载 (stdout):

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    可选的按 ID 错误:

    ```json
    {
      "protocolVersion": 1,
      "values": {},
      "errors": { "providers/openai/apiKey": { "message": "not found" } }
    }
    ```

  </Accordion>
</AccordionGroup>

## 文件支持的 API 密钥

请勿在配置 `env` 块中放置 `file:...` 字符串。`env` 块是
字面量的且不可覆盖，因此不会解析 `file:...`。

改为在支持的凭据字段上使用文件 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

对于 `mode: "singleValue"`，SecretRef `id` 是 `"value"`。对于
`mode: "json"`，请使用绝对 JSON 指针，例如
`"/providers/xai/apiKey"`。

有关接受 SecretRefs 的配置字段，请参阅 [SecretRef 凭证界面](/zh/reference/secretref-credential-surface)。

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
  <Accordion title="Bitwarden 机密管理器 (`bws`)">
    当您希望 SecretRef id 映射到 Bitwarden 机密管理器 item keys 时，请使用解析器包装器。仓库包含
    `scripts/secrets/openclaw-bws-resolver.mjs`；请将其安装或复制到运行 Gateway(网关) 的主机上的绝对受信任路径中。

    要求：

    - 在 CLI 主机上安装了 Bitwarden 机密管理器 Gateway(网关) (`bws`)。
    - `BWS_ACCESS_TOKEN` 对 Gateway(网关) 服务可用。
    - 将 `PATH` 传递给解析器，或者将 `BWS_BIN` 设置为绝对 `bws`
      二进制路径。

    ```json5
    {
      secrets: {
        providers: {
          bws: {
            source: "exec",
            command: "/usr/local/bin/openclaw-bws-resolver.mjs",
            passEnv: ["BWS_ACCESS_TOKEN", "PATH", "BWS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "bws",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    解析器将请求的 id 分批处理，运行 `bws secret list`，并返回匹配的机密 `key` 字段的值。使用满足 exec SecretRef id 协定的键，例如 `openclaw/providers/openai/apiKey`；在解析器运行之前，将拒绝带有下划线的 env-var 样式键。如果有多个可见的 Bitwarden 机密具有相同的请求键，解析器将该 id 视为模糊并失败，而不是选择其中一个。更新配置后，验证解析器路径：

    ```bash
    openclaw secrets audit --allow-exec
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
  <Accordion title="password-store (`pass`)">
    当您希望 SecretRef id 直接映射到 `pass` 条目时，请使用一个小的解析器封装程序。将其作为可执行文件保存在通过 exec-提供商 路径检查的绝对路径中，例如
    `/usr/local/bin/openclaw-pass-resolver`。`#!/usr/bin/env node` shebang
    从解析器进程 `PATH` 解析 `node`，因此请在 `passEnv` 中包含 `PATH`。如果 `pass` 不在该 `PATH` 上，请在父环境中设置 `PASS_BIN` 并将其也包含在 `passEnv` 中：

    ```js
    #!/usr/bin/env node
    const { spawnSync } = require("node:child_process");

    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      stdin += chunk;
    });
    process.stdin.on("error", (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    process.stdin.on("end", () => {
      let request;
      try {
        request = JSON.parse(stdin || "{}");
      } catch (err) {
        process.stderr.write(`Failed to parse request: ${err.message}\n`);
        process.exit(1);
      }

      const passBin = process.env.PASS_BIN || "pass";
      const values = {};
      const errors = {};

      for (const id of request.ids ?? []) {
        const result = spawnSync(passBin, ["show", id], { encoding: "utf8" });
        if (result.status === 0) {
          values[id] = result.stdout.split(/\r?\n/, 1)[0] ?? "";
        } else {
          errors[id] = { message: (result.stderr || `pass exited ${result.status}`).trim() };
        }
      }

      process.stdout.write(JSON.stringify({ protocolVersion: 1, values, errors }));
    });
    ```

    然后配置 exec 提供商 并将 `apiKey` 指向 `pass` 条目路径：

    ```json5
    {
      secrets: {
        providers: {
          pass_store: {
            source: "exec",
            command: "/usr/local/bin/openclaw-pass-resolver",
            passEnv: ["PATH", "HOME", "GNUPGHOME", "GPG_TTY", "PASSWORD_STORE_DIR", "PASS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "pass_store",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    将密钥保留在 `pass` 条目的第一行，或者如果您想返回完整的 `pass show` 输出，则可以自定义封装程序。更新配置后，请验证静态审计和 exec 解析器路径：

    ```bash
    openclaw secrets audit --check
    openclaw secrets audit --allow-exec
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

通过 `plugins.entries.acpx.config.mcpServers`API 配置的 MCP 服务器环境变量支持 SecretInput。这可以将 API 密钥和令牌排除在明文配置之外：

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

明文字符串值仍然有效。像 `${MCP_SERVER_API_KEY}` 这样的环境模板引用和 SecretRef 对象会在生成 MCP 服务器进程之前的网关激活期间解析。与其他 SecretRef 表面一样，只有当 `acpx` 插件实际处于活动状态时，未解析的引用才会阻止激活。

## 沙箱 SSH 认证材料

核心 `ssh` 沙盒后端也支持用于 SSH 认证材料的 SecretRefs：

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

- OpenClaw 在沙箱激活期间解析这些引用，而不是在每次 SSH 调用时延迟解析。
- 解析出的值将以受限权限写入临时文件，并用于生成的 SSH 配置。
- 如果有效的沙盒后端不是 `ssh`，这些引用将保持非活动状态，并且不会阻止启动。

## 支持的凭据界面

规范的支持和不支持的凭据列于：

- [SecretRef 凭证表面](/zh/reference/secretref-credential-surface)

<Note>运行时创建或轮换的凭据和 OAuth 刷新材料有意从只读 SecretRef 解析中排除。</Note>

## 必需的行为和优先级

- 没有引用的字段：保持不变。
- 带有引用的字段：在激活期间的活动界面上是必需的。
- 如果同时存在明文和引用，则在支持的优先级路径上引用优先。
- 编辑哨兵 `__OPENCLAW_REDACTED__` 保留用于内部配置编辑/还原，并会被拒绝作为字面提交的配置数据。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (运行时警告)
- `REF_SHADOWED` (审计发现，当 `auth-profiles.json` 凭据优先于 `openclaw.json` 引用时)

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于纯文本 `serviceAccount`。
- 当设置了同级引用时，明文值将被忽略。

## 激活触发器

密钥激活运行于：

- 启动（预检加上最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- 在持久化编辑之前，对所提交的配置负载中的活动面 SecretRef 可解析性执行 Gateway(网关) 配置写入 RPC 预检 (Gateway(网关)RPC`config.set` / `config.apply` / `config.patch`)

激活契约：

- 成功会原子地交换快照。
- 启动失败将中止网关启动。
- 运行时重新加载失败将保留上一个已知良好的快照。
- 写入-RPC 预检失败将拒绝提交的配置，并保持磁盘配置和活动运行时快照均不变。
- 为出站 helper/工具 调用提供显式的单次调用渠道令牌不会触发 SecretRef 激活；激活点仍为启动、重新加载和显式 `secrets.reload`。

## 降级和恢复信号

当在健康状态后重新加载时激活失败，OpenClaw 进入降级密钥状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时保留最后一个已知良好的快照。
- 恢复：在下次成功激活后发出一次。
- 如果已经处于降级状态，重复的故障会记录警告日志，但不会通过事件刷屏。
- 启动快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以通过网关快照 RPC 选择支持 SecretRef 解析。

有两种广泛的行为：

<Tabs>
  <Tab title="严格命令路径">
    例如 `openclaw memory` 远程内存路径和 `openclaw qr --remote`，当它需要远程共享密钥引用时。它们从活动快照读取，并在所需的 SecretRef 不可用时快速失败。
  </Tab>
  <Tab title="只读命令路径">
    例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit` 和只读的 doctor/配置修复流程。它们也优先使用活动快照，但当该命令路径中目标 SecretRef 不可用时会降级而不是中止。

    只读行为：

    - 当 Gateway(网关) 运行时，这些命令首先从活动快照读取。
    - 如果 Gateway(网关) 解析不完整或 Gateway(网关) 不可用，它们会尝试针对特定命令表面的本地回退。
    - 如果目标 SecretRef 仍然不可用，命令将以降级的只读输出和显式诊断信息（例如“在此命令路径中已配置但不可用”）继续执行。
    - 这种降级行为仅限于命令本地。它不会削弱运行时启动、重新加载或发送/认证路径。

  </Tab>
</Tabs>

其他说明：

- 后端密钥轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway(网关) RPC 方法：Gateway(网关)RPC`secrets.resolve`。

## 审计和配置工作流

默认操作员流程：

<Steps>
  <Step title="审计当前状态">```bash openclaw secrets audit --check ```</Step>
  <Step title="配置并应用 SecretRefs">```bash openclaw secrets configure --apply ```</Step>
  <Step title="重新审计">```bash openclaw secrets audit --check ```</Step>
</Steps>

在重新审计干净之前，不要认为迁移已完成。如果审计仍然报告静态的明文值，即使运行时 API 返回编辑后的值，代理访问风险仍然存在。

如果您在 `configure` 期间保存计划而不是应用，请在重新审核之前使用 `openclaw secrets apply --from <plan-path>` 应用该已保存的计划。

<AccordionGroup>
  <Accordion title="secrets audit">
    发现结果包括：

    - 静态纯文本值（`openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `agents/*/agent/models.json`）
    - 生成的 `models.json` 条目中的敏感提供商纯文本头部残留
    - 未解析的引用
    - 优先级覆盖（`auth-profiles.json` 优先于 `openclaw.json` 引用）
    - 遗留残留（`auth.json`、OAuth 提醒）

    Exec 说明：

    - 默认情况下，审计会跳过 exec SecretRef 可解析性检查，以避免命令副作用。
    - 使用 `openclaw secrets audit --allow-exec` 在审计期间执行 exec 提供商。

    头部残留说明：

    - 敏感提供商头部检测基于名称启发式方法（常见的身份验证/凭据头部名称和片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

  </Accordion>
  <Accordion title="secrets configure">
    交互式辅助工具，用于：

    - 首先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
    - 允许您为一个代理范围在 `openclaw.json` 中选择支持的秘密承载字段，外加 `auth-profiles.json`
    - 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
    - 捕获 SecretRef 详情（`source`、`provider`、`id`）
    - 运行预检解析
    - 可以立即应用

    Exec 注意事项：

    - 除非设置了 `--allow-exec`，否则预检将跳过 exec SecretRef 检查。
    - 如果您直接从 `configure --apply` 应用且计划包含 exec 引用/提供者，请在应用步骤中也保持设置 `--allow-exec`。

    有用的模式：

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` 应用默认值：

    - 从 `auth-profiles.json` 中清除针对提供者的匹配静态凭据
    - 从 `auth.json` 中清除遗留的静态 `api_key` 条目
    - 从 `<config-dir>/.env` 中清除匹配的已知秘密行

  </Accordion>
  <Accordion title="secrets apply">
    应用已保存的计划：

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Exec 注意事项：

    - 除非设置了 `--allow-exec`，否则 dry-run 将跳过 exec 检查。
    - 除非设置了 `--allow-exec`，否则写入模式将拒绝包含 exec SecretRefs/提供者的计划。

    有关严格的目标/路径合约详情和确切的拒绝规则，请参阅 [Secrets Apply Plan Contract](/zh/gateway/secrets-plan-contract)。

  </Accordion>
</AccordionGroup>

## 单向安全策略

<Warning>OpenClaw 故意不写入包含历史明文秘密值的回滚备份。</Warning>

安全模型：

- 写入模式之前必须成功通过预检查
- 运行时激活在提交前进行验证
- 应用更新时使用原子文件替换，并在失败时尽力恢复

## 旧版身份验证兼容性说明

对于静态凭据，运行时不再依赖明文旧版身份验证存储。

- 运行时凭据来源是已解析的内存快照。
- 当发现遗留的静态 `api_key` 条目时，会将其清除。
- 与 OAuth 相关的兼容性行为保持独立。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑器模式下比在表单模式下更容易配置。

## 相关

- [身份验证](/zh/gateway/authentication) — 身份验证设置
- [CLI: secrets](CLI/en/cli/secretsCLI) — CLI 命令
- [环境变量](/zh/help/environment) — 环境优先级
- [SecretRef 凭据范围](/zh/reference/secretref-credential-surface) — 凭据范围
- [Secrets 应用计划契约](/zh/gateway/secrets-plan-contract) — 计划契约详情
- [安全性](/zh/gateway/security) — 安全态势
