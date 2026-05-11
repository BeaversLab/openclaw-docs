---
summary: "Models CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
sidebarTitle: "Models CLI"
---

<CardGroup cols={2}>
  <Card title="Model failover" href="/zh-Hant/concepts/model-failover">
    Auth profile 輪替、冷卻，以及其與備選機制的互動方式。
  </Card>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers">
    供應商快速概覽與範例。
  </Card>
  <Card title="Agent runtimes" href="/zh-Hant/concepts/agent-runtimes">
    PI、Codex 與其他 Agent loop 執行環境。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/config-agents#agent-defaults">
    模型配置鍵值。
  </Card>
</CardGroup>

Model refs 會選擇供應商與模型。通常不會選擇底層的 Agent runtime。舉例來說，`openai/gpt-5.5` 可以透過一般的 OpenAI 供應商路徑或透過 Codex app-server runtime 執行，視 `agents.defaults.agentRuntime.id` 而定。請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。

## 模型選擇機制

OpenClaw 依照以下順序選擇模型：

<Steps>
  <Step title="Primary model">`agents.defaults.model.primary` (或 `agents.defaults.model`)。</Step>
  <Step title="Fallbacks">`agents.defaults.model.fallbacks` (按順序)。</Step>
  <Step title="Provider auth failover">在移至下一個模型之前，Auth failover 會在供應商內部發生。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="相關模型介面">
    - `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄（加上別名）。 - `agents.defaults.imageModel` **僅當** 主要模型無法接受圖片時才會使用。 - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，該工具會回退到 `agents.defaults.imageModel`，然後是解析後的會話/預設模型。 - `agents.defaults.imageGenerationModel` 由共享的圖片生成功能使用。如果省略，`image_generate`
    仍然可以推斷出基於驗證的提供者預設值。它會先嘗試當前的預設提供者，然後按照提供者 ID 的順序嘗試剩餘的已註冊圖片生成提供者。如果您設定了特定的提供者/模型，請同時設定該提供者的驗證/API 金鑰。 - `agents.defaults.musicGenerationModel` 由共享的音樂生成功能使用。如果省略，`music_generate` 仍然可以推斷出基於驗證的提供者預設值。它會先嘗試當前的預設提供者，然後按照提供者 ID
    的順序嘗試剩餘的已註冊音樂生成提供者。如果您設定了特定的提供者/模型，請同時設定該提供者的驗證/API 金鑰。 - `agents.defaults.videoGenerationModel` 由共享的影片生成功能使用。如果省略，`video_generate` 仍然可以推斷出基於驗證的提供者預設值。它會先嘗試當前的預設提供者，然後按照提供者 ID 的順序嘗試剩餘的已註冊影片生成提供者。如果您設定了特定的提供者/模型，請同時設定該提供者的驗證/API 金鑰。 -
    每個代理的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（請參閱 [Multi-agent routing](/zh-Hant/concepts/multi-agent)）。
  </Accordion>
</AccordionGroup>

## 快速模型原則

- 將您的主要模型設定為您可用的最強最新世代模型。
- 針對對成本/延遲敏感的任務和低風險的聊天，使用後備模型。
- 對於啟用工具的代理或未受信任的輸入，請避免使用較舊/較弱的模型階層。

## 入門指引（推薦）

如果您不想手動編輯設定檔，請執行入門指引：

```bash
openclaw onboard
```

它可以為常見的提供商設定模型 + 身份驗證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 Claude CLI)。

## 配置金鑰 (概覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (允許清單 + 別名 + 提供商參數)
- `models.providers` (寫入 `models.json` 的自訂提供商)

<Note>
模型參照會正規化為小寫。像 `z.ai/*` 這樣的提供商別名會正規化為 `zai/*`。

提供商配置範例 (包括 OpenCode) 位於 [OpenCode](/zh-Hant/providers/opencode) 中。

</Note>

### 安全的允許清單編輯

手動更新 `agents.defaults.models` 時，請使用附加寫入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="覆蓋保護規則">
    `openclaw config set` 可保護模型/提供商對應免於意外覆蓋。當純物件指派給 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 時，如果會移除現有項目，該指派會被拒絕。請使用 `--merge` 進行附加變更；僅當提供的值應成為完整的目標值時，才使用 `--replace`。

    互動式提供商設定和 `openclaw configure --section model` 也會將提供商範圍的選取合併到現有的允許清單中，因此新增 Codex、Ollama 或其他提供商不會刪除不相關的模型項目。當重新套用提供商身分驗證時，Configure 會保留現有的 `agents.defaults.model.primary`。明確的預設設定指令，例如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>`，仍會取代 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## "不允許的模型" (以及回覆停止的原因)

如果設定了 `agents.defaults.models`，它將成為 `/model` 和會話覆蓋的 **允許清單**。當使用者選擇了一個不在該允許清單中的模型時，OpenClaw 會返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

<Warning>
這發生在產生正常回覆**之前**，因此訊息可能會讓人覺得它「沒有回應」。解決方法是：

- 將模型新增到 `agents.defaults.models`，或
- 清除允許清單（移除 `agents.defaults.models`），或
- 從 `/model list` 中選擇一個模型。
  </Warning>

允許清單設定範例：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-6" },
    models: {
      "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## 在聊天中切換模型 (`/model`)

您無需重新啟動即可為當前會話切換模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="選擇器行為">
    - `/model`（和 `/model list`）是一個緊湊的編號選擇器（模型系列 + 可用供應商）。
    - 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含供應商和模型下拉選單以及提交步驟。
    - `/models add` 已被棄用，現在會返回一個棄用訊息，而不是從聊天中註冊模型。
    - `/model <#>` 從該選擇器中進行選擇。
  </Accordion>
  <Accordion title="持久化和即時切換">
    - `/model` 會立即持久化新的會話選擇。
    - 如果代理程式處於閒置狀態，下一次運行將立即使用新模型。
    - 如果運行已經處於活動狀態，OpenClaw 會將即時切換標記為待處理，並且只在乾淨的重試點重新啟動到新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可能會保持排隊狀態，直到稍後的重試機會或下一個使用者輪次。
    - `/model status` 是詳細檢視（驗證候選者，以及在配置時，供應商端點 `baseUrl` + `api` 模式）。
  </Accordion>
  <Accordion title="Ref 解析">
    - Model refs 會通過在**第一個** `/` 處分割來進行解析。在鍵入 `/model <ref>` 時請使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 風格），則必須包含提供者前綴（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果您省略提供者，OpenClaw 將按以下順序解析輸入：
      1. 別名匹配
      2. 該確切無前綴模型 ID 的唯一已配置提供者匹配
      3. 已棄用的回退到已配置的預設提供者 — 如果該提供者不再公開已配置的預設模型，OpenClaw 將改為回退到第一個已配置的提供者/模型，以避免顯示過時的已移除提供者預設值。
  </Accordion>
</AccordionGroup>

完整的指令行為/配置：[Slash 指令](/zh-Hant/tools/slash-commands)。

## CLI 指令

```bash
openclaw models list
openclaw models status
openclaw models set <provider/model>
openclaw models set-image <provider/model>

openclaw models aliases list
openclaw models aliases add <alias> <provider/model>
openclaw models aliases remove <alias>

openclaw models fallbacks list
openclaw models fallbacks add <provider/model>
openclaw models fallbacks remove <provider/model>
openclaw models fallbacks clear

openclaw models image-fallbacks list
openclaw models image-fallbacks add <provider/model>
openclaw models image-fallbacks remove <provider/model>
openclaw models image-fallbacks clear
```

`openclaw models`（無子指令）是 `models status` 的捷徑。

### `models list`

預設顯示已配置的模型。實用的旗標：

<ParamField path="--all" type="boolean">
  完整目錄。包含在配置身份驗證之前由提供者擁有的打包靜態目錄行，以便僅供發現的視圖可以顯示在您新增匹配的提供者憑證之前不可用的模型。
</ParamField>
<ParamField path="--local" type="boolean">
  僅限本機提供者。
</ParamField>
<ParamField path="--provider <id>" type="string">
  依提供者 ID 過濾，例如 `moonshot`。不接受來自互動式選擇器的顯示標籤。
</ParamField>
<ParamField path="--plain" type="boolean">
  每行一個模型。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀輸出。
</ParamField>

### `models status`

顯示解析後的主要模型、回退、圖像模型以及已配置提供者的身份驗證概覽。它還會顯示在身分存儲中找到的設定檔的 OAuth 過期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印解析後的主要模型。

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - OAuth 狀態會始終顯示（並包含在 `--json` 輸出中）。如果配置的提供者沒有憑證，`models status` 會列印 **Missing auth** 區段。
    - JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`（每個提供者的有效認證，包括 env 支援的憑證）。`auth.oauth` 僅反映 auth-store 設定檔的健康狀況；僅使用 env 的提供者不會出現在那裡。
    - 使用 `--check` 進行自動化（當缺少/過期時退出 `1`，即將過期時退出 `2`）。
    - 使用 `--probe` 進行即時認證檢查；探測行可以來自認證設定檔、env 憑證或 `models.json`。
    - 如果明確的 `auth.order.<provider>` 省略了已儲存的設定檔，探測會回報 `excluded_by_auth_order` 而不是嘗試它。如果認證存在但無法為該提供者解析可探測的模型，探測會回報 `status: no_model`。
  </Accordion>
</AccordionGroup>

<Note>認證選擇取決於提供者/帳戶。對於始終開啟的閘道主機，API 金鑰通常是最可預測的；同時也支援重複使用 Claude CLI 和現有的 Anthropic OAuth/權杖設定檔。</Note>

範例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可選擇探測模型以取得工具和圖像支援。

<ParamField path="--no-probe" type="boolean">
  跳過即時探測（僅限中繼資料）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小參數大小（十億）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳過較舊的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供者前綴篩選器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  後備清單大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  將 `agents.defaults.model.primary` 設定為第一個選項。
</ParamField>
<ParamField path="--set-image" type="boolean">
  將 `agents.defaults.imageModel.primary` 設定為第一個圖片選項。
</ParamField>

<Note>OpenRouter `/models` 目錄是公開的，因此僅限中繼資料的掃描可以在沒有金鑰的情況下列出免費的候選項。探測和推論仍然需要 OpenRouter API 金鑰（來自身分設定檔或 `OPENROUTER_API_KEY`）。如果沒有可用的金鑰，`openclaw models scan` 將會回退到僅限中繼資料的輸出，並且保持設定不變。使用 `--no-probe` 明確請求僅限中繼資料的模式。</Note>

掃描結果排名依據：

1. 圖片支援
2. 工具延遲
3. 上下文大小
4. 參數數量

輸入：

- OpenRouter `/models` 清單（篩選 `:free`）
- 即時探測需要來自身分設定檔或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（請參閱 [環境變數](/zh-Hant/help/environment)）
- 選用篩選器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 請求/探測控制：`--timeout`、`--concurrency`

當即時探測在 TTY 中執行時，您可以以互動方式選擇後備模型。在非互動模式下，傳遞 `--yes` 以接受預設值。僅包含元資料的結果僅供參考；`--set-default` 和 `--set-image` 需要即時探測，因此 OpenClaw 不會配置無法使用的無金鑰 OpenRouter 模型。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會寫入代理程式目錄下的 `models.json`（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非 `models.mode` 設定為 `replace`，否則此檔案預設會被合併。

<AccordionGroup>
  <Accordion title="合併模式優先順序">
    匹配提供者 ID 的合併模式優先順序：

    - 代理程式 `models.json` 中已存在的非空 `baseUrl` 優先。
    - 僅當該提供者在目前的 config/auth-profile 上下文中非由 SecretRef 管理時，代理程式 `models.json` 中的非空 `apiKey` 才優先。
    - SecretRef 管理的提供者 `apiKey` 值是從來源標記重新整理（環境變數參考為 `ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`），而不是持久化已解析的秘密。
    - SecretRef 管理的提供者標頭值是從來源標記重新整理（環境變數參考為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`）。
    - 空白或遺失的代理程式 `apiKey`/`baseUrl` 會回退到 config `models.providers`。
    - 其他提供者欄位會從 config 和正規化的目錄資料重新整理。

  </Accordion>
</AccordionGroup>

<Note>標記持久化是來源授權的：OpenClaw 從活動來源設定快照（解析前）寫入標記，而不是從已解析的執行時秘密值寫入。這適用於 OpenClaw 重新生成 `models.json` 的任何時候，包括像 `openclaw agent` 這樣的命令驅動路徑。</Note>

## 相關

- [代理程式執行時](/zh-Hant/concepts/agent-runtimes) — PI、Codex 和其他代理程式迴圈執行時
- [設定參考](/zh-Hant/gateway/config-agents#agent-defaults) — 模型配置鍵
- [圖像生成](/zh-Hant/tools/image-generation) — 圖像模型配置
- [模型故障轉移](/zh-Hant/concepts/model-failover) — 故障轉移鏈
- [模型提供商](/zh-Hant/concepts/model-providers) — 提供商路由與驗證
- [音樂生成](/zh-Hant/tools/music-generation) — 音樂模型配置
- [影片生成](/zh-Hant/tools/video-generation) — 影片模型配置
