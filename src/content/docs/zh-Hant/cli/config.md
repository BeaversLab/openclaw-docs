---
summary: "CLI 參考資料用於 `openclaw config` (get/set/patch/unset/file/schema/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "Config"
sidebarTitle: "Config"
---

Config 工具程式用於在 `openclaw.json` 中進行非互動式編輯：透過路徑 get/set/patch/unset/file/schema/validate 值並列印使用中的設定檔。不使用子命令執行以開啟設定精靈（與 `openclaw configure` 相同）。

<Note>
當 `OPENCLAW_NIX_MODE=1` 時，OpenClaw 會將 `openclaw.json` 視為不可變。唯讀指令如 `config get`、`config file`、`config schema` 和 `config validate` 仍然有效，但設定寫入程式會拒絕執行。Agent 應改為編輯安裝的 Nix 原始碼；對於第一方 nix-openclaw 發行版本，請使用 [nix-openclaw 快速入門](https://github.com/openclaw/nix-openclaw#quick-start) 並在 `programs.openclaw.config` 或 `instances.<name>.config` 下列設定值。
</Note>

## Root options

<ParamField path="--section <section>" type="string">
  當您不使用子指令執行 `openclaw config` 時，可重複使用的引導式設定區段過濾器。
</ParamField>

支援的引導式區段：`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`。

## 範例

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
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

將 `openclaw.json` 產生的 JSON 結構描述以 JSON 格式列印至標準輸出。

<AccordionGroup>
  <Accordion title="包含內容">
    - 當前的根配置 schema，以及一個用於編輯器工具的根 `$schema` 字串欄位。
    - Control UI 使用的欄位 `title` 和 `description` 文檔元數據。
    - 當存在匹配的欄位文檔時，嵌套物件、萬用字元 (`*`) 和陣列項 (`[]`) 節點會繼承相同的 `title` / `description` 元數據。
    - 當存在匹配的欄位文檔時，`anyOf` / `oneOf` / `allOf` 分支也會繼承相同的文檔元數據。
    - 當可以載入運行時清單 時，盡力提供即時外掛 + 頻道 schema 元數據。
    - 即使當前配置無效，也提供一個乾淨的後備 schema。

  </Accordion>
  <Accordion title="相關運行時 RPC">
    `config.schema.lookup` 會傳回一個標準化的配置路徑，其中包含淺層 schema 節點 (`title`, `description`, `type`, `enum`, `const`, 通用邊界)、匹配的 UI 提示元數據以及直接子項摘要。請將其用於 Control UI 或自訂客戶端中的路徑範圍向下鑽取。
  </Accordion>
</AccordionGroup>

```bash
openclaw config schema
```

當您想要使用其他工具檢查或驗證它時，請將其透過管道輸出到檔案：

```bash
openclaw config schema > openclaw.schema.json
```

### 路徑

路徑使用點號或括號表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用代理程式清單索引來鎖定特定的代理程式：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 數值

數值會盡可能解析為 JSON5；否則將其視為字串。使用 `--strict-json` 來強制執行 JSON5 解析。`--json` 作為舊版別名仍受到支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 會以 JSON 格式列印原始數值，而不是終端機格式的文字。

<Note>
物件指派預設會取代目標路徑。通常包含使用者新增項目的受保護 map/list 路徑，例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`，會拒絕會移除現有項目的取代操作，除非您傳遞 `--replace`。
</Note>

當將項目新增至這些 maps 時，請使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

僅當您刻意希望提供的值成為完整的目標值時，才使用 `--replace`。

## `config set` 模式

`openclaw config set` 支援四種指派樣式：

<Tabs>
  <Tab title="值模式">
    ```bash
    openclaw config set <path> <value>
    ```
  </Tab>
  <Tab title="SecretRef 建構器模式">
    ```bash
    openclaw config set channels.discord.token \
      --ref-provider default \
      --ref-source env \
      --ref-id DISCORD_BOT_TOKEN
    ```
  </Tab>
  <Tab title="Provider 建構器模式">
    Provider 建構器模式僅針對 `secrets.providers.<alias>` 路徑：

    ```bash
    openclaw config set secrets.providers.vault \
      --provider-source exec \
      --provider-command /usr/local/bin/openclaw-vault \
      --provider-arg read \
      --provider-arg openai/api-key \
      --provider-timeout-ms 5000
    ```

  </Tab>
  <Tab title="批次模式">
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

<Warning>在不支援的執行時可變介面上會拒絕 SecretRef 指派（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 執行緒綁定 webhook 權杖以及 WhatsApp creds JSON）。請參閱 [SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)。</Warning>

批次剖析總是使用批次載荷 (`--batch-json`/`--batch-file`) 作為事實來源。`--strict-json` / `--json` 不會改變批次剖析行為。

## `config patch`

當您想要貼上或透過管道傳送一個 config-shaped patch，而不是執行許多基於路徑的 `config set` 指令時，請使用 `config patch`。輸入是 JSON5 物件。物件會遞迴合併，陣列和純量值會取代目標值，而 `null` 會刪除目標路徑。

```bash
openclaw config patch --file ./openclaw.patch.json5 --dry-run
openclaw config patch --file ./openclaw.patch.json5
```

您也可以透過 stdin 傳送一個 patch，這對於遠端設定腳本很有用：

```bash
ssh openclaw-host 'openclaw config patch --stdin --dry-run' < ./openclaw.patch.json5
ssh openclaw-host 'openclaw config patch --stdin' < ./openclaw.patch.json5
```

Patch 範例：

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

當某個物件或陣列必須完全變為提供的值，而不是進行遞迴 patch 時，請使用 `--replace-path <path>`：

```bash
openclaw config patch --file ./discord.patch.json5 --replace-path 'channels.discord.guilds["123"].channels'
```

`--dry-run` 會執行 schema 和 SecretRef 可解析性檢查而不進行寫入。Exec 支援的 SecretRef 在 dry-run 期間預設會被跳過；當您有意讓 dry-run 執行 provider 指令時，請加入 `--allow-exec`。

JSON 路徑/值模式對於 SecretRef 和 providers 仍然受到支援：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## Provider builder 旗標

Provider builder 目標必須使用 `secrets.providers.<alias>` 作為路徑。

<AccordionGroup>
  <Accordion title="常用旗標">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)

  </Accordion>
  <Accordion title="Env provider (--provider-source env)">
    - `--provider-allowlist <ENV_VAR>` (可重複)

  </Accordion>
  <Accordion title="File provider (--provider-source file)">
    - `--provider-path <path>` (必填)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`

  </Accordion>
  <Accordion title="Exec provider (--provider-source exec)">
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

  </Accordion>
</AccordionGroup>

強化版 exec provider 範例：

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

## Dry run

使用 `--dry-run` 在不寫入 `openclaw.json` 的情況下驗證變更。

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
  <Accordion title="試執行行為">
    - 建構器模式：針對變更的 refs/providers 執行 SecretRef 解析性檢查。
    - JSON 模式（`--strict-json`、`--json` 或批次模式）：執行結構描述驗證以及 SecretRef 解析性檢查。
    - 針對已知不支援的 SecretRef 目標介面，也會執行原則驗證。
    - 原則檢查會評估完整的變更後配置，因此父物件寫入（例如將 `hooks` 設定為物件）無法繞過不支援介面的驗證。
    - 為避免指令副作用，試執行期間預設會跳過 Exec SecretRef 檢查。
    - 使用搭配 `--dry-run` 的 `--allow-exec` 以選擇加入 Exec SecretRef 檢查（這可能會執行提供者指令）。
    - `--allow-exec` 僅適用於試執行，若未搭配 `--dry-run` 使用則會報錯。

  </Accordion>
  <Accordion title="--dry-run -- 欄位">
    `--dry-run --json` 會列印機器可讀的報告：

    - `ok`：試執行是否通過
    - `operations`：已評估的指派數量
    - `checks`：是否執行了結構描述/解析性檢查
    - `checks.resolvabilityComplete`：解析性檢查是否執行至完成（當跳過 exec refs 時為 false）
    - `refsChecked`：試執行期間實際解析的 refs 數量
    - `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
    - `errors`：當 `ok=false` 時的結構化結構描述/解析性失敗訊息

  </Accordion>
</AccordionGroup>

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

<Tabs>
  <Tab title="成功範例">
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
  <Tab title="失敗範例">
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
    - `config schema validation failed`：您變更後的 config 結構無效；請修正路徑/數值或 provider/ref 物件結構。
    - `Config policy validation failed: unsupported SecretRef usage`：將該憑證移回純文字/字串輸入，並僅在支援的介面上保留 SecretRefs。
    - `SecretRef assignment(s) could not be resolved`：參照的 provider/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec provider 失敗，或 provider/source 不匹配）。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行已跳過 exec 參照；如果您需要 exec 可解析性驗證，請使用 `--allow-exec` 重新執行。
    - 針對批次模式，請修正失敗的項目，並在寫入前重新執行 `--dry-run`。

  </Accordion>
</AccordionGroup>

## 寫入安全性

`openclaw config set` 和其他 OpenClaw 擁有的 config 寫入器會在將變更後的完整 config 提交到磁碟前進行驗證。如果新負載未通過 schema 驗證或看起來像是破壞性的覆寫，現有的 config 將保持不變，被拒絕的負載會將其儲存為 `openclaw.json.rejected.*`。

<Warning>現用的 config 路徑必須是一般檔案。不支援對以符號連結連結的 `openclaw.json` 佈局進行寫入；請改用 `OPENCLAW_CONFIG_PATH` 直接指向真實檔案。</Warning>

針對小幅編輯，建議優先使用 CLI 寫入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果寫入被拒絕，請檢查已儲存的負載並修正完整的 config 結構：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允許直接透過編輯器寫入，但在驗證通過之前，執行中的 Gateway 會將其視為不受信任。無效的直接編輯會導致啟動失敗或被熱重新載入跳過；Gateway 不會重寫 `openclaw.json`。請執行 `openclaw doctor --fix` 以修復帶有前綴/被覆寫的 config 或還原上次已知良好的副本。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)。

全檔案回復是保留給 doctor 修復使用的。外掛 schema 變更或 `minHostVersion` 版本差異會保持警示狀態，而不是回滾不相關的使用者設定，例如模型、提供者、驗證設定檔、頻道、 gateway 公開設定、工具、記憶體、瀏覽器或 cron config。

## 子指令

- `config file`: 列印使用中的設定檔路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。該路徑應指向一個標準檔案，而非符號連結。

編輯後請重新啟動 gateway。

## 驗證

根據使用中的架構驗證目前的設定，而不啟動 gateway。

```bash
openclaw config validate
openclaw config validate --json
```

當 `openclaw config validate` 通過後，您可以使用本機 TUI 讓內嵌代理程式將使用中的設定與文件進行比較，並在您從同一個終端機驗證每個變更時：

<Note>如果驗證已經失敗，請從 `openclaw configure` 或 `openclaw doctor --fix` 開始。`openclaw chat` 不會繞過無效設定的防護機制。</Note>

```bash
openclaw chat
```

然後在 TUI 內部：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

典型的修復循環：

<Steps>
  <Step title="與文件比較">請求代理程式將您目前的設定與相關的文件頁面進行比較，並建議最小的修正方式。</Step>
  <Step title="套用目標編輯">使用 `openclaw config set` 或 `openclaw configure` 套用目標編輯。</Step>
  <Step title="重新驗證">每次變更後重新執行 `openclaw config validate`。</Step>
  <Step title="針對執行時問題使用 Doctor">如果驗證通過但執行時仍不健康，請執行 `openclaw doctor` 或 `openclaw doctor --fix` 以取得遷移和修復協助。</Step>
</Steps>

## 相關

- [CLI 參考](/zh-Hant/cli)
- [設定](/zh-Hant/gateway/configuration)
