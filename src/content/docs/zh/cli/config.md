---
summary: "CLI reference for `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "Config"
sidebarTitle: "Config"
---

Config helpers for non-interactive edits in `openclaw.json`: get/set/unset/file/schema/validate values by path and print the active config file. Run without a subcommand to open the configure wizard (same as `openclaw configure`).

## 根选项

<ParamField path="--section <section>" type="string">
  当不带子命令运行 `openclaw config` 时，可重复的引导式设置章节筛选器。
</ParamField>

支持的引导章节：`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`。

## 示例

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

将 `openclaw.json` 生成的 JSON 架构以 JSON 格式打印到标准输出。

<AccordionGroup>
  <Accordion title="它包含的内容">
    - 当前的根配置架构，以及用于编辑器工具的根 `$schema` 字符串字段。 - Control UI 使用的字段 `title` 和 `description` 文档元数据。 - 嵌套对象、通配符 (`*`) 和数组项 (`[]`) 节点在存在匹配的字段文档时，会继承相同的 `title` / `description` 元数据。 - `anyOf` / `oneOf` / `allOf` 分支在存在匹配的字段文档时，也会继承相同的文档元数据。 - 当可以加载运行时清单时，尽力提供实时的插件 + 渠道架构元数据。 -
    即使当前配置无效，也会提供一个干净的回退架构。
  </Accordion>
  <Accordion title="Related runtime RPC">`config.schema.lookup` 返回一个标准化的配置路径，其中包含一个浅层架构节点（`title`、`description`、`type`、`enum`、`const`、通用边界）、匹配的 UI 提示元数据以及直接子项摘要。将其用于 Control UI 或自定义客户端中的路径范围下钻。</Accordion>
</AccordionGroup>

```bash
openclaw config schema
```

当您想使用其他工具检查或验证它时，将其通过管道传输到文件中：

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

如果可能，值会被解析为 JSON5；否则将被视为字符串。使用 `--strict-json` 来强制要求 JSON5 解析。`--json` 作为遗留别名仍然受支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 将原始值作为 JSON 而非终端格式化文本输出。

<Note>
对象赋值默认会替换目标路径。受保护的映射/列表路径（通常包含用户添加的条目），例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`，会拒绝将删除现有条目的替换操作，除非您传递 `--replace`。
</Note>

向这些映射添加条目时，使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

仅当您有意希望提供的值成为完整的目标值时，才使用 `--replace`。

## `config set` 模式

`openclaw config set` 支持四种赋值样式：

<Tabs>
  <Tab title="Value mode">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab title="SecretRef builder mode">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab title="Provider builder mode">
    Provider builder mode 仅定位 `secrets.providers.<alias>` 路径：

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="批处理模式">
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

  </Tab>
</Tabs>

<Warning>在不支持的运行时可变表面上，SecretRef 分配将被拒绝（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 线程绑定 webhook 令牌以及 WhatsApp 凭据 JSON）。请参阅 [SecretRef 凭据表面](/zh/reference/secretref-credential-surface)。</Warning>

批处理解析始终使用批处理负载（`--batch-json`/`--batch-file`）作为事实来源。`--strict-json` / `--json` 不会更改批处理解析行为。

对于 SecretRef 和提供商，JSON 路径/值模式仍然受支持：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## 提供商构建器标志

提供商构建器目标必须使用 `secrets.providers.<alias>` 作为路径。

<AccordionGroup>
  <Accordion title="通用标志">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)
  </Accordion>
  <Accordion title="Env 提供商 (--提供商-source env)">
    - `--provider-allowlist <ENV_VAR>` (可重复)
  </Accordion>
  <Accordion title="File 提供商 (--提供商-source file)">
    - `--provider-path <path>` (必需)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`
  </Accordion>
  <Accordion title="Exec 提供商 (--提供商-source exec)">
    - `--provider-command <path>` (必需)
    - `--provider-arg <arg>` (可重复)
    - `--provider-no-output-timeout-ms <ms>`
    - `--provider-max-output-bytes <bytes>`
    - `--provider-json-only`
    - `--provider-env <KEY=VALUE>` (可重复)
    - `--provider-pass-env <ENV_VAR>` (可重复)
    - `--provider-trusted-dir <path>` (可重复)
    - `--provider-allow-insecure-path`
    - `--provider-allow-symlink-command`
  </Accordion>
</AccordionGroup>

加固版 exec 提供商示例：

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

