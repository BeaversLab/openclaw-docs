---
summary: "CLI 参考 for `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

Config helpers for non-interactive edits in `openclaw.json`: get/set/unset/file/schema/validate
values by path and print the active config file. Run without a subcommand to
open the configure wizard (same as `openclaw configure`).

根选项：

- `--section <section>`: repeatable guided-setup section filter when you run `openclaw config` without a subcommand

支持的引导部分：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## 示例

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

Print the generated JSON schema for `openclaw.json` to stdout as JSON.

包括内容：

- The current root config schema, plus a root `$schema` string field for editor tooling
- Field `title` and `description` docs metadata used by the Control UI
- Nested object, wildcard (`*`), and array-item (`[]`) nodes inherit the same `title` / `description` metadata when matching field documentation exists
- `anyOf` / `oneOf` / `allOf` branches inherit the same docs metadata too when matching field documentation exists
- 当可以加载运行时清单时，尽力提供实时的插件 + 渠道架构元数据
- 即使当前配置无效，也能提供一个干净的后备架构

相关的运行时 RPC：

- `config.schema.lookup` returns one normalized config path with a shallow
  schema node (`title`, `description`, `type`, `enum`, `const`, common bounds),
  matched UI hint metadata, and immediate child summaries. Use it for
  path-scoped drill-down in Control UI or custom clients.

```bash
openclaw config schema
```

当你想使用其他工具检查或验证它时，将其通过管道传输到文件：

```bash
openclaw config schema > openclaw.schema.json
```

### 路径

路径使用点或括号表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理列表索引来定位特定代理：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

如果可能，值将作为 JSON5 进行解析；否则将被视为字符串。
使用 `--strict-json` 强制进行 JSON5 解析。`--json` 作为旧版别名仍然受支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 将原始值作为 JSON 打印，而不是终端格式的文本。

## `config set` 模式

`openclaw config set` 支持四种赋值样式：

1. 值模式：`openclaw config set <path> <value>`
2. SecretRef 构建器模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Provider 构建器模式（仅限 `secrets.providers.<alias>` 路径）：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. 批处理模式（`--batch-json` 或 `--batch-file`）：

```bash
openclaw config set --batch-json '[
  {
    "path": "secrets.providers.default",
    "provider": { "source": "env" }
  },
  {
    "path": "channels.discord.token",
    "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
  }
]'
```

```bash
openclaw config set --batch-file ./config-set.batch.json --dry-run
```

策略说明：

- 在不支持的运行时可变表面上将拒绝 SecretRef 赋值（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 线程绑定 webhook 令牌以及 WhatsApp 凭证 JSON）。请参阅 [SecretRef 凭证表面](/zh/reference/secretref-credential-surface)。

批处理解析始终使用批处理负载（`--batch-json`/`--batch-file`）作为事实来源。
`--strict-json` / `--json` 不会改变批处理解析行为。

JSON 路径/值模式仍支持 SecretRef 和提供商：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## 提供商构建器标志

Provider 构建器目标必须使用 `secrets.providers.<alias>` 作为路径。

通用标志：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>`（`file`，`exec`）

Env 提供商（`--provider-source env`）：

- `--provider-allowlist <ENV_VAR>`（可重复）

File 提供商（`--provider-source file`）：

- `--provider-path <path>`（必需）
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Exec 提供商（`--provider-source exec`）：

- `--provider-command <path>`（必需）
- `--provider-arg <arg>`（可重复）
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>`（可重复）
- `--provider-pass-env <ENV_VAR>`（可重复）
- `--provider-trusted-dir <path>`（可重复）
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

加固型 exec 提供商 示例：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## 试运行

使用 `--dry-run` 在不写入 `openclaw.json` 的情况下验证更改。

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

openclaw config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

试运行行为：

- Builder 模式：对已更改的 refs/providers 运行 SecretRef 可解析性检查。
- JSON 模式（`--strict-json`、`--json` 或批处理模式）：运行架构验证以及 SecretRef 可解析性检查。
- 对于已知不支持的 SecretRef 目标面，也会运行策略验证。
- 策略检查会评估完整的变更后配置，因此父对象写入（例如将 `hooks` 设置为对象）无法绕过不支持的表面验证。
- 为了避免命令副作用，试运行期间默认跳过 Exec SecretRef 检查。
- 结合使用 `--allow-exec` 和 `--dry-run` 以选择启用 exec SecretRef 检查（这可能会执行提供商命令）。
- `--allow-exec` 仅限试运行，如果未与 `--dry-run` 一起使用则会报错。

`--dry-run --json` 打印机器可读的报告：

- `ok`：试运行是否通过
- `operations`：评估的赋值数量
- `checks`：是否运行了架构/可解析性检查
- `checks.resolvabilityComplete`：可解析性检查是否运行完成（跳过 exec 引用时为 false）
- `refsChecked`：试运行期间实际解析的引用数量
- `skippedExecRefs`：因未设置 `--allow-exec` 而跳过的 exec 引用数量
- `errors`：当 `ok=false` 时出现的结构化架构/可解析性失败

### JSON 输出结构

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // present for resolvability errors
    },
  ],
}
```

成功示例：

```json
{
  "ok": true,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0
}
```

失败示例：

```json
{
  "ok": false,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0,
  "errors": [
    {
      "kind": "resolvability",
      "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
      "ref": "env:default:MISSING_TEST_SECRET"
    }
  ]
}
```

如果试运行失败：

- `config schema validation failed`：您的变更后配置形状无效；请修复路径/值或提供商/ref 对象形状。
- `Config policy validation failed: unsupported SecretRef usage`：将该凭据移回纯文本/字符串输入，并仅在支持的表面上保留 SecretRef。
- `SecretRef assignment(s) could not be resolved`：引用的提供商/ref 目前无法解析（缺少环境变量、无效的文件指针、exec 提供商失败或提供商/源不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：试运行跳过了 exec 引用；如果需要 exec 可解析性验证，请使用 `--allow-exec` 重新运行。
- 对于批处理模式，请在写入之前修复失败的条目并重新运行 `--dry-run`。

## 写入安全

`openclaw config set` 和其他 OpenClaw 拥有的配置写入程序在将更改提交到磁盘之前会验证完整的更改后配置。如果新负载未通过架构验证或看起来具有破坏性，活动配置将保持不变，被拒绝的负载将作为 `openclaw.json.rejected.*` 保存在其旁边。

对于小型编辑，首选 CLI 写入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果写入被拒绝，请检查保存的负载并修复完整的配置形状：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允许直接编辑器写入，但在运行中的 Gateway(网关) 验证它们之前，会将它们视为不受信任。在启动或热重载期间，可以从上次已知的良好备份恢复无效的直接编辑。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-restored-last-known-good-config)。

## 子命令

- `config file`：打印活动配置文件路径（从 `OPENCLAW_CONFIG_PATH` 或默认位置解析）。

编辑后重启网关。

## 验证

根据活动架构验证当前配置，而无需启动网关。

```bash
openclaw config validate
openclaw config validate --json
```
