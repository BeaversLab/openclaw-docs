---
summary: "`openclaw config` (get/set/unset/file/schema/validate) 的 CLI 參考"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

`openclaw.json` 中用於非互動式編輯的配置輔助工具：get/set/unset/file/schema/validate
透過路徑設定值並列印使用中的配置檔案。在不使用子指令的情況下執行以
開啟配置精靈（與 `openclaw configure` 相同）。

根選項：

- `--section <section>`：當您在不使用子指令的情況下執行 `openclaw config` 時，可重複的引導式設定區段過濾器

支援的引導式區段：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## 範例

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

將 `openclaw.json` 生成的 JSON 結構描述以 JSON 格式列印至標準輸出。

包含內容：

- 目前的根配置結構描述，加上一個用於編輯器工具的根 `$schema` 字串欄位
- Control UI 使用的欄位 `title` 與 `description` 文件元資料
- 當存在相符的欄位文件時，巢狀物件、萬用字元 (`*`) 與陣列項目 (`[]`) 節點會繼承相同的 `title` / `description` 元資料
- 當存在相符的欄位文件時，`anyOf` / `oneOf` / `allOf` 分支也會繼承相同的文件元資料
- 當可以載入執行期清單時，會盡力包含即時外掛程式 + 頻道結構描述元資料
- 即使當前配置無效，也能提供乾淨的後備結構描述

相關執行期 RPC：

- `config.schema.lookup` 會回傳一個標準化的配置路徑，其中包含淺層
  結構描述節點 (`title`、`description`、`type`、`enum`、`const`、通用邊界)、
  相符的 UI 提示元資料以及直接的子項摘要。將其用於
  Control UI 或自訂客戶端中的路徑範圍向下鑽取。

```bash
openclaw config schema
```

當您想使用其他工具檢查或驗證它時，將其透過管道傳輸至檔案：

```bash
openclaw config schema > openclaw.schema.json
```

### 路徑

路徑使用點號或括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理程式清單索引來指定特定的代理程式：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 數值

值在可能的情況下會被解析為 JSON5，否則會被視為字串。
使用 `--strict-json` 來要求 JSON5 解析。`--json` 作為舊版別名仍然受支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 會將原始值以 JSON 格式列印，而不是終端機格式化的文字。

## `config set` 模式

`openclaw config set` 支援四種賦值風格：

1. 數值模式：`openclaw config set <path> <value>`
2. SecretRef 建構器模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. 提供者建構器模式 (僅限 `secrets.providers.<alias>` 路徑)：

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

策略說明：

- 不支援的執行時可變動介面會拒絕 SecretRef 賦值（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 執行緒綁定 webhook 權杖，以及 WhatsApp 憑證 JSON）。請參閱 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

批次解析始終使用批次載荷 (`--batch-json`/`--batch-file`) 作為真實來源。
`--strict-json` / `--json` 不會改變批次解析行為。

JSON 路徑/值模式仍支援用於 SecretRef 和提供者：

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
- `--provider-timeout-ms <ms>` (`file`、`exec`)

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

試運行行為：

- Builder 模式：對變更的 refs/providers 執行 SecretRef 可解析性檢查。
- JSON 模式（`--strict-json`、`--json` 或批次模式）：執行架構驗證以及 SecretRef 可解析性檢查。
- 對於已知不支援的 SecretRef 目標介面，也會執行原則驗證。
- 原則檢查會評估完整的變更後設定，因此父物件寫入（例如將 `hooks` 設定為物件）無法繞過不支援介面的驗證。
- 為了避免指令副作用，預設會在試運行期間跳過 Exec SecretRef 檢查。
- 搭配 `--dry-run` 使用 `--allow-exec` 以選擇加入 exec SecretRef 檢查（這可能會執行提供者指令）。
- `--allow-exec` 僅用於試執行，若未搭配 `--dry-run` 使用會報錯。

`--dry-run --json` 會列印機器可讀的報告：

- `ok`：試執行是否通過
- `operations`：評估的賦值數量
- `checks`：是否執行了架構/可解析性檢查
- `checks.resolvabilityComplete`：可解析性檢查是否執行至完成（當跳過 exec refs 時為 false）
- `refsChecked`：試執行期間實際解析的 refs 數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時的結構化架構/可解析性失敗資訊

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

- `config schema validation failed`：您的變更後設定形狀無效；請修正路徑/數值或提供者/ref 物件形狀。
- `Config policy validation failed: unsupported SecretRef usage`：將該憑證移回純文字/字串輸入，並僅在支援的介面上保留 SecretRefs。
- `SecretRef assignment(s) could not be resolved`：參照的提供者/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec 提供者失敗，或提供者/來源不符）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行跳過了 exec refs；如果您需要 exec 可解析性驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請修正失敗的項目並在寫入前重新執行 `--dry-run`。

## 寫入安全性

`openclaw config set` 和其他 OpenClaw 擁有的配置寫入器會在將變更提交到磁碟之前，驗證完整的變更後配置。如果新負載通過了架構驗證或看起來像是破壞性的覆寫，現有的配置將保持不變，被拒絕的負載將會以 `openclaw.json.rejected.*` 的形式儲存在其旁邊。

針對小幅編輯，建議優先使用 CLI 寫入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果寫入被拒絕，請檢查已儲存的負載並修復完整的配置形狀：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允許直接透過編輯器寫入，但在驗證之前，執行中的 Gateway 會將其視為不受信任。無效的直接編輯可以在啟動或熱重載期間，從最後一次已知良好的備份還原。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)。

## 子命令

- `config file`：列印現有的配置檔案路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。

編輯後請重新啟動 gateway。

## 驗證

根據現有架構驗證當前配置，而不啟動 gateway。

```bash
openclaw config validate
openclaw config validate --json
```