<AccordionGroup>
  <Accordion title="Dry-run behavior">
    - 构建器模式：对更改的 refs/提供商运行 SecretRef 可解析性检查。
    - JSON 模式（`--strict-json`、`--json` 或批处理模式）：运行架构验证以及 SecretRef 可解析性检查。
    - 策略验证也会针对已知不支持的 SecretRef 目标表面运行。
    - 策略检查评估完整的更改后配置，因此父对象写入（例如将 `hooks` 设置为对象）无法绕过不支持的表面验证。
    - 默认情况下，在试运行期间会跳过 Exec SecretRef 检查以避免命令副作用。
    - 使用 `--allow-exec` 配合 `--dry-run` 以选择加入 Exec SecretRef 检查（这可能会执行提供商命令）。
    - `--allow-exec` 仅用于试运行，如果在不带 `--dry-run` 的情况下使用会报错。
  </Accordion>
  <Accordion title="--dry-run -- fields">
    `--dry-run --json` 打印机器可读的报告：

    - `ok`：试运行是否通过
    - `operations`：评估的赋值数量
    - `checks`：是否运行了架构/可解析性检查
    - `checks.resolvabilityComplete`：可解析性检查是否运行至完成（当跳过 exec refs 时为 false）
    - `refsChecked`：在试运行期间实际解析的 refs 数量
    - `skippedExecRefs`：因未设置 `--allow-exec` 而跳过的 exec refs 数量
    - `errors`：当 `ok=false` 时的结构化架构/可解析性失败信息

  </Accordion>
</AccordionGroup>

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

<Tabs>
  <Tab title="Success example">
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
  </Tab>
  <Tab title="Failure example">
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
  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="If dry-run fails">
    - `config schema validation failed`: 更改后的配置形状无效；请修复路径/值或提供商/ref 对象形状。
    - `Config policy validation failed: unsupported SecretRef usage`: 将该凭据移回纯文本/字符串输入，并仅在支持的表面上保留 SecretRefs。
    - `SecretRef assignment(s) could not be resolved`: 引用的提供商/ref 当前无法解析（缺少环境变量、无效的文件指针、exec 提供商失败，或提供商/源不匹配）。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`: 试运行跳过了 exec 引用；如果需要 exec 解析能力验证，请使用 `--allow-exec` 重新运行。
    - 对于批处理模式，请修复失败的条目并在写入前重新运行 `--dry-run`。
  </Accordion>
</AccordionGroup>

## 写入安全

`openclaw config set` 和其他 OpenClaw 拥有的配置写入程序会在将完整的更改后配置提交到磁盘之前对其进行验证。如果新负载未能通过架构验证或看起来具有破坏性覆盖风险，活动配置将保持不变，被拒绝的负载将作为 `openclaw.json.rejected.*` 保存到其旁边。

<Warning>活动配置路径必须是常规文件。不支持对符号链接的 `openclaw.json` 布局进行写入；请改用 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。</Warning>

对于小规模编辑，首选 CLI 写入：

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

仍然允许直接编辑器写入，但在它们通过验证之前，运行的 Gateway(网关) 会将其视为不受信任。无效的直接编辑可以在启动或热重新加载期间从上次已知的良好备份中恢复。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-restored-last-known-good-config)。

全文件恢复仅适用于全局损坏的配置，例如解析错误、根级架构失败、旧版迁移失败，或插件与根级别的混合失败。如果验证仅在 `plugins.entries.<id>...` 下失败，OpenClaw 将保持当前的 `openclaw.json` 不变，并报告插件本地的问题，而不是恢复 `.last-good`。这可以防止因插件架构更改或 `minHostVersion` 偏差而回滚不相关的用户设置，例如模型、提供商、身份验证配置文件、频道、网关暴露、工具、内存、浏览器或 cron 配置。

## 子命令

- `config file`：打印活动配置文件的路径（从 `OPENCLAW_CONFIG_PATH` 或默认位置解析）。路径应指定为常规文件，而不是符号链接。

编辑后重启网关。

## 验证

根据活动架构验证当前配置，而无需启动网关。

```bash
openclaw config validate
openclaw config validate --json
```

在 `openclaw config validate` 通过后，您可以使用本地 TUI 让嵌入式代理将活动配置与文档进行比较，同时在同一终端验证每个更改：

<Note>如果验证已经失败，请从 `openclaw configure` 或 `openclaw doctor --fix` 开始。`openclaw chat` 不会绕过无效配置保护。</Note>

```bash
openclaw chat
```

然后在 TUI 内部：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

典型修复循环：

<Steps>
  <Step title="与文档比较">要求代理将您的当前配置与相关文档页面进行比较，并提出最小的修复建议。</Step>
  <Step title="应用定向编辑">使用 `openclaw config set` 或 `openclaw configure` 应用定向编辑。</Step>
  <Step title="重新验证">在每次更改后重新运行 `openclaw config validate`。</Step>
  <Step title="针对运行时问题的诊断">如果验证通过但运行时仍然不正常，请运行 `openclaw doctor` 或 `openclaw doctor --fix` 以获取迁移和修复帮助。</Step>
</Steps>

## 相关

- [CLI 参考](/zh/cli)
- [配置](/zh/gateway/configuration)
