---
summary: "Models CLI：清單、設定、別名、備援、掃描、狀態"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

請參閱 [/concepts/model-failover](/en/concepts/model-failover) 以了解 auth profile
輪替、冷卻，以及其與備選機制的互動方式。
快速供應商概覽 + 範例：[/concepts/model-providers](/en/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 依照以下順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **備援** (依順序)。
3. **供應商 auth 備援** 會在移至下一個模型之前，在供應商內部發生。

相關：

- `agents.defaults.models` 是 OpenClaw 可以使用的模型允許清單/目錄 (加上別名)。
- `agents.defaults.imageModel` 僅在主要模型無法接受圖片時 **才會使用**。
- `agents.defaults.pdfModel` 由 `pdf` 工具使用。如果省略，該工具
  將備選至 `agents.defaults.imageModel`，然後是解析後的 session/default
  模型。
- `agents.defaults.imageGenerationModel` 由共享的圖像生成功能使用。如果省略，`image_generate` 仍然可以推斷出基於 auth 的供應商預設值。它會先嘗試當前的預設供應商，然後依照 provider-id 順序嘗試剩餘的已註冊圖像生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的 auth/API 金鑰。
- `agents.defaults.musicGenerationModel` 由共享的音樂生成功能使用。如果省略，`music_generate` 仍然可以推斷出基於 auth 的供應商預設值。它會先嘗試當前的預設供應商，然後依照 provider-id 順序嘗試剩餘的已註冊音樂生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的 auth/API 金鑰。
- `agents.defaults.videoGenerationModel` 由共享的影片生成功能使用。如果省略，`video_generate` 仍然可以推斷出基於 auth 的供應商預設值。它會先嘗試當前的預設供應商，然後依照 provider-id 順序嘗試剩餘的已註冊影片生成供應商。如果您設定了特定的供應商/模型，請同時設定該供應商的 auth/API 金鑰。
- 每個代理程式的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model` (請參閱 [/concepts/multi-agent](/en/concepts/multi-agent))。

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
- `agents.defaults.models` (allowlist + aliases + provider params)
- `models.providers` (custom providers written into `models.json`)

Model refs are normalized to lowercase. Provider aliases like `z.ai/*` normalize
to `zai/*`.

Provider configuration examples (including OpenCode) live in
[/providers/opencode](/en/providers/opencode).

## "Model is not allowed" (and why replies stop)

If `agents.defaults.models` is set, it becomes the **allowlist** for `/model` and for
session overrides. When a user selects a model that isn’t in that allowlist,
OpenClaw returns:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

This happens **before** a normal reply is generated, so the message can feel
like it “didn’t respond.” The fix is to either:

- Add the model to `agents.defaults.models`, or
- Clear the allowlist (remove `agents.defaults.models`), or
- Pick a model from `/model list`.

Example allowlist config:

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

## Switching models in chat (`/model`)

You can switch models for the current session without restarting:

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model status
```

Notes:

- `/model` (and `/model list`) is a compact, numbered picker (model family + available providers).
- On Discord, `/model` and `/models` open an interactive picker with provider and model dropdowns plus a Submit step.
- `/model <#>` selects from that picker.
- `/model` persists the new session selection immediately.
- If the agent is idle, the next run uses the new model right away.
- If a run is already active, OpenClaw marks a live switch as pending and only restarts into the new model at a clean retry point.
- 如果工具活動或回覆輸出已經開始，待處理的切換可以保持排隊，直到稍後的重試機會或下一個使用者輪次。
- `/model status` 是詳細檢視（驗證候選項，以及設定時的提供者端點 `baseUrl` + `api` 模式）。
- 模型參照的解析是通過在**第一個** `/` 處進行分割。當輸入 `/model <ref>` 時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 風格），您必須包含提供者前綴（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 將按以下順序解析輸入：
  1. 別名匹配
  2. 對於該特定無前綴模型 ID 的唯一設定提供者匹配
  3. 已棄用，回退至設定的預設提供者
     如果該提供者不再暴露設定的預設模型，OpenClaw
     則改為回退至第一個設定的提供者/模型，以避免
     顯示過時的已移除提供者預設值。

完整的指令行為/設定：[斜線指令](/en/tools/slash-commands)。

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

預設顯示已設定的模型。實用的標誌：

- `--all`：完整目錄
- `--local`：僅限本機提供者
- `--provider <name>`：依提供者篩選
- `--plain`：每行一個模型
- `--json`：機器可讀輸出

### `models status`

顯示已解析的主要模型、後備模型、圖像模型以及已設定提供者的驗證概覽。它還會顯示在驗證儲存庫中找到的設定檔的 OAuth 到期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。
OAuth 狀態會始終顯示（並包含在 `--json` 輸出中）。如果已設定的提供者沒有憑證，`models status` 會列印一個 **Missing auth** 區塊。
JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`（每個提供者的有效驗證，包括由環境變數支援的憑證）。`auth.oauth` 僅包含驗證儲存庫設定檔的健康狀態；僅使用環境變數的提供者不會出現在那裡。
使用 `--check` 進行自動化（當憑證遺失或過期時退出 `1`，即將到期時退出 `2`）。
使用 `--probe` 進行即時驗證檢查；探測列可以來自驗證設定檔、環境憑證或 `models.json`。
如果明確的 `auth.order.<provider>` 省略了已儲存的設定檔，探測會回報 `excluded_by_auth_order` 而不嘗試連線。如果驗證存在但無法為該提供者解析可探測的模型，探測會回報 `status: no_model`。

驗證選擇取決於提供者/帳戶。對於永遠在線的閘道主機，API 金鑰通常是最可預測的選擇；也支援重複使用 Claude CLI 和現有的 Anthropic OAuth/權杖設定檔。

範例 (Claude CLI)：

```bash
claude auth login
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可選擇對模型進行探測以檢查工具和圖像支援。

主要旗標：

- `--no-probe`：跳過即時探測（僅限元資料）
- `--min-params <b>`：最小參數大小（十億）
- `--max-age-days <days>`：跳過舊模型
- `--provider <name>`：提供者前綴篩選器
- `--max-candidates <n>`：後備清單大小
- `--set-default`：將 `agents.defaults.model.primary` 設定為第一個選擇
- `--set-image`：將 `agents.defaults.imageModel.primary` 設定為第一個圖像選擇

探測需要 OpenRouter API 金鑰（來自身分設定檔或
`OPENROUTER_API_KEY`）。如果沒有金鑰，請使用 `--no-probe` 僅列出候選模型。

掃描結果的排序依據為：

1. 圖片支援
2. 工具延遲
3. 內文大小
4. 參數數量

輸入

- OpenRouter `/models` 清單（過濾器 `:free`）
- 需要來自身份設定檔或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（請參閱 [/environment](/en/help/environment)）
- 可選過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探測控制項：`--timeout`、`--concurrency`

在 TTY 中執行時，您可以互動式地選擇備用模型。在非互動式
模式下，傳遞 `--yes` 以接受預設值。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會寫入代理程式目錄下的 `models.json` 中（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非將 `models.mode` 設定為 `replace`，否則預設會合併此檔案。

相符提供者 ID 的合併模式優先順序：

- 代理程式 `models.json` 中已存在的非空 `baseUrl` 優先。
- 代理程式 `models.json` 中的非空 `apiKey` 僅在該提供者於目前設定/身分設定檔內容中非由 SecretRef 管理時優先。
- SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（env 參考使用 `ENV_VAR_NAME`，file/exec 參考使用 `secretref-managed`），而非儲存已解析的秘密。
- SecretRef 管理的提供者標頭值會從來源標記重新整理（env 參考使用 `secretref-env:ENV_VAR_NAME`，file/exec 參考使用 `secretref-managed`）。
- 空白或遺失的代理程式 `apiKey`/`baseUrl` 會回退至設定 `models.providers`。
- 其他提供者欄位會從設定和正規化的目錄資料重新整理。

標記持久化是以源為權威的：OpenClaw 從活動的源配置快照（解析前）寫入標記，而不是從已解析的運行時密鑰值寫入。
這適用於 OpenClaw 重新生成 `models.json` 的任何時候，包括像 `openclaw agent` 這樣的命令驅動路徑。

## 相關

- [模型提供商](/en/concepts/model-providers) — 提供商路由和身份驗證
- [模型故障轉移](/en/concepts/model-failover) — 故障轉移鏈
- [圖像生成](/en/tools/image-generation) — 圖像模型配置
- [音樂生成](/en/tools/music-generation) — 音樂模型配置
- [視頻生成](/en/tools/video-generation) — 視頻模型配置
- [配置參考](/en/gateway/configuration-reference#agent-defaults) — 模型配置鍵
