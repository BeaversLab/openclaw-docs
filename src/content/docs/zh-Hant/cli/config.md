---
summary: "CLI 參考，用於 `openclaw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

用於在 `openclaw.json` 中進行非互動式編輯的 Config 輔助工具：透過路徑 get/set/unset/validate
數值並列印 active config 檔案。在不加 subcommand 的情況下執行以
開啟 configure wizard (與 `openclaw configure` 相同)。

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

路徑使用點號或方括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用 agent 清單索引來指定特定的 agent：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 數值

數值會盡可能解析為 JSON5，否則將被視為字串。
使用 `--strict-json` 以強制使用 JSON5 解析。`--json` 作為舊版別名仍受支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

## `config set` 模式

`openclaw config set` 支援四種賦值風格：

1. 數值模式： `openclaw config set <path> <value>`
2. SecretRef 建構器模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. Provider 建構器模式 (僅限 `secrets.providers.<alias>` 路徑)：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. 批次模式 (`--batch-json` 或 `--batch-file`)：

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

批次解析始終使用批次 payload (`--batch-json`/`--batch-file`) 作為事實來源。
`--strict-json` / `--json` 不會改變批次解析行為。

SecretRefs 和 providers 仍支援 JSON 路徑/數值模式：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Provider 建構器旗標

Provider 建構器目標必須使用 `secrets.providers.<alias>` 作為路徑。

通用旗標：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>` (`file`, `exec`)

Env provider (`--provider-source env`)：

- `--provider-allowlist <ENV_VAR>` (可重複)

File provider (`--provider-source file`)：

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

強化執行提供者範例：

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

## 試運行

使用 `--dry-run` 驗證變更而不寫入 `openclaw.json`。

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

試運行行為：

- Builder 模式：對變更的 refs/providers 執行 SecretRef 解析性檢查。
- JSON 模式 (`--strict-json`、`--json` 或批次模式)：執行結構描述驗證以及 SecretRef 解析性檢查。
- 試運行期間預設會跳過 Exec SecretRef 檢查，以避免指令副作用。
- 使用 `--allow-exec` 搭配 `--dry-run` 以選擇加入 Exec SecretRef 檢查 (這可能會執行提供者指令)。
- `--allow-exec` 僅適用於試運行，若未搭配 `--dry-run` 使用則會報錯。

`--dry-run --json` 會列印機器可讀的報告：

- `ok`：試運行是否通過
- `operations`：已評估的指派數量
- `checks`：是否執行了結構描述/解析性檢查
- `checks.resolvabilityComplete`：解析性檢查是否執行至完成 (跳過 exec refs 時為 false)
- `refsChecked`：試運行期間實際解析的 refs 數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時的結構化結構描述/解析性失敗

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

如果試運行失敗：

- `config schema validation failed`：您變更後的 config 結構無效；請修正路徑/數值或提供者/ref 物件結構。
- `SecretRef assignment(s) could not be resolved`：參照的提供者/ref 目前無法解析 (缺少環境變數、無效的檔案指標、exec 提供者失敗或提供者/來源不符)。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試運行跳過了 exec refs；如果您需要 exec 解析性驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請在寫入前修正失敗的項目並重新執行 `--dry-run`。

## 子指令

- `config file`：列印作用中的設定檔路徑（解析自 `OPENCLAW_CONFIG_PATH` 或預設位置）。

編輯後請重新啟動閘道。

## 驗證

在不啟動閘道的情況下，根據作用中的架構驗證目前的設定。

```bash
openclaw config validate
openclaw config validate --json
```
