---
summary: "CLI`openclaw config` 参考（适用于 get/set/patch/unset/file/schema/validate）"
read_when:
  - You want to read or edit config non-interactively
title: "配置"
sidebarTitle: "配置"
---

用于在 `openclaw.json` 中进行非交互式编辑的配置辅助工具：通过路径获取/设置/修补/取消设置/文件/架构/验证值，并打印活动配置文件。不带子命令运行以打开配置向导（与 `openclaw configure` 相同）。

<Note>
当 `OPENCLAW_NIX_MODE=1`OpenClaw 时，OpenClaw 将 `openclaw.json` 视为不可变。只读命令如 `config get`、`config file`、`config schema` 和 `config validate`Nix 仍然有效，但配置写入操作会被拒绝。代理应改为编辑安装的 Nix 源；对于第一方 nix-openclaw 发行版，请使用 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start) 并在 `programs.openclaw.config` 或 `instances.<name>.config` 下设置值。
</Note>

## 根选项

<ParamField path="--section <section>" type="string">
  当您不带子命令运行 `openclaw config` 时，可重复的引导式设置部分过滤器。
</ParamField>

支持的引导部分：`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`。

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
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

将 `openclaw.json` 生成的 JSON 架构以 JSON 格式打印到标准输出。

<AccordionGroup>
  <Accordion title="包含内容">
    - 当前的根配置模式，以及一个用于编辑器工具的根 `$schema` 字符串字段。
    - Control UI 使用的字段 `title` 和 `description` 文档元数据。
    - 嵌套对象、通配符 (`*`) 和数组项 (`[]`) 节点在存在匹配字段文档时继承相同的 `title` / `description` 元数据。
    - `anyOf` / `oneOf` / `allOf` 分支在存在匹配字段文档时也继承相同的文档元数据。
    - 当可以加载运行时清单时，尽力提供实时的插件 + 渠道 模式元数据。
    - 即使当前配置无效，也会提供一个干净的后备模式。

  </Accordion>
  <Accordion title="RPC相关运行时 RPC">
    `config.schema.lookup` 返回一个带有浅层模式节点（`title`、`description`、`type`、`enum`、`const`、通用边界）的标准化配置路径、匹配的 UI 提示元数据以及直接子摘要。使用它可在 Control UI 或自定义客户端中进行路径范围的向下钻取。
  </Accordion>
</AccordionGroup>

```bash
openclaw config schema
```

当您想使用其他工具检查或验证它时，将其通过管道传输到文件中：

```bash
openclaw config schema > openclaw.schema.json
```

### 路径

路径使用点号或方括号表示法。在 shell 示例中，请给方括号表示法的路径加上引号，以免 zsh 等 shell 在 OpenClaw 接收到路径之前将 `[0]`OpenClaw 作为 glob 展开：

```bash
openclaw config get agents.defaults.workspace
openclaw config get 'agents.list[0].id'
```

使用代理列表索引来定位特定的代理：

```bash
openclaw config get agents.list
openclaw config set 'agents.list[1].tools.exec.node' "node-id-or-name"
```

## 值

值在可能的情况下会被解析为 JSON5，否则将被视为字符串。使用 `--strict-json` 强制进行 JSON5 解析。`--json` 作为旧版别名仍受支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 会将原始值作为 JSON 打印，而不是终端格式的文本。

