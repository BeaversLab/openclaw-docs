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

政策說明：

- 在不受支援的執行時可變介面上（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 執行緒綁定 webhook 權杖以及 WhatsApp 憑證 JSON），會拒絕 SecretRef 指定。請參閱 [SecretRef Credential Surface](/en/reference/secretref-credential-surface)。

批次解析始終使用批次載荷（`--batch-json`/`--batch-file`）作為事實來源。
`--strict-json` / `--json` 不會改變批次解析行為。

JSON 路徑/數值模式仍然同時支援 SecretRef 和提供者：

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
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Env 提供者 (`--provider-source env`)：

- `--provider-allowlist <ENV_VAR>` (可重複)

檔案提供者 (`--provider-source file`)：

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

## 試執行

使用 `--dry-run` 來驗證變更而不寫入 `openclaw.json`。

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

- 建構器模式：針對變更過的 refs/providers 執行 SecretRef 可解析性檢查。
- JSON 模式（`--strict-json`、`--json` 或批次模式）：執行 schema 驗證以及 SecretRef 可解析性檢查。
- 政策驗證也會針對已知不支援的 SecretRef 目標介面執行。
- 原則檢查會評估完整的變更後配置，因此父物件寫入（例如將 `hooks` 設定為物件）無法繞過不支援介面的驗證。
- 為了避免指令的副作用，試執行期間預設會跳過 Exec SecretRef 檢查。
- 使用 `--allow-exec` 搭配 `--dry-run` 以選擇加入 exec SecretRef 檢查（這可能會執行提供者指令）。
- `--allow-exec` 僅適用於試執行，若未搭配 `--dry-run` 使用則會報錯。

`--dry-run --json` 會列印機器可讀的報告：

- `ok`：試執行是否通過
- `operations`：已評估的指派數量
- `checks`：是否執行了架構/可解析性檢查
- `checks.resolvabilityComplete`：可解析性檢查是否執行至完成（當跳過 exec refs 時為 false）
- `refsChecked`：試執行期間實際解析的 refs 數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時的結構化架構/可解析性失敗

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

如果試執行失敗：

- `config schema validation failed`：您的變更後配置結構無效；請修正路徑/數值或提供者/ref 物件結構。
- `Config policy validation failed: unsupported SecretRef usage`：將該憑證移回純文字/字串輸入，並僅在不支援的介面上保留 SecretRefs。
- `SecretRef assignment(s) could not be resolved`：參照的提供者/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec 提供者失敗，或提供者/來源不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行跳過了 exec refs；如果您需要 exec 可解析性驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請修正失敗的項目，並在寫入前重新執行 `--dry-run`。

## 子指令

- `config file`：列印作用中的配置檔案路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。

編輯後請重新啟動閘道。

## 驗證

根據作用中的架構驗證目前的配置，而不啟動閘道。

```bash
openclaw config validate
openclaw config validate --json
```
