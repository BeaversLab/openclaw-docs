---
summary: "Models CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

請參閱 [/concepts/model-failover](/zh-Hant/concepts/model-failover) 以了解認證設定檔輪替、冷卻時間，以及其與備援機制的互動方式。
快速供應商概覽與範例：[/concepts/model-providers](/zh-Hant/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 依照以下順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **備援** 模型（按順序）。
3. **供應商 auth 備援** 會在移至下一個模型之前，在供應商內部發生。

相關：

- `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄（包含別名）。
- `agents.defaults.imageModel` **僅在** 主要模型無法接受圖片時使用。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，該工具
  會依序備援至 `agents.defaults.imageModel`，然後是已解析的階段/預設
  模型。
- `agents.defaults.imageGenerationModel` 由共享的圖像生成功能使用。如果省略，`image_generate` 仍可推斷出由認證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試其餘已註冊的圖像生成供應商。如果您設定了特定的供應商/模型，也請設定該供應商的認證/API 金鑰。
- `agents.defaults.musicGenerationModel` 由共享的音樂生成功能使用。如果省略，`music_generate` 仍可推斷出由認證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試其餘已註冊的音樂生成供應商。如果您設定了特定的供應商/模型，也請設定該供應商的認證/API 金鑰。
- `agents.defaults.videoGenerationModel` 由共享的影片生成功能使用。如果省略，`video_generate` 仍可推斷出由認證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試其餘已註冊的影片生成供應商。如果您設定了特定的供應商/模型，也請設定該供應商的認證/API 金鑰。
- 各代理的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（請參閱 [/concepts/multi-agent](/zh-Hant/concepts/multi-agent)）。

## 快速模型策略

- 將您的主要模型設定為您可用的最強最新一代模型。
- 對於成本/延遲敏感的任務和風險較低的聊天，請使用備選模型。
- 對於啟用工具的代理程式或未受信任的輸入，請避免使用較舊/較弱的模型層級。

## 上手設定 (推薦)

如果您不想手動編輯配置，請執行上手設定 (onboarding)：

```bash
openclaw onboard
```

它可以為常見供應商設定模型 + 驗證，包括 **OpenAI Code (Codex)
訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 Claude CLI)。

## 配置金鑰 (概覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.pdfModel.primary` 和 `agents.defaults.pdfModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.videoGenerationModel.primary` 和 `agents.defaults.videoGenerationModel.fallbacks`
- `agents.defaults.models`（允許清單 + 別名 + 提供者參數）
- `models.providers`（寫入 `models.json` 的自訂提供者）

模型參照會正規化為小寫。像 `z.ai/*` 這類提供者別名會正規化為 `zai/*`。

提供者設定範例（包括 OpenCode）位於 [/providers/opencode](/zh-Hant/providers/opencode)。

### 安全的允許清單編輯

手動更新 `agents.defaults.models` 時，請使用累加式寫入：

```bash
openclaw config set agents.defaults.models '{"openai-codex/gpt-5.4":{}}' --strict-json --merge
```

`openclaw config set` 可保護模型/提供者對應免於意外被覆寫。如果對 `agents.defaults.models`、`models.providers` 或 `models.providers.<id>.models` 的純物件指派會移除現有條目，該指派會被拒絕。請使用 `--merge` 進行累加變更；僅在提供的值應成為完整的目標值時才使用 `--replace`。

互動式提供者設定和 `openclaw configure --section model` 也會將提供者範圍的選取項目合併到現有的允許清單中，因此新增 Codex、Ollama 或其他提供者不會遺失不相關的模型條目。

## 「不允許使用模型」（以及回覆停止的原因）

如果設定了 `agents.defaults.models`，它將成為 `/model` 和工作階段覆寫的 **允許清單**。當使用者選取不在該允許清單中的模型時，OpenClaw 會傳回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

這發生在產生一般回覆 **之前**，因此訊息可能會讓人覺得它「沒有回應」。解決方法是：

- 將模型新增至 `agents.defaults.models`，或
- 清除允許清單（移除 `agents.defaults.models`），或
- 從 `/model list` 中選擇一個模型。

允許清單配置範例：

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

備註：

- `/model` (以及 `/model list`) 是一個緊湊的、帶有編號的選擇器（模型系列 + 可用提供者）。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含提供者和模型下拉式選單以及提交步驟。
- `/models add` 預設為可用，並可以透過 `commands.modelsWrite=false` 停用。
- 啟用後，`/models add <provider> <modelId>` 是最快的途徑；單獨使用 `/models add` 會在支援的情況下啟動以提供者為先的引導流程。
- 執行 `/models add` 後，新模型無需重新啟動閘道即可在 `/models` 和 `/model` 中使用。
- `/model <#>` 從該選擇器中進行選擇。
- `/model` 會立即儲存新的會話選擇。
- 如果代理程式處於閒置狀態，下一次執行會立即使用新模型。
- 如果執行已在進行中，OpenClaw 會將即時切換標記為待處理，並僅在乾淨的重試點重啟至新模型。
- 如果工具活動或回覆輸出已經開始，待處理的切換可能會保持排隊狀態，直到稍後的重試機會或下一個使用者輪次。
- `/model status` 是詳細檢視（驗證候選項，以及配置時的提供者端點 `baseUrl` + `api` 模式）。
- 模型參照透過在**第一個** `/` 處分割來解析。輸入 `/model <ref>` 時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 風格)，則必須包含提供者前綴（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會依以下順序解析輸入：
  1. 別名符合
  2. 針對該特定無前綴模型 ID 的唯一配置提供者符合
  3. 已棄用對已配置預設供應商的後備
     如果該供應商不再公開已配置的預設模型，OpenClaw
     改為後備至第一個已配置的供應商/模型，以避免
     顯示過時的已移除供應商預設。