<Note>
对象赋值默认会替换目标路径。那些通常保存用户添加条目的受保护映射/列表路径，例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`，会拒绝可能删除现有条目的替换操作，除非您传递 `--replace`。
</Note>

向这些映射添加条目时，请使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

仅当您有意让提供的值成为完整的目标值时，才使用 `--replace`。

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
    Provider builder mode 仅针对 `secrets.providers.<alias>` 路径：

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="Batch mode">
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

<Warning>SecretRef 赋值在不支持的运行时可变表面上会被拒绝（例如 `hooks.token`、`commands.ownerDisplaySecret`DiscordWhatsApp、Discord 线程绑定 webhook 令牌以及 WhatsApp 凭据 JSON）。请参阅 [SecretRef 凭据表面](/zh/reference/secretref-credential-surface)。</Warning>

批量解析始终使用批量负载（`--batch-json`/`--batch-file`）作为事实来源。`--strict-json` / `--json` 不会改变批量解析行为。

## `config patch`

当您想要粘贴或通过管道传递配置形状的补丁，而不是运行许多基于路径的 `config set` 命令时，请使用 `config patch`。输入是一个 JSON5 对象。对象递归合并，数组和标量值替换目标值，而 `null` 删除目标路径。

```bash
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config patch --file ./openclaw.patch.json5
```

您也可以通过 stdin 传递补丁，这对于远程安装脚本很有用：

```bash
ssh openclaw-host 'openclaw config patch --stdin --dry-run' < ./openclaw.patch.json5
ssh openclaw-host 'openclaw config patch --stdin' < ./openclaw.patch.json5
```

补丁示例：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

当一个对象或数组必须完全变为提供的值而不是递归修补时，请使用 `--replace-path <path>`：

```bash
openclaw config patch --file ./discord.patch.json5 --replace-path 'channels.discord.guilds["123"].channels'
```

`--dry-run` 在不写入的情况下运行模式和 SecretRef 可解析性检查。默认情况下，Exec 支持的 SecretRef 在试运行期间会被跳过；如果您有意让试运行执行提供商命令，请添加 `--allow-exec`。

对于 SecretRefs 和提供商，仍然支持 JSON 路径/值模式：

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
  <Accordion title="文件提供商 (--提供商-source file)">
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

硬化的 exec 提供商示例：

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
    - Builder mode: 针对更改的 refs/providers 运行 SecretRef 可解析性检查。
    - JSON mode (`--strict-json`, `--json`, 或 batch mode): 运行架构验证以及 SecretRef 可解析性检查。
    - 对于已知不支持的 SecretRef 目标表面，也会运行策略验证。
    - 策略检查评估完整的更改后配置，因此父对象写入（例如将 `hooks` 设置为对象）无法绕过不支持的表面验证。
    - 为了避免命令副作用，默认会在 dry-run 期间跳过 Exec SecretRef 检查。
    - 使用 `--allow-exec` 配合 `--dry-run` 以选择加入 exec SecretRef 检查（这可能会执行提供商命令）。
    - `--allow-exec` 仅限 dry-run，如果在不使用 `--dry-run` 的情况下使用会报错。

  </Accordion>
  <Accordion title="--dry-run -- fields">
    `--dry-run --json` 打印机器可读的报告：

    - `ok`：试运行是否通过
    - `operations`：评估的赋值数量
    - `checks`：是否运行了模式/可解析性检查
    - `checks.resolvabilityComplete`：可解析性检查是否运行完成（跳过 exec refs 时为 false）
    - `refsChecked`：试运行期间实际解析的 refs 数量
    - `skippedExecRefs`：因未设置 `--allow-exec` 而跳过的 exec refs 数量
    - `errors`：当 `ok=false` 时的结构化缺失路径、模式或可解析性失败信息

  </Accordion>
</AccordionGroup>

### JSON 输出结构

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder" | "unset", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "missing-path" | "schema" | "resolvability",
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
    - `config schema validation failed`：更改后的配置形状无效；请修复路径/值或 提供商/ref 对象形状。
    - `Config policy validation failed: unsupported SecretRef usage`：将该凭据移回纯文本/字符串输入，并仅在支持的表面上保留 SecretRefs。
    - `SecretRef assignment(s) could not be resolved`：引用的 提供商/ref 当前无法解析（缺少环境变量、无效的文件指针、exec 提供商 失败或 提供商/source 不匹配）。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：试运行跳过了 exec refs；如果需要 exec 可解析性验证，请使用 `--allow-exec` 重新运行。
    - 对于批处理模式，请修复失败的条目并在写入前重新运行 `--dry-run`。

  </Accordion>
</AccordionGroup>

## 写入安全

`openclaw config set` 和其他 OpenClaw 拥有的配置写入器在将完整的更改后配置提交到磁盘之前会对其进行验证。如果新负载未能通过模式验证或看起来像是破坏性覆盖，则当前配置将保持不变，被拒绝的负载将作为 `openclaw.json.rejected.*` 保存在其旁边。

<Warning>当前配置路径必须是常规文件。不支持符号链接的 `openclaw.json` 布局进行写入；请改用 `OPENCLAW_CONFIG_PATH` 直接指向真实文件。</Warning>

对于小幅编辑，首选 CLI 写入：

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

仍然允许直接通过编辑器写入，但在运行的 Gateway(网关) 将它们视为不受信任，直到它们通过验证。无效的直接编辑会导致启动失败或被热重载跳过；Gateway(网关) 不会重写 `openclaw.json`。运行 `openclaw doctor --fix` 以修复已添加前缀/被覆盖的配置或恢复最后一次已知良好的副本。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#gateway-rejected-invalid-config)。

全文件恢复仅限用于 doctor 修复。插件架构更改或 `minHostVersion` 偏差将保持报错，而不是回滚无关的用户设置，例如模型、提供商、身份验证配置文件、频道、网关暴露、工具、内存、浏览器或 cron 配置。

## 子命令

- `config file`：打印活动配置文件路径（从 `OPENCLAW_CONFIG_PATH` 或默认位置解析）。该路径应命名一个常规文件，而不是符号链接。

编辑后重启网关。

## 验证

根据活动架构验证当前配置，而无需启动网关。

```bash
openclaw config validate
openclaw config validate --json
```

在 `openclaw config validate` 通过后，您可以使用本地 TUI 让嵌入式代理对照文档检查活动配置，同时您从同一终端验证每项更改：

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
  <Step title="重新验证">每次更改后重新运行 `openclaw config validate`。</Step>
  <Step title="针对运行时问题的 Doctor">如果验证通过但运行时仍然不健康，请运行 `openclaw doctor` 或 `openclaw doctor --fix` 以获取迁移和修复帮助。</Step>
</Steps>

## 相关

- [CLI 参考](/zh/cli)
- [配置](/zh/gateway/configuration)
