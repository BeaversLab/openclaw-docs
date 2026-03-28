---
summary: "Models CLI: list, set, aliases, fallbacks, scan, status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

請參閱 [/concepts/model-failover](/zh-Hant/concepts/model-failover) 以了解設定檔輪替、冷卻時間，以及其如何與備援機制互動。
快速供應商概覽與範例：[/concepts/model-providers](/zh-Hant/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 依下列順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **備援** (按順序)。
3. **供應商驗證備援** 會在移至下一個模型之前，於供應商內部進行。

相關連結：

- `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄 (加上別名)。
- `agents.defaults.imageModel` **僅在**主要模型無法接受圖像時使用。
- `agents.defaults.imageGenerationModel` 由共享的圖像生成功能使用。如果省略，`image_generate` 仍可以從相容的基於認證支援的圖像生成外掛程式推斷出預設提供者。
- 每個代理程式的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（參閱 [/concepts/multi-agent](/zh-Hant/concepts/multi-agent)）。

## 快速模型策略

- 將您的主要模型設定為您可用的最強大的最新一代模型。
- 對於成本/延遲敏感的任務和風險較低的聊天，請使用備用模型。
- 對於啟用工具的代理程式或不受信任的輸入，請避免使用舊版/較弱層級的模型。

## 入門指南（建議）

如果您不想手動編輯設定，請執行入門指南：

```exec
openclaw onboard
```

它可以為常見的提供商設定模型 + 身份驗證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 `claude setup-token`)。

## 設定金鑰 (概覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (允許列表 + 別名 + 提供商參數)
- `models.providers` (寫入 `models.json` 的自訂提供商)

模型參照會正規化為小寫。提供商別名如 `z.ai/*` 會正規化為 `zai/*`。

提供商設定範例（包括 OpenCode）位於 [/providers/opencode](/zh-Hant/providers/opencode)。

## "不允許使用模型"（以及回覆停止的原因）

如果設定了 `agents.defaults.models`，它就會成為 `/model` 和會話覆寫的 **允許清單**。當使用者選取一個不在該允許清單中的模型時，OpenClaw 會回傳：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

這會在產生一般回覆 **之前** 發生，因此訊息可能會讓人感覺「沒有回應」。解決方法是：

- 將模型新增到 `agents.defaults.models`，或
- 清除允許清單 (移除 `agents.defaults.models`)，或
- 從 `/model list` 中選取一個模型。

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

您可以在不重新啟動的情況下切換目前會話的模型：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

備註：

- `/model` (以及 `/model list`) 是一個精簡的編號選取器 (模型系列 + 可用供應商)。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含供應商和模型下拉選單，以及一個提交步驟。
- `/model <#>` 從該選擇器中選取。
- `/model status` 是詳細視圖（身份驗證候選者，且在設定時，包含供應商端點 `baseUrl` + `api` 模式）。
- 模型參照是通過在 **第一個** `/` 處進行拆分來解析的。在輸入 `/model <ref>` 時，請使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 風格），則必須包含供應商前綴（例如：`/model openrouter/moonshotai/kimi-k2`）。
- 如果您省略供應商，OpenClaw 會將輸入視為**預設供應商**的別名或模型（僅在模型 ID 中沒有 `/` 時有效）。

完整的指令行為/設定：[Slash commands](/zh-Hant/tools/slash-commands)。

## CLI 指令

```exec
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

預設顯示已設定的模型。實用的旗標：

- `--all`：完整目錄
- `--local`：僅限本地供應商
- `--provider <name>`：依供應商篩選
- `--plain`：每行一個模型
- `--json`：機器可讀輸出

### `models status`

顯示已解析的主要模型、後備模型、圖片模型，以及已設定供應商的驗證概覽。它也會顯示在驗證儲存中找到的設定檔的過期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。
OAuth 狀態會顯示（並包含在 `--json` 輸出中）。如果已設定的供應商沒有憑證，`models status` 會列印 **Missing auth** 區段。
JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`（各供應商的有效驗證）。
使用 `--check` 進行自動化（當遺失/過期時退出 `1`，即將過期時退出 `2`）。

驗證選擇取決於供應商/帳戶。對於始終在線的閘道主機，API 金鑰通常是最可預測的；也支援訂閱權杖流程。

範例 (Anthropic setup-token)：

```exec
claude setup-token
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可選擇性地探測模型對工具和圖像的支援。

主要旗標：

- `--no-probe`：跳過即時探測 (僅限元資料)
- `--min-params <b>`：最小參數大小 (十億)
- `--max-age-days <days>`：跳過較舊的模型
- `--provider <name>`：供應商前綴篩選器
- `--max-candidates <n>`：備用清單大小
- `--set-default`：將 `agents.defaults.model.primary` 設定為第一個選項
- `--set-image`：將 `agents.defaults.imageModel.primary` 設定為第一個圖像選項

探測需要 OpenRouter API 金鑰（來自驗證設定檔或
`OPENROUTER_API_KEY`）。如果沒有金鑰，請使用 `--no-probe` 僅列出候選模型。

掃描結果排名依據：

1. 圖片支援
2. 工具延遲
3. 內容大小
4. 參數數量

輸入

- OpenRouter `/models` 列表（過濾器 `:free`）
- 需要來自驗證設定檔的 OpenRouter API 金鑰或 `OPENROUTER_API_KEY`（請參閱 [/environment](/en/help/environment））
- 可選過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探測控制：`--timeout`、`--concurrency`

在 TTY 中執行時，您可以互動式地選擇備用模型。在非互動
模式下，請傳遞 `--yes` 以接受預設值。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會被寫入到 agent 目錄（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非將 `models.mode` 設定為 `replace`，否則此檔案預設會被合併。

相符提供者 ID 的合併模式優先順序：

- 已存在於 agent `models.json` 中的非空 `baseUrl` 優先。
- agent `models.json` 中的非空 `apiKey` 僅在該提供者於目前的 config/auth-profile 語境中不是由 SecretRef 管理時優先。
- 由 SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（環境參考為 `ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`），而不是持續儲存已解析的機密。
- 由 SecretRef 管理的提供者標頭值會從來源標記重新整理（環境參考為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`）。
- 空白或遺失的 agent `apiKey`/`baseUrl` 會回退到 config `models.providers`。
- 其他提供者欄位會從設定和正規化的目錄資料重新整理。

標記持久性以來源為準：OpenClaw 會從使用中的來源設定快照（解析前 pre-resolution）寫入標記，而非從解析後的執行時期機密值寫入。每當 OpenClaw 重新生成 `models.json` 時皆適用此規則，包括像 `openclaw agent` 這類由指令驅動的路徑。
