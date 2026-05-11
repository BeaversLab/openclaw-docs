---
summary: "`openclaw config` (get/set/unset/file/schema/validate) 的 CLI 參考"
read_when:
  - You want to read or edit config non-interactively
title: "組態"
sidebarTitle: "組態"
---

在 `openclaw.json` 中進行非互動式編輯的組態輔助工具：依照路徑 get/set/unset/file/schema/validate 數值，並列印使用中的組態檔。若不加上子指令執行則會開啟設定精靈 (與 `openclaw configure` 相同)。

## 根選項

<ParamField path="--section <section>" type="string">
  當您不帶子指令執行 `openclaw config` 時，可重複的引導式設定區段過濾器。
</ParamField>

支援的引導區段：`workspace`、`model`、`web`、`gateway`、`daemon`、`channels`、`plugins`、`skills`、`health`。

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
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

將 `openclaw.json` 產生的 JSON 結構描述以 JSON 格式列印至標準輸出。

<AccordionGroup>
  <Accordion title="包含內容">
    - 目前的根組態結構描述，加上一個供編輯器工具使用的根 `$schema` 字串欄位。 - Control UI 使用的欄位 `title` 和 `description` 文件中繼資料。 - 當存在相符的欄位文件時，巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 節點會繼承相同的 `title` / `description` 中繼資料。 - 當存在相符的欄位文件時，`anyOf` / `oneOf` / `allOf` 分支也會繼承相同的文件中繼資料。 - 當可以載入執行時期清單時，會盡力提供即時外掛 +
    頻道結構描述中繼資料。 - 即使目前的組態無效，也會提供乾淨的後備結構描述。
  </Accordion>
  <Accordion title="相關執行時期 RPC">`config.schema.lookup` 會回傳一個標準化的設定路徑，並包含淺層架構節點（`title`、`description`、`type`、`enum`、`const`、common bounds）、匹配的 UI 提示元資料，以及直接的子項摘要。將其用於 Control UI 或客戶端中的路徑範圍下鑽。</Accordion>
</AccordionGroup>

```bash
openclaw config schema
```

當您想要使用其他工具檢查或驗證它時，將其透過管線傳輸到檔案：

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

數值會盡可能解析為 JSON5，否則會被視為字串。使用 `--strict-json` 強制要求 JSON5 解析。`--json` 作為舊版別名仍受支援。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 會將原始值以 JSON 格式印出，而不是終端機格式化的文字。

<Note>
物件指派預設會替換目標路徑。通常保存使用者新增項目的受保護 map/list 路徑（例如 `agents.defaults.models`、`models.providers`、`models.providers.<id>.models`、`plugins.entries` 和 `auth.profiles`），除非您傳遞 `--replace`，否則會拒絕會移除現有項目的替換操作。
</Note>

當新增項目至這些 map 時，請使用 `--merge`：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
openclaw config set models.providers.ollama.models '[{"id":"llama3.2","name":"Llama 3.2"}]' --strict-json --merge
```

僅在您刻意希望提供的數值成為完整目標數值時，才使用 `--replace`。

## `config set` 模式

`openclaw config set` 支援四種指派樣式：

<Tabs>
  <Tab title="數值模式">
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
  <Tab title="提供者建構器模式">
    提供者建構器模式僅針對 `secrets.providers.<alias>` 路徑：

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

<Warning>在不支援的執行時可變表面（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 執行緒綁定 webhook 權杖和 WhatsApp 憑證 JSON）上，會拒絕 SecretRef 指派。請參閱 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。</Warning>

批次解析始終使用批次承載 (`--batch-json`/`--batch-file`) 作為事實來源。`--strict-json` / `--json` 不會改變批次解析行為。

JSON 路徑/值模式仍支援 SecretRef 和提供者：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## 提供者建構器標誌

提供者建構器目標必須使用 `secrets.providers.<alias>` 作為路徑。

<AccordionGroup>
  <Accordion title="通用標誌">
    - `--provider-source <env|file|exec>`
    - `--provider-timeout-ms <ms>` (`file`, `exec`)
  </Accordion>
  <Accordion title="Env 提供者 (--provider-source env)">
    - `--provider-allowlist <ENV_VAR>` (可重複)
  </Accordion>
  <Accordion title="File 提供者 (--provider-source file)">
    - `--provider-path <path>` (必要)
    - `--provider-mode <singleValue|json>`
    - `--provider-max-bytes <bytes>`
    - `--provider-allow-insecure-path`
  </Accordion>
  <Accordion title="Exec 提供者 (--provider-source exec)">
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
  </Accordion>
</AccordionGroup>

強化 exec 提供者範例：

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

<AccordionGroup>
  <Accordion title="Dry-run 行為">
    - Builder 模式：針對變更的 refs/providers 執行 SecretRef 可解析性檢查。
    - JSON 模式（`--strict-json`、`--json` 或批次模式）：執行 Schema 驗證以及 SecretRef 可解析性檢查。
    - 針對已知不支援的 SecretRef 目標介面，也會執行原則驗證。
    - 原則檢查會評估完整的變更後配置，因此父物件寫入（例如將 `hooks` 設為物件）無法繞過不支援介面的驗證。
    - 為避免指令副作用，預設會在試算期間跳過 Exec SecretRef 檢查。
    - 使用 `--allow-exec` 搭配 `--dry-run` 以選用 Exec SecretRef 檢查（這可能會執行 provider 指令）。
    - `--allow-exec` 僅適用於試算，若未搭配 `--dry-run` 使用則會報錯。
  </Accordion>
  <Accordion title="--dry-run -- 欄位">
    `--dry-run --json` 會列印機器可讀的報告：

    - `ok`：試算是否通過
    - `operations`：評估的指派數量
    - `checks`：是否執行了 Schema/可解析性檢查
    - `checks.resolvabilityComplete`：可解析性檢查是否執行至完成（當跳過 exec refs 時為 false）
    - `refsChecked`：試算期間實際解析的 refs 數量
    - `skippedExecRefs`：因未設定 `--allow-exec` 而跳過的 exec refs 數量
    - `errors`：當 `ok=false` 時的結構化 Schema/可解析性失敗資訊

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
    - `config schema validation failed`：您變更後的配置結構無效；請修正路徑/值或 provider/ref 物件結構。
    - `Config policy validation failed: unsupported SecretRef usage`：將該憑證移回純文字/字串輸入，並僅在支援的介面上保留 SecretRefs。
    - `SecretRef assignment(s) could not be resolved`：引用的 provider/ref 目前無法解析（缺少環境變數、無效的檔案指標、exec provider 失敗，或 provider/source 不匹配）。
    - `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：試執行跳過 exec refs；如果您需要 exec 解析驗證，請使用 `--allow-exec` 重新執行。
    - 針對批次模式，請修正失敗的項目並在寫入前重新執行 `--dry-run`。
  </Accordion>
