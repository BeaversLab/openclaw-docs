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
    驗證設定檔輪替、冷卻，以及其與後備機制的互動方式。
  </Card>
  <Card title="Model providers" href="/zh-Hant/concepts/model-providers">
    提供者快速概覽與範例。
  </Card>
  <Card title="Agent runtimes" href="/zh-Hant/concepts/agent-runtimes">
    PI、Codex 及其他 Agent 迴圈執行環境。
  </Card>
  <Card title="Configuration reference" href="/zh-Hant/gateway/config-agents#agent-defaults">
    模型設定鍵值。
  </Card>
</CardGroup>

模型參照用於選擇提供者與模型，通常不會選擇低層級的 Agent 執行環境。OpenAI Agent 參照是主要的例外：在官方 OpenAI 提供者上，`openai/gpt-5.5` 預設透過 Codex app-server 執行環境運作。明確的執行環境覆寫應屬於提供者/模型策略，而非整個 Agent 或工作階段。在 Codex 執行環境模式下，`openai/gpt-*` 參照並不意味 API 金鑰計費；驗證可來自 Codex 帳戶或 `openai-codex` 驗證設定檔。請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。

## 模型選擇機制

OpenClaw 依照以下順序選擇模型：

<Steps>
  <Step title="Primary model">`agents.defaults.model.primary` (或 `agents.defaults.model`)。</Step>
  <Step title="Fallbacks">`agents.defaults.model.fallbacks` (依順序)。</Step>
  <Step title="Provider auth failover">提供者驗證後備機制會在移至下一個模型之前，於該提供者內部發生。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="相關的模型介面">
    - `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄（包含別名）。使用 `provider/*` 條目來限制可見的供應商，同時保持供應商探索為動態。
    - `agents.defaults.imageModel` **僅當** 主模型無法接受圖片時才會使用。
    - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，該工具會回退到 `agents.defaults.imageModel`，然後是解析出的會話/預設模型。
    - `agents.defaults.imageGenerationModel` 由共享的圖片生成功能使用。如果省略，`image_generate` 仍然可以推斷出一個基於身份驗證的供應商預設值。它會先嘗試當前的預設供應商，然後按照供應商 ID 順序嘗試其餘已註冊的圖片生成供應商。如果您設定了特定的供應商/模型，還請配置該供應商的身份驗證/API 金鑰。
    - `agents.defaults.musicGenerationModel` 由共享的音樂生成功能使用。如果省略，`music_generate` 仍然可以推斷出一個基於身份驗證的供應商預設值。它會先嘗試當前的預設供應商，然後按照供應商 ID 順序嘗試其餘已註冊的音樂生成供應商。如果您設定了特定的供應商/模型，還請配置該供應商的身份驗證/API 金鑰。
    - `agents.defaults.videoGenerationModel` 由共享的影片生成功能使用。如果省略，`video_generate` 仍然可以推斷出一個基於身份驗證的供應商預設值。它會先嘗試當前的預設供應商，然後按照供應商 ID 順序嘗試其餘已註冊的影片生成供應商。如果您設定了特定的供應商/模型，還請配置該供應商的身份驗證/API 金鑰。
    - 每個代理的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（請參閱 [多代理路由](/zh-Hant/concepts/multi-agent)）。

  </Accordion>
</AccordionGroup>

## 選擇來源與回退行為

同一個 `provider/model` 根據其來源可能代表不同的意義：

- 設定的預設值（`agents.defaults.model.primary` 和特定於代理的主要模型）是正常的起點，並使用 `agents.defaults.model.fallbacks`。
- 自動備援選取是暫時的復原狀態。它們與 `modelOverrideSource: "auto"` 一起儲存，以便後續輪次能繼續使用備援鏈，而無需每次都探測已知為故障的主要模型；OpenClaw 會定期再次探測原始主要模型，在其恢復時清除自動選取，並在每次狀態變更時公告備援/復原過渡。
- 使用者工作階段選擇是精確的。`/model`（模型選擇器）、`session_status(model=...)` 和 `sessions.patch` 會儲存 `modelOverrideSource: "user"`；如果所選的提供者/模型無法連線，OpenClaw 會明確地顯示失敗，而不是轉向另一個已設定的模型。
- Cron `--model` / payload `model` 是每個工作的主要設定。除非工作提供明確的 payload `fallbacks`（請使用 `fallbacks: []` 進行嚴格的 cron 執行），否則它仍會使用設定的備援。
- CLI 預設模型和允許清單選擇器會透過列出明確的 `models.providers.*.models` 來遵守 `models.mode: "replace"`，而不是載入完整的內建目錄。
- Control UI 模型選擇器會向 Gateway 查詢其設定的模型檢視：若存在 `agents.defaults.models`（包括提供者範圍的 `provider/*` 項目），則使用該項；否則使用明確的 `models.providers.*.models` 加上具有可用身份驗證的提供者。完整的內建目錄保留給明確的瀏覽檢視，例如使用 `view: "all"` 或 `openclaw models list --all` 的 `models.list`。

## 快速模型策略

- 將您的主要模型設定為您可用的最強大最新世代模型。
- 對於成本/延遲敏感的任務和低風險的聊天，請使用備援模型。
- 對於啟用工具的代理程式或不受信任的輸入，請避免使用較舊/較弱的模型層級。

## 入門導覽（建議）

如果您不想手動編輯設定，請執行入門導覽：

```bash
openclaw onboard
```

它可以為常見的提供者設定模型和身份驗證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 Claude CLI)。

## 設定金鑰（概覽）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (允許清單 + 別名 + 提供者參數 + `provider/*` 動態提供者項目)
- `models.providers` (寫入 `models.json` 的自訂提供者)

<Note>
模型參照會正規化為小寫。提供者別名如 `z.ai/*` 會正規化為 `zai/*`。

提供者設定範例（包括 OpenCode）位於 [OpenCode](/zh-Hant/providers/opencode)。

</Note>

### 安全允許清單編輯

手動更新 `agents.defaults.models` 時使用累加寫入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="覆寫保護規則">
    `openclaw config set` 可保護模型/提供者對應免於意外覆寫。當對 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 進行單純的物件指派會移除現有項目時，該指派會被拒絕。請使用 `--merge` 進行累加變更；僅當提供的值應成為完整的目標值時，才使用 `--replace`。

    互動式提供者設定和 `openclaw configure --section model` 也會將提供者範圍的選取合併到現有的允許清單中，因此新增 Codex、Ollama 或其他提供者不會丟失不相關的模型項目。當重新套用提供者驗證時，Configure 會保留現有的 `agents.defaults.model.primary`。明確的預設設定指令（例如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>`）仍會取代 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## 「不允許使用此模型」（以及回覆停止的原因）

如果設定了 `agents.defaults.models`，它將成為 `/model` 和會話覆寫的 **允許清單**。當使用者選取的模型不在該允許清單中時，OpenClaw 會傳回：

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
這會在產生正常回覆**之前**發生，因此訊息可能會讓人覺得它「沒有回應」。解決方法是：

- 將模型新增至 `agents.defaults.models`，或
- 清除允許清單（移除 `agents.defaults.models`），或
- 從 `/model list` 中挑選一個模型。

</Warning>

當被拒絕的指令包含執行時期覆寫（例如 `/model openai/gpt-5.5 --runtime codex`）時，請先修正允許清單，然後重試相同的 `/model ... --runtime ...` 指令。對於原生 Codex 執行，選定的模型仍然是 `openai/gpt-5.5`；`codex` 執行時期會選擇套件並單獨使用 Codex 驗證。

對於本機/GGUF 模型，請將完整的供應商前綴參照儲存在允許清單中，
例如 `ollama/gemma4:26b`、`lmstudio/Gemma4-26b-a4-it-gguf`，或
`openclaw models list --provider <provider>` 顯示的確切供應商/模型。
當啟用允許清單時，僅有本機檔名或顯示名稱是不夠的。

如果您想要在不手動列出每個模型的情況下限制供應商，請將
`provider/*` 項目新增至 `agents.defaults.models`：

```json5
{
  agents: {
    defaults: {
      models: {
        "openai-codex/*": {},
        "vllm/*": {},
      },
    },
  },
}
```

使用該原則時，`/model`、`/models` 和模型選擇器僅會顯示這些供應商的已發現目錄。
來自所選供應商的新模型可以在不編輯允許清單的情況下出現。當您需要來自其他供應商的某個特定模型時，精確的 `provider/model` 項目可以與 `provider/*` 項目混合使用。

允許清單設定範例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-sonnet-4-6" },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
}
```

## 在聊天中切換模型 (`/model`)

您無需重新啟動即可為目前的工作階段切換模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="選擇器行為">
    - `/model` (和 `/model list`) 是一個精簡的編號選擇器 (模型系列 + 可用的提供者)。
    - 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，包含提供者和模型下拉選單以及提交步驟。
    - 在 Telegram 上，`/models` 選擇器的選擇範圍僅限於該次對話；它們不會變更代理在 `openclaw.json` 中的持久預設值。
    - `/models add` 已被棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。
    - `/model <#>` 從該選擇器中進行選擇。

  </Accordion>
  <Accordion title="持久化與即時切換">
    - `/model` 會立即保存新的工作階段選擇。
    - 如果代理處於閒置狀態，下次執行會立即使用新模型。
    - 如果執行正在進行中，OpenClaw 會將即時切換標記為待處理，並僅在乾淨的重試點重新啟動進入新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可以保持佇列狀態，直到稍後的重試機會或下一個使用者輪次。
    - 使用者選擇的 `/model` 參照對於該工作階段是嚴格的：如果選擇的提供者/模型無法連線，回覆會明確失敗，而不是靜默地從 `agents.defaults.model.fallbacks` 回答。這與設定的預設值和 cron 任務主要項不同，後者仍可使用後備鏈。
    - `/model status` 是詳細檢視 (驗證候選項，以及當已設定時，提供者端點 `baseUrl` + `api` 模式)。

  </Accordion>
  <Accordion title="Ref parsing">
    - Model refs are parsed by splitting on the **first** `/`. Use `provider/model` when typing `/model <ref>`.
    - If the model ID itself contains `/` (OpenRouter-style), you must include the provider prefix (example: `/model openrouter/moonshotai/kimi-k2`).
    - If you omit the provider, OpenClaw resolves the input in this order:
      1. alias match
      2. unique configured-provider match for that exact unprefixed model id
      3. deprecated fallback to the configured default provider — if that provider no longer exposes the configured default model, OpenClaw instead falls back to the first configured provider/model to avoid surfacing a stale removed-provider default.
  </Accordion>
</AccordionGroup>

Full command behavior/config: [Slash commands](/zh-Hant/tools/slash-commands).

## CLI commands

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

`openclaw models` (no subcommand) is a shortcut for `models status`.

### `models list`

Shows configured/auth-available models by default. Useful flags:

<ParamField path="--all" type="boolean">
  Full catalog. Includes bundled provider-owned static catalog rows before auth is configured, so discovery-only views can show models that are unavailable until you add matching provider credentials.
</ParamField>
<ParamField path="--local" type="boolean">
  Local providers only.
</ParamField>
<ParamField path="--provider <id>" type="string">
  Filter by provider id, for example `moonshot`. Display labels from interactive pickers are not accepted.
</ParamField>
<ParamField path="--plain" type="boolean">
  One model per line.
</ParamField>
<ParamField path="--json" type="boolean">
  Machine-readable output.
</ParamField>

### `models status`

顯示已解析的主要模型、後備模型、圖片模型，以及已設定供應商的驗證概覽。它也會顯示在驗證儲存庫 (auth store) 中找到的設定檔的 OAuth 過期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。

<AccordionGroup>
  <Accordion title="驗證與探測行為">
    - OAuth 狀態始終會顯示（並包含在 `--json` 輸出中）。如果已設定的供應商沒有憑證，`models status` 會列印一個 **Missing auth** 區塊。
    - JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`（每個供應商的有效驗證，包括 env-backed 憑證）。`auth.oauth` 僅為 auth-store 設定檔的健康狀態；僅使用 env 的供應商不會出現在那裡。
    - 使用 `--check` 進行自動化（當憑證遺失/過期時退出 `1`，即將過期時退出 `2`）。
    - 使用 `--probe` 進行即時驗證檢查；探測行可以來自驗證設定檔、env 憑證，或 `models.json`。
    - 如果明確的 `auth.order.<provider>` 省略了儲存的設定檔，探測會回報 `excluded_by_auth_order` 而不是嘗試它。如果驗證存在但無法為該供應商解析可探測的模型，探測會回報 `status: no_model`。

  </Accordion>
</AccordionGroup>

<Note>驗證選擇取決於供應商/帳戶。對於始終運作的閘道主機，API 金鑰通常是最可預測的；也支援重複使用 Claude CLI 和現有的 Anthropic OAuth/token 設定檔。</Note>

範例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可選擇性探測模型的工具和圖片支援。

<ParamField path="--no-probe" type="boolean">
  跳過即時探測（僅元資料）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小參數大小（十億）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳過較舊的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供者前綴過濾器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  備用清單大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  將 `agents.defaults.model.primary` 設定為第一個選擇。
</ParamField>
<ParamField path="--set-image" type="boolean">
  將 `agents.defaults.imageModel.primary` 設定為第一個圖片選擇。
</ParamField>

<Note>OpenRouter `/models` 目錄是公開的，因此僅元資料的掃描可以在不需要金鑰的情況下列出免費候選項。探測和推理仍然需要 OpenRouter API 金鑰（來自 auth 設定檔或 `OPENROUTER_API_KEY`）。如果沒有可用的金鑰，`openclaw models scan` 會退回到僅輸出元資料並保持設定不變。使用 `--no-probe` 明確請求僅元資料模式。</Note>

掃描結果依據以下項目排序：

1. 圖片支援
2. 工具延遲
3. 內容長度
4. 參數數量

輸入：

- OpenRouter `/models` 清單（過濾器 `:free`）
- 即時探測需要來自 auth 設定檔或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（請參閱 [環境變數](/zh-Hant/help/environment)）
- 可選過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 請求/探測控制：`--timeout`、`--concurrency`

當即時探測在 TTY 中執行時，您可以互動選擇後備模型。在非互動模式下，傳遞 `--yes` 以接受預設值。僅含元資料的結果僅供參考；`--set-default` 和 `--set-image` 需要即時探測，因此 OpenClaw 不會配置無法使用的免金鑰 OpenRouter 模型。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會寫入 agent 目錄下的 `models.json` 中（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非將 `models.mode` 設定為 `replace`，否則預設會合併此檔案。

<AccordionGroup>
  <Accordion title="合併模式優先順序">
    符合提供者 ID 的合併模式優先順序：

    - agent `models.json` 中已存在的非空 `baseUrl` 優先。
    - 僅當該提供者在目前的 config/auth-profile 內容中非由 SecretRef 管理時，agent `models.json` 中的非空 `apiKey` 才會優先。
    - SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`），而不是持續解析後的密碼。
    - SecretRef 管理的提供者標頭值會從來源標記重新整理（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）。
    - 空白或遺失的 agent `apiKey`/`baseUrl` 會回退至 config `models.providers`。
    - 其他提供者欄位會從 config 和標準化目錄資料重新整理。

  </Accordion>
</AccordionGroup>

<Note>標記持續性是以來源為準：OpenClaw 寫入的標記來自於使用中的來源 config 快照（解析前），而非解析後的執行時密碼值。每當 OpenClaw 重新生成 `models.json` 時皆適用此原則，包括像 `openclaw agent` 這類的指令驅動路徑。</Note>

## 相關

- [Agent runtimes](/zh-Hant/concepts/agent-runtimes) — PI、Codex 和其他 agent loop 執行環境
- [配置參考](/zh-Hant/gateway/config-agents#agent-defaults) — 模型配置鍵
- [圖像生成](/zh-Hant/tools/image-generation) — 圖像模型配置
- [模型故障切換](/zh-Hant/concepts/model-failover) — 備援鏈
- [模型提供者](/zh-Hant/concepts/model-providers) — 提供者路由與認證
- [音樂生成](/zh-Hant/tools/music-generation) — 音樂模型配置
- [影片生成](/zh-Hant/tools/video-generation) — 影片模型配置
