---
summary: "CLI 參考指南 `openclaw config` (get/set/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `openclaw config`

用於在 `openclaw.json` 中進行非互動式編輯的 Config 輔助工具：get/set/unset/file/schema/validate
按路徑取得值並列印使用中的設定檔。不使用子指令執行以
開啟設定精靈（與 `openclaw configure` 相同）。

根選項：

- `--section <section>`：當您不使用子指令執行 `openclaw config` 時，可重複的引導式設定區段篩選器

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
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
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

- 目前的根設定結構描述，加上一個用於編輯器工具的根 `$schema` 字串欄位
- Control UI 使用的欄位 `title` 和 `description` 文件元數據
- 巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 節點會在存在相符欄位文件時繼承相同的 `title` / `description` 元數據
- `anyOf` / `oneOf` / `allOf` 分支也會在存在相符欄位文件時繼承相同的文件元數據
- 當可以載入執行期清單時，會盡力包含即時外掛程式 + 頻道結構描述元資料
- 即使當前配置無效，也能提供乾淨的後備結構描述

相關執行期 RPC：

- `config.schema.lookup` 會傳回一個帶有淺層結構描述節點
  (`title`, `description`, `type`, `enum`, `const`, common bounds) 的標準化設定路徑、
  相符的 UI 提示元數據以及直接子項摘要。請在 Control UI 或自訂客戶端中使用它
  進行路徑範圍的向下鑽取。

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

值會盡可能解析為 JSON5，否則會視為字串。使用 `--strict-json` 要求進行 JSON5 解析。`--json` 作為舊版別名仍受支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 會將原始值列印為 JSON，而不是終端機格式化的文字。

物件指定預設會取代目標路徑。受保護的 map/list 路徑通常包含使用者新增的項目，例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`，它們會拒絕會移除現有項目的取代操作，除非您傳遞 `--replace`。

將項目新增至這些 map 時，請使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

僅當您有意讓提供的值成為完整的目標值時，才使用 `--replace`。

## `config set` 模式

`openclaw config set` 支援四種指定樣式：

1. 值模式： `openclaw config set <path> <value>`
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

策略備註：

- 在不支援的執行階段可變介面上會拒絕 SecretRef 指定 (例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 執行緒綁定 webhook 權杖以及 WhatsApp 憑證 JSON)。請參閱 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

批次解析始終使用批次載荷 (`--batch-json`/`--batch-file`) 作為真實來源。`--strict-json` / `--json` 不會變更批次解析行為。

JSON 路徑/值模式仍受 SecretRefs 和提供者支援：

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

執行提供者 (`--provider-source exec`)：

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

加固執行提供者範例：

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

- 建構器模式：針對變更的參照/提供者執行 SecretRef 可解析性檢查。
- JSON 模式 (`--strict-json`、`--json` 或批次模式)：執行結構描述驗證以及 SecretRef 可解析性檢查。
- 針對已知不支援的 SecretRef 目標介面，也會執行原則驗證。
- 原則檢查會評估完整的變更後配置，因此父物件寫入 (例如將 `hooks` 設定為物件) 無法規避不支援介面的驗證。
- 試執行期間預設會跳過 Exec SecretRef 檢查，以避免指令的副作用。
- 使用 `--allow-exec` 搭配 `--dry-run` 以選擇加入 exec SecretRef 檢查 (這可能會執行提供者指令)。
- `--allow-exec` 僅供試執行使用，若未搭配 `--dry-run` 使用則會報錯。

`--dry-run --json` 會列印機器可讀的報告：

- `ok`：試執行是否通過
- `operations`：評估的指派數量
- `checks`：是否執行了結構描述/可解析性檢查
- `checks.resolvabilityComplete`：可解析性檢查是否執行至完成 (當跳過 exec 參照時為 false)
- `refsChecked`：試執行期間實際解析的參照數量
- `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
- `errors`：當 `ok=false` 時發生的結構化 schema/可解析性失敗

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

- `config schema validation failed`：您變更後的 config 結構無效；請修正路徑/數值或 provider/ref 物件結構。
- `Config policy validation failed: unsupported SecretRef usage`：將該憑證移回純文字/字串輸入，並僅在支援的介面上保留 SecretRefs。
- `SecretRef assignment(s) could not be resolved`：參考的 provider/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec provider 失敗，或 provider/source 不相符）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行跳過了 exec refs；如果您需要 exec 可解析性驗證，請使用 `--allow-exec` 重新執行。
- 對於批次模式，請修正失敗的項目並在寫入前重新執行 `--dry-run`。

## 寫入安全性

`openclaw config set` 和其他 OpenClaw 擁有的 config 寫入器會在將變更後的完整 config 提交到磁碟前進行驗證。如果新內容失敗於 schema 驗證或看起來像是破壞性的覆寫，現有的 config 將保持不變，而被拒絕的內容會儲存為 `openclaw.json.rejected.*`。
有效的 config 路徑必須是常規檔案。不支援對符號連結的 `openclaw.json`
配置進行寫入；請改用 `OPENCLAW_CONFIG_PATH` 直接指向真實檔案。

建議使用 CLI 進行小幅編輯：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果寫入被拒絕，請檢查儲存的有效內容並修正完整的 config 結構：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允許直接透過編輯器寫入，但執行中的 Gateway 在驗證之前會將其視為不受信任。無效的直接編輯可以在啟動或熱重新載入期間從最後已知良好的備份還原。請參閱
[Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)。

## 子指令

- `config file`：列印有效的 config 檔案路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。該路徑應指向常規檔案，而非符號連結。

編輯後請重新啟動 gateway。

## Validate

根據有效的 schema 驗證目前的 config，而不啟動
gateway。

```bash
openclaw config validate
openclaw config validate --json
```

當 `openclaw config validate` 通過後，您可以使用本機 TUI 讓嵌入式代理將目前配置與文件進行比較，同時您在同一終端機中驗證每個變更：

如果驗證已經失敗，請從 `openclaw configure` 或 `openclaw doctor --fix` 開始。`openclaw chat` 不會略過無效配置的防護。

```bash
openclaw chat
```

然後在 TUI 中：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

典型的修復循環：

- 要求代理將您目前的配置與相關的文件頁面進行比較，並建議最小的修正。
- 使用 `openclaw config set` 或 `openclaw configure` 套用目標編輯。
- 在每次變更後重新執行 `openclaw config validate`。
- 如果驗證通過但運行時仍然不健康，請執行 `openclaw doctor` 或 `openclaw doctor --fix` 以取得遷移和修復的協助。
