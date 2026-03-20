---
summary: "`openclaw config` 的 CLI 參考（get/set/unset/file/validate）"
read_when:
  - 您想要以非互動方式讀取或編輯設定
title: "config"
---

# `openclaw config`

`openclaw.json` 中用於非互動式編輯的設定輔助工具：透過路徑 get/set/unset/validate
值並列印作用中的設定檔。不加子指令執行可開啟組合精靈（同 `openclaw configure`）。

## 範例

```bash
openclaw config file
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

## 路徑

路徑使用點號或括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理程式清單索引來指定特定代理程式：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 數值

值會盡可能解析為 JSON5，否則會視為字串。
使用 `--strict-json` 強制要求 JSON5 解析。`--json` 仍保留作為舊版別名。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## `config set` 模式

`openclaw config set` 支援四種指派樣式：

1. 數值模式：`openclaw config set <path> <value>`
2. SecretRef 建構器模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. 提供者建構器模式（僅限 `secrets.providers.<alias>` 路徑）：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. 批次模式（`--batch-json` 或 `--batch-file`）：

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

批次解析一律使用批次載荷（`--batch-json`/`--batch-file`）作為來源。
`--strict-json` / `--json` 不會改變批次解析行為。

JSON 路徑/值模式仍支援 SecretRefs 和提供者：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## 提供者建構器旗標

提供者建構器目標必須使用 `secrets.providers.<alias>` 作為路徑。

通用旗標：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`， `exec`)

Env 提供者（`--provider-source env`）：

- `--provider-allowlist <ENV_VAR>` (可重複)

檔案提供者（`--provider-source file`）：

- `--provider-path <path>` (必填)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Exec provider (`--provider-source exec`)：

- `--provider-command <path>` (必填)
- `--provider-arg <arg>` (可重複)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (可重複)
- `--provider-pass-env <ENV_VAR>` (可重複)
- `--provider-trusted-dir <path>` (可重複)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

Hardened exec provider 範例：

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

## 試執行

使用 `--dry-run` 來驗證變更，而不寫入 `openclaw.json`。

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

試執行行為：

- Builder 模式：對已變更的 refs/providers 執行 SecretRef 可解析性檢查。
- JSON 模式（`--strict-json`、`--json` 或批次模式）：執行架構驗證以及 SecretRef 可解析性檢查。
- 在試執行期間，預設會跳過 Exec SecretRef 檢查，以避免指令的副作用。
- 使用 `--allow-exec` 搭配 `--dry-run` 以選用 Exec SecretRef 檢查（這可能會執行 provider 指令）。
- `--allow-exec` 僅適用於試執行，若未搭配 `--dry-run` 使用則會報錯。

`--dry-run --json` 會列印機器可讀的報告：

- `ok`：試執行是否通過
- `operations`：已評估的指派數量
- `checks`：是否執行了架構/可解析性檢查
- `checks.resolvabilityComplete`：可解析性檢查是否執行至完成（跳過 exec refs 時為 false）
- `refsChecked`：試驗執行期間實際解析的 refs 數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時，結構化 schema/可解析性失敗

### JSON 輸出結構

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

成功範例：

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

失敗範例：

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

如果試驗執行失敗：

- `config schema validation failed`：變更後的 config 結構無效；請修正路徑/數值或 provider/ref 物件結構。
- `SecretRef assignment(s) could not be resolved`：參照的 provider/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec provider 失敗，或 provider/source 不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試驗執行跳過了 exec refs；如果您需要 exec 可解析性驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請在寫入之前修正失敗的項目並重新執行 `--dry-run`。

## 子指令

- `config file`：列印現行設定檔路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。

編輯後請重新啟動閘道。

## 驗證

根據現行架構驗證目前的設定，而不啟動閘道。

```bash
openclaw config validate
openclaw config validate --json
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
