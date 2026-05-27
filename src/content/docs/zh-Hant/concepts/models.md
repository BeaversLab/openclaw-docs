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

模型參照會選擇供應商和模型。它們通常不會選擇底層的代理執行時。OpenAI 代理參照是主要的例外：在官方 OpenAI 供應商上，`openai/gpt-5.5` 預設會透過 Codex 應用伺服器執行時來執行。明確的執行時覆寫應屬於供應商/模型政策，而非整個代理或會話。在 Codex 執行時模式下，`openai/gpt-*` 參照並不意味著 API 金鑰計費；認證可以來自 Codex 帳戶或 `openai-codex` 認證設定檔。請參閱 [代理執行時](/zh-Hant/concepts/agent-runtimes)。

## 模型選擇機制

OpenClaw 依照以下順序選擇模型：

<Steps>
  <Step title="Primary model">`agents.defaults.model.primary` (或 `agents.defaults.model`)。</Step>
  <Step title="Fallbacks">`agents.defaults.model.fallbacks` (依順序)。</Step>
  <Step title="Provider auth failover">提供者驗證後備機制會在移至下一個模型之前，於該提供者內部發生。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="相關模型介面">
    - `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄（包含別名）。使用 `provider/*` 項目來限制可見的供應商，同時保持供應商探索的動態性。
    - `agents.defaults.imageModel` **僅在** 主要模型無法接受圖片時使用。
    - `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，該工具會回退到 `agents.defaults.imageModel`，然後是解析出的會話/預設模型。
    - `agents.defaults.imageGenerationModel` 由共享的圖片生成功能使用。如果省略，`image_generate` 仍可推斷出支援驗證的供應商預設值。它會先嘗試目前的預設供應商，然後按照供應商 ID 順序嘗試剩餘的已註冊圖片生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的驗證/API 金鑰。
    - `agents.defaults.musicGenerationModel` 由共享的音樂生成功能使用。如果省略，`music_generate` 仍可推斷出支援驗證的供應商預設值。它會先嘗試目前的預設供應商，然後按照供應商 ID 順序嘗試剩餘的已註冊音樂生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的驗證/API 金鑰。
    - `agents.defaults.videoGenerationModel` 由共享的影片生成功能使用。如果省略，`video_generate` 仍可推斷出支援驗證的供應商預設值。它會先嘗試目前的預設供應商，然後按照供應商 ID 順序嘗試剩餘的已註冊影片生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的驗證/API 金鑰。
    - 每個代理的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（請參閱[多代理路由](/zh-Hant/concepts/multi-agent)）。

  </Accordion>
</AccordionGroup>

## 選擇來源與回退行為

同一個 `provider/model` 根據其來源可能代表不同的意義：

- 設定的預設值（`agents.defaults.model.primary` 和特定於代理的主要模型）是正常的起點，並使用 `agents.defaults.model.fallbacks`。
- 自動備援選取是暫時的復原狀態。它們與 `modelOverrideSource: "auto"` 一起儲存，以便後續輪次能繼續使用備援鏈，而無需每次都探測已知為故障的主要模型；OpenClaw 會定期再次探測原始主要模型，在其恢復時清除自動選取，並在每次狀態變更時公告備援/復原過渡。
- 使用者工作階段選擇是精確的。`/model`（模型選擇器）、`session_status(model=...)` 和 `sessions.patch` 會儲存 `modelOverrideSource: "user"`；如果所選的提供者/模型無法連線，OpenClaw 會明確地顯示失敗，而不是轉向另一個已設定的模型。
- 變更 `agents.defaults.model.primary` 不會重寫現有的會話選擇。如果狀態顯示 `This session is pinned to X; config primary Y will apply to new/unpinned sessions.`，請使用 `/model Y` 切換目前的會話，或使用 `/reset` 清除過時的會話狀態。
- Cron `--model` / payload `model` 是每個工作的首要選擇。除非工作提供了明確的 payload `fallbacks`（否則請使用 `fallbacks: []` 進行嚴格的 cron 執行），否則它仍會使用設定的後備選項。
- CLI default-model 和 allowlist 選擇器會透過列出明確的 `models.providers.*.models` 而非載入完整的內建目錄來尊重 `models.mode: "replace"`。
- Control UI 模型選擇器會向 Gateway 請求其設定的模型視圖：如果存在，則為 `agents.defaults.models`，包括供應商範圍的 `provider/*` 項目，否則為明確的 `models.providers.*.models` 加上具有可用驗證的供應商。完整的內建目錄保留給明確的瀏覽視圖，例如帶有 `view: "all"` 或 `openclaw models list --all` 的 `models.list`。

## 快速模型政策

- 將您的主要選項設定為您可用的最強大最新世代模型。
- 針對成本/延遲敏感的任務和風險較低的對話，請使用後備選項。
- 對於啟用工具的代理程式或不受信任的輸入，請避免使用較舊/較弱的模型層級。

## 入門導覽 (建議)

如果您不想手動編輯設定，請執行入門導覽：

```bash
openclaw onboard
```

它可以為常見供應商設定模型 + 驗證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 Claude CLI)。

## 設定金鑰 (概覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models` (allowlist + aliases + provider params + `provider/*` 動態供應商項目)
- `models.providers` (寫入 `models.json` 的自訂供應商)

<Note>
Model refs 會被正規化為小寫。提供者別名如 `z.ai/*` 會正規化為 `zai/*`。

提供者設定範例（包含 OpenCode）位於 [OpenCode](/zh-Hant/providers/opencode)。

</Note>

### 安全允許清單編輯

手動更新 `agents.defaults.models` 時請使用附加式寫入：

```bash
openclaw config set agents.defaults.models '{"openai/gpt-5.4":{}}' --strict-json --merge
```

<AccordionGroup>
  <Accordion title="Clobber protection rules">
    `openclaw config set` 可保護模型/提供者對映免於意外被覆寫。當對 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 進行單純物件指派會移除現有項目時，該操作將會被拒絕。請使用 `--merge` 進行附加式變更；僅當提供的值應成為完整的目標值時，才使用 `--replace`。

    互動式提供者設定和 `openclaw configure --section model` 也會將提供者範圍的選擇合併到現有的允許清單中，因此新增 Codex、Ollama 或其他提供者並不會丟失不相關的模型項目。當重新套用提供者驗證時，Configure 會保留現有的 `agents.defaults.model.primary`。明確的預設設定指令（例如 `openclaw models auth login --provider <id> --set-default` 和 `openclaw models set <model>`）仍會替換 `agents.defaults.model.primary`。

  </Accordion>
</AccordionGroup>

## "不允許的模型"（以及回覆停止的原因）

如果設定了 `agents.defaults.models`，它將成為 `/model` 和工作階段覆寫的 **允許清單**。當使用者選取的模型不在該允許清單中時，OpenClaw 會回傳：

```
Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
```

<Warning>
這會在產生正常回覆 **之前** 發生，因此訊息可能會讓人覺得「沒有回應」。解決方法是：

- 將模型加入 `agents.defaults.models`，或
- 清除允許清單（移除 `agents.defaults.models`），或
- 從 `/model list` 中挑選一個模型。

</Warning>

當被拒絕的指令包含執行階段覆寫（例如 `/model openai/gpt-5.5 --runtime codex`）時，請先修正允許清單，然後重試相同的 `/model ... --runtime ...` 指令。對於原生 Codex 執行，選定的模型仍然是 `openai/gpt-5.5`；`codex` 執行階段會選擇鞍座並單獨使用 Codex 驗證。

對於本地/GGUF 模型，請將完整的供應商前綴參照儲存在允許清單中，
例如 `ollama/gemma4:26b`、`lmstudio/Gemma4-26b-a4-it-gguf`，或
由 `openclaw models list --provider <provider>` 顯示的確切供應商/模型。
當啟用允許清單時，僅提供本地檔名或顯示名稱是不夠的。

如果您想要限制供應商而不需手動列出每個模型，請將
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

使用該政策時，`/model`、`/models` 和模型選擇器僅會顯示這些供應商的探索目錄。來自所選供應商的新模型可以
出現而無需編輯允許清單。當您需要來自另一個供應商的某個特定模型時，確切的 `provider/model` 項目可以與
`provider/*` 項目混合使用。

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

您無需重新啟動即可為當前工作階段切換模型：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

<AccordionGroup>
  <Accordion title="選擇器行為">
    - `/model`（以及 `/model list`）是一個緊湊的、編號的選擇器（模型系列 + 可用供應商）。
    - 在 Discord 上，`/model` 和 `/models` 會開啟互動式選擇器，其中包含供應商和模型下拉選單以及提交步驟。
    - 在 Telegram 上，`/models` 選擇器的選取範圍僅限於工作階段；它們不會變更代理在 `openclaw.json` 中的永久預設值。
    - `/models add` 已被棄用，現在會傳回棄用訊息，而不是從聊天中註冊模型。
    - `/model <#>` 從該選擇器中進行選擇。

  </Accordion>
  <Accordion title="持久性和即時切換">
    - `/model` 會立即持久化新的工作階段選擇。
    - 如果代理處於閒置狀態，下一次執行會立即使用新模型。
    - 如果執行已在進行中，OpenClaw 會將即時切換標記為待處理，並且只在乾淨的重試點重啟至新模型。
    - 如果工具活動或回覆輸出已經開始，待處理的切換可能會保持排隊狀態，直到稍後的重試機會或下一個使用者輪次。
    - 使用者選擇的 `/model` 參照對該工作階段是嚴格的：如果選取的供應商/模型無法連線，回覆會明確失敗，而不是靜默地從 `agents.defaults.model.fallbacks` 進行回答。這與設定的預設值和排程任務主要項不同，後者仍可使用後備鏈。
    - `/model status` 是詳細檢視（驗證候選項，以及設定時，供應商端點 `baseUrl` + `api` 模式）。

  </Accordion>
  <Accordion title="Ref 解析">
    - 模型參照會透過在 **第一個** `/` 處分割來進行解析。輸入 `/model <ref>` 時請使用 `provider/model`。
    - 如果模型 ID 本身包含 `/`（OpenRouter 風格），您必須包含供應商前綴（例如：`/model openrouter/moonshotai/kimi-k2`）。
    - 如果您省略供應商，OpenClaw 會依以下順序解析輸入：
      1. 別名匹配
      2. 該確切無前綴模型 ID 的唯一已設定供應商匹配
      3. 已棄用的後備至設定的預設供應商——如果該供應商不再公開設定的預設模型，OpenClaw 則會改為後備至第一個設定的供應商/模型，以避免顯示陳舊的已移除供應商預設值。
  </Accordion>
</AccordionGroup>

完整指令行為/設定：[斜線指令](/zh-Hant/tools/slash-commands)。

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

預設顯示已設定/可用驗證的模型。實用旗標：

<ParamField path="--all" type="boolean">
  完整目錄。在設定認證之前包含套件中提供商擁有的靜態目錄行，以便僅供探索的視圖可以顯示在您新增相符的提供商憑證之前無法使用的模型。
</ParamField>
<ParamField path="--local" type="boolean">
  僅限本機提供商。
</ParamField>
<ParamField path="--provider <id>" type="string">
  依提供商 ID 篩選，例如 `moonshot`。不接受來自互動式選擇器的顯示標籤。
</ParamField>
<ParamField path="--plain" type="boolean">
  每行一個模型。
</ParamField>
<ParamField path="--json" type="boolean">
  機器可讀輸出。
</ParamField>

### `models status`

顯示已解析的主要模型、後備模型、圖像模型以及已設定提供商的認證概覽。它還會顯示在認證儲存中找到的設定檔的 OAuth 到期狀態（預設會在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。

<AccordionGroup>
  <Accordion title="Auth and probe behavior">
    - OAuth 狀態總是會顯示（並包含在 `--json` 輸出中）。如果設定的供應商沒有憑證，`models status` 會列印一個 **Missing auth** 區段。
    - JSON 包含 `auth.oauth`（警告視窗 + 檔案）和 `auth.providers`（每個供應商的有效驗證，包括支援環境變數的憑證）。`auth.oauth` 僅代表驗證儲存檔案的健全狀況；僅使用環境變數的供應商不會出現在那裡。
    - 使用 `--check` 進行自動化（當缺失或過期時退出 `1`，當即將過期時退出 `2`）。
    - 使用 `--probe` 進行即時驗證檢查；探測列可以來自驗證檔案、環境憑證或 `models.json`。
    - 如果明確的 `auth.order.<provider>` 省略了已儲存的檔案，探測會回報 `excluded_by_auth_order` 而不是嘗試它。如果驗證存在但無法為該供應商解析可探測的模型，探測會回報 `status: no_model`。

  </Accordion>
</AccordionGroup>

<Note>驗證選擇取決於供應商/帳戶。對於常開的閘道主機，API 金鑰通常是最可預測的；也支援重複使用 Claude CLI 和現有的 Anthropic OAuth/代碼 檔案。</Note>

範例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可以選擇性地探測模型的工具和圖片支援。

<ParamField path="--no-probe" type="boolean">
  跳過即時探測（僅限元資料）。
</ParamField>
<ParamField path="--min-params <b>" type="number">
  最小參數大小（十億）。
</ParamField>
<ParamField path="--max-age-days <days>" type="number">
  跳過較舊的模型。
</ParamField>
<ParamField path="--provider <name>" type="string">
  提供者前置詞過濾器。
</ParamField>
<ParamField path="--max-candidates <n>" type="number">
  後備清單大小。
</ParamField>
<ParamField path="--set-default" type="boolean">
  將 `agents.defaults.model.primary` 設定為首選項。
</ParamField>
<ParamField path="--set-image" type="boolean">
  將 `agents.defaults.imageModel.primary` 設定為首個圖片選擇。
</ParamField>

<Note>OpenRouter `/models` 型錄是公開的，因此僅限元資料的掃描可以在沒有金鑰的情況下列出免費候選項。探測和推理仍然需要 OpenRouter API 金鑰（來自 auth profiles 或 `OPENROUTER_API_KEY`）。如果沒有可用的金鑰，`openclaw models scan` 將會回退到僅限元資料的輸出，並保持設定不變。使用 `--no-probe` 明確請求僅限元資料模式。</Note>

掃描結果排名依據：

1. 圖片支援
2. 工具延遲
3. 語境大小
4. 參數數量

輸入：

- OpenRouter `/models` 列表（過濾器 `:free`）
- 即時探測需要來自 auth profiles 或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（請參閱 [環境變數](/zh-Hant/help/environment)）
- 選用過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 請求/探測控制：`--timeout`、`--concurrency`

當即時探測在 TTY 中執行時，您可以互動式選擇後備。在非互動模式下，傳遞 `--yes` 以接受預設值。僅含元資料的結果僅供參考；`--set-default` 和 `--set-image` 需要即時探測，因此 OpenClaw 不會設定無法使用的無金鑰 OpenRouter 模型。

## 模型登錄表 (`models.json`)

`models.providers` 中的自訂提供者會寫入代理程式目錄下的 `models.json`（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非將 `models.mode` 設定為 `replace`，否則此檔案預設會被合併。

<AccordionGroup>
  <Accordion title="合併模式優先順序">
    符合提供者 ID 的合併模式優先順序：

    - 代理程式 `models.json` 中已存在的非空 `baseUrl` 優先。
    - 僅當該提供者在目前的設定/驗證設定檔情境中非由 SecretRef 管理時，代理程式 `models.json` 中的非空 `apiKey` 才優先。
    - SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（環境變數參考為 `ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`），而非持續已解析的秘密。
    - SecretRef 管理的提供者標頭值會從來源標記重新整理（環境變數參考為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`）。
    - 空白或遺失的代理程式 `apiKey`/`baseUrl` 會回退至設定 `models.providers`。
    - 其他提供者欄位會從設定和規範化的目錄資料重新整理。

  </Accordion>
</AccordionGroup>

<Note>標記持續性以來源為準：OpenClaw 從作用中的來源設定快照（解析前）寫入標記，而非從解析後的執行時期秘密值寫入。每當 OpenClaw 重新產生 `models.json` 時皆適用此規則，包括像 `openclaw agent` 這類命令驅動的路徑。</Note>

## 相關

- [Agent runtimes](/zh-Hant/concepts/agent-runtimes) — PI、Codex 和其他代理程式迴圈執行時期
- [Configuration reference](/zh-Hant/gateway/config-agents#agent-defaults) — 模型配置鍵
- [Image generation](/zh-Hant/tools/image-generation) — 影像模型配置
- [Model failover](/zh-Hant/concepts/model-failover) — 容錯鏈
- [Model providers](/zh-Hant/concepts/model-providers) — 提供者路由與驗證
- [Music generation](/zh-Hant/tools/music-generation) — 音樂模型配置
- [Video generation](/zh-Hant/tools/video-generation) — 影片模型配置
