---
summary: "CLI 參考，用於 `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

在 `openclaw.json` 中進行非互動式編輯的配置輔助工具：get/set/unset/file/schema/validate
根據路徑取得/設定/取消設定/檔案/架構/驗證
值，並列印使用中的配置檔案。不帶子指令執行以
開啟配置精靈（與 `openclaw configure` 相同）。

## 範例

```bash
openclaw config file
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

將 `openclaw.json` 產生的 JSON 結構描述以純文字列印至 stdout。

```bash
openclaw config schema
```

當您想使用其他工具檢查或驗證它時，將其輸出至檔案：

```bash
openclaw config schema > openclaw.schema.json
```

### 路徑

路徑使用點號或方括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理程式清單索引來指定特定的代理程式：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## `config set` modes

`openclaw config set` supports four assignment styles:

1. Value mode: `openclaw config set <path> <value>`
2. SecretRef builder mode:

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Provider builder mode (`secrets.providers.<alias>` path only):

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. Batch mode (`--batch-json` or `--batch-file`):

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

Batch parsing always uses the batch payload (`--batch-json`/`--batch-file`) as the source of truth.
`--strict-json` / `--json` do not change batch parsing behavior.

JSON path/value mode remains supported for both SecretRefs and providers:

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Provider Builder Flags

Provider builder 目標必須使用 `secrets.providers.<alias>` 作為路徑。

常見旗標：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Env 提供者 (`--provider-source env`)：

- `--provider-allowlist <ENV_VAR>` (可重複)

File 提供者 (`--provider-source file`)：

- `--provider-path <path>` (必要)
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Exec 提供者 (`--provider-source exec`)：

- `--provider-command <path>` (必要)
- `--provider-arg <arg>` (可重複)
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>` (可重複)
- `--provider-pass-env <ENV_VAR>` (可重複)
- `--provider-trusted-dir <path>` (可重複)
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

強化版 exec 提供者範例：

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

## 試執行 (Dry run)

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

- Builder 模式：對變更的 refs/providers 執行 SecretRef 可解析性檢查。
- JSON 模式 (`--strict-json`、`--json` 或批次模式)：執行結構描述驗證以及 SecretRef 可解析性檢查。
- 在試執行期間，Exec SecretRef 檢查預設會被跳過，以避免指令副作用。
- 使用 `--allow-exec` 搭配 `--dry-run` 以選擇加入 Exec SecretRef 檢查 (這可能會執行提供者指令)。
- `--allow-exec` 僅適用於試執行，若未與 `--dry-run` 搭配使用則會報錯。

`--dry-run --json` 列印機器可讀報告：

- `ok`：乾執行是否通過
- `operations`：已評估的指派數量
- `checks`：是否執行了結構描述/可解析性檢查
- `checks.resolvabilityComplete`：可解析性檢查是否執行完畢（跳過 exec refs 時為 false）
- `refsChecked`：乾執行期間實際解析的 refs 數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時的結構化結構描述/可解析性失敗資訊

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

如果乾執行失敗：

- `config schema validation failed`：您變更後的配置結構無效；請修正路徑/數值或 provider/ref 物件結構。
- `SecretRef assignment(s) could not be resolved`：引用的提供者/參照目前無法解析（缺少環境變數、無效的檔案指標、執行提供者失敗，或提供者/來源不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行跳過了執行參照；如果您需要執行解析能力的驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請修正失敗的項目並在寫入之前重新執行 `--dry-run`。

## 子指令

- `config file`：列印作用中的組態檔案路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。

編輯後重新啟動閘道。

## 驗證

針對作用中的架構驗證目前的組態，而無須啟動
閘道。

```bash
openclaw config validate
openclaw config validate --json
```