完整指令行為/配置：[Slash commands](/zh-Hant/tools/slash-commands)。

範例：

```text
/models add
/models add ollama glm-5.1:cloud
/models add lmstudio qwen/qwen3.5-9b
```

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

`openclaw models` （無子指令）是 `models status` 的捷徑。

### `models list`

預設顯示已配置的模型。實用旗標：

- `--all`：完整目錄
- `--local`：僅限本機供應商
- `--provider <id>`：依供應商 ID 篩選，例如 `moonshot`；不接受
  互動式選擇器中的顯示標籤
- `--plain`：每行一個模型
- `--json`：機器可讀輸出

`--all` 包含在配置身分驗證之前的內建供應商靜態目錄項目，因此僅供探索的視圖可能會顯示在您新增匹配的供應商憑證之前無法使用的模型。

### `models status`

顯示已解析的主要模型、備用模型、影像模型以及已設定供應商的認證概覽。它還會顯示在認證儲存庫中找到的設定檔的 OAuth 到期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。
OAuth 狀態總是會顯示（並包含在 `--json` 輸出中）。如果設定的供應商沒有憑證，`models status` 會列印一個 **Missing auth** 區塊。
JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`
（每個供應商的有效認證，包括環境變數支援的憑證）。`auth.oauth`
僅為認證儲存庫設定檔的健康狀態；僅使用環境變數的供應商不會出現在那裡。
使用 `--check` 進行自動化操作（當憑證遺失/過期時退出 `1`，即將到期時退出 `2`）。
使用 `--probe` 進行即時認證檢查；探測行可以來自認證設定檔、環境變數
憑證或 `models.json`。
如果明確的 `auth.order.<provider>` 省略了儲存的設定檔，探測會報告
`excluded_by_auth_order` 而不是嘗試它。如果認證存在但無法為該供應商解析可探測的
模型，探測會報告 `status: no_model`。

認證選擇取決於供應商/帳戶。對於持續運作的閘道主機，API
金鑰通常是最可預測的；也支援重複使用 Claude CLI 和現有的 Anthropic
OAuth/金鑰設定檔。

範例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可以選擇性地探測模型是否支援工具和影像功能。

主要旗標：

- `--no-probe`：跳過即時探測（僅限中繼資料）
- `--min-params <b>`：最小參數大小（十億）
- `--max-age-days <days>`：跳過較舊的模型
- `--provider <name>`：供應商前綴過濾器
- `--max-candidates <n>`：備用清單大小
- `--set-default`：將 `agents.defaults.model.primary` 設定為第一個選擇
- `--set-image`：將 `agents.defaults.imageModel.primary` 設定為第一個影像選擇

探測需要 OpenRouter API 金鑰（來自身分設定檔或
`OPENROUTER_API_KEY`）。如果沒有金鑰，請使用 `--no-probe` 僅列出候選項。

掃描結果排名依據：

1. 圖片支援
2. 工具延遲
3. 內文大小
4. 參數數量

輸入

- OpenRouter `/models` 清單（過濾器 `:free`）
- 需要來自身份設定檔或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（參見 [/environment](/zh-Hant/help/environment)）
- 可選過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探測控制：`--timeout`、`--concurrency`

在 TTY 中執行時，您可以互動式選擇備用模型。在非互動
模式下，請傳遞 `--yes` 以接受預設值。

## 模型註冊表（`models.json`）

`models.providers` 中的自訂提供者會寫入
agent 目錄下的 `models.json` 中（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非
`models.mode` 設定為 `replace`，否則此檔案
預設會被合併。

匹配提供者 ID 的合併模式優先順序：

- agent `models.json` 中已存在且非空的 `baseUrl` 優先。
- agent `models.json` 中非空的 `apiKey` 僅在該提供者於當前設定/身分設定檔語境中非由 SecretRef 管理時優先。
- 由 SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（環境參照為 `ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`），而不是持續化已解析的秘密。
- 由 SecretRef 管理的提供者標頭值會從來源標記重新整理（環境參照為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`）。
- 空白或遺失的 agent `apiKey`/`baseUrl` 會回退到設定 `models.providers`。
- 其他提供者欄位會從設定和標準化的目錄資料重新整理。

標記持久性以源為準：OpenClaw 從作用中的源設定快照（解析前）寫入標記，而非從已解析的執行時機密值。這適用於 OpenClaw 每次重新產生 `models.json` 時，包括像 `openclaw agent` 這樣由指令驅動的路徑。

## 相關

- [模型提供者](/zh-Hant/concepts/model-providers) — 提供者路由與驗證
- [模型故障轉移](/zh-Hant/concepts/model-failover) — 故障轉移鏈
- [圖像生成](/zh-Hant/tools/image-generation) — 圖像模型設定
- [音樂生成](/zh-Hant/tools/music-generation) — 音樂模型設定
- [影片生成](/zh-Hant/tools/video-generation) — 影片模型設定
- [設定參考](/zh-Hant/gateway/configuration-reference#agent-defaults) — 模型設定金鑰