</AccordionGroup>

## 寫入安全

`openclaw config set` 和其他 OpenClaw 擁有的配置寫入器會在將變更後的完整配置提交到磁碟之前進行驗證。如果新的內容通過驗證失敗或看起來像是破壞性的覆蓋，現有的配置將保持不變，而被拒絕的內容會以 `openclaw.json.rejected.*` 的形式儲存在其旁邊。

<Warning>現有的配置路徑必須是一般檔案。不支援寫入符號連結的 `openclaw.json` 版面配置；請使用 `OPENCLAW_CONFIG_PATH` 直接指向真實檔案。</Warning>

針對小幅編輯，建議優先使用 CLI 寫入：

```bash
openclaw config set gateway.reload.mode hybrid --dry-run
openclaw config set gateway.reload.mode hybrid
openclaw config validate
```

如果寫入被拒絕，請檢查儲存的內容並修正完整的配置結構：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".rejected.* 2>/dev/null | head
openclaw config validate
```

仍然允許直接編輯器寫入，但在驗證通過之前，執行中的 Gateway 會將其視為不受信任。在啟動或熱重新載入期間，無效的直接編輯可以從最近已知良好的備份中還原。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)。

全檔案恢復僅保留給全域性損壞的配置，例如解析錯誤、根層級 schema 失敗、舊版遷移失敗，或混合的外掛程式與根層級失敗。如果驗證僅在 `plugins.entries.<id>...` 下失敗，OpenClaw 會保留現有的 `openclaw.json` 並報告外掛程式本地的問題，而不是還原 `.last-good`。這可以防止外掛程式 schema 變更或 `minHostVersion` 偏差導致不相關的使用者設定（例如模型、提供者、認證設定檔、通道、閘道暴露、工具、記憶體、瀏覽器或 cron 配置）被回滾。

## 子指令

- `config file`：列印現有配置檔案路徑（從 `OPENCLAW_CONFIG_PATH` 或預設位置解析）。該路徑應為常規檔案，而不是符號連結。

編輯後重新啟動閘道。

## 驗證

根據現有 schema 驗證當前配置，而不啟動閘道。

```bash
openclaw config validate
openclaw config validate --json
```

在 `openclaw config validate` 通過後，您可以使用本機 TUI 讓嵌入式代理程式在您從同一終端機驗證每個變更時，比較現有配置與文件：

<Note>如果驗證已經失敗，請從 `openclaw configure` 或 `openclaw doctor --fix` 開始。`openclaw chat` 不會繞過無效配置的防護機制。</Note>

```bash
openclaw chat
```

然後在 TUI 內：

```text
!openclaw config file
!openclaw docs gateway auth token secretref
!openclaw config validate
!openclaw doctor
```

典型的修復循環：

<Steps>
  <Step title="與文件比較">要求代理程式將您目前的配置與相關文件頁面進行比較，並建議最小的修復方案。</Step>
  <Step title="套用目標編輯">使用 `openclaw config set` 或 `openclaw configure` 套用目標編輯。</Step>
  <Step title="重新驗證">每次變更後重新執行 `openclaw config validate`。</Step>
  <Step title="針對執行時問題使用診斷程式">如果驗證通過但執行時仍不正常，請執行 `openclaw doctor` 或 `openclaw doctor --fix` 以取得遷移和修復協助。</Step>
</Steps>

## 相關

- [CLI 參考](/zh-Hant/cli)
- [設定](/zh-Hant/gateway/configuration)
