---
summary: "Models CLI：清單、設定、別名、備援、掃描、狀態"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "Models CLI"
---

# Models CLI

關於 auth profile
輪替、冷卻時間，以及其與備援互動方式的說明，請參閱 [/concepts/model-failover](/en/concepts/model-failover)。
快速供應商概覽 + 範例：[/concepts/model-providers](/en/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 依照以下順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **備援** (依順序)。
3. **供應商 auth 備援** 會在移至下一個模型之前，在供應商內部發生。

相關：

- `agents.defaults.models` 是 OpenClaw 可以使用的模型允許清單/目錄 (加上別名)。
- `agents.defaults.imageModel` 僅在主要模型無法接受圖片時 **才會使用**。
- `agents.defaults.imageGenerationModel` 由共享的圖片生成功能使用。如果省略，`image_generate` 仍然可以從相容的 auth 支援圖片生成外掛推斷供應商預設值。如果您設定特定的供應商/模型，也請設定該供應商的 auth/API 金鑰。
- 每個代理程式的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model` (請參閱 [/concepts/multi-agent](/en/concepts/multi-agent))。

## 快速模型策略

- 將您的主要模型設定為您可用的最強最新世代模型。
- 針對成本/延遲敏感的任務和低風險聊天，請使用備援模型。
- 對於啟用工具的代理程式或不受信任的輸入，請避免使用較舊/較弱的模型層級。

## 入門 (建議)

如果您不想手動編輯設定檔，請執行入門程式：

```bash
openclaw onboard
```

它可以為常見供應商設定模型 + auth，包括 **OpenAI Code (Codex)
訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 `claude setup-token`)。

## 設定金鑰 (概覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (允許清單 + 別名 + 供應商參數)
- `models.providers` (寫入 `models.json` 的自訂供應商)

模型參照會被正規化為小寫。供應商別名如 `z.ai/*` 會正規化
為 `zai/*`。

供應商配置範例（包括 OpenCode）位於
[/providers/opencode](/en/providers/opencode)。

## "模型不允許" (以及為何回覆停止)

如果設定了 `agents.defaults.models`，它就會成為 `/model` 和
會話覆寫的 **允許清單**。當使用者選擇的模型不在該允許清單中時，
OpenClaw 會傳回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

這會在產生正常回覆 **之前** 發生，因此訊息可能會讓人覺得
「沒有回應」。解決方法是：

- 將模型加入 `agents.defaults.models`，或
- 清除允許清單 (移除 `agents.defaults.models`)，或
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

您可以為目前會話切換模型，而不需重新啟動：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

備註：

- `/model` (以及 `/model list`) 是一個精簡的編號選擇器 (模型系列 + 可用供應商)。
- 在 Discord 上，`/model` 和 `/models` 會開啟互動式選擇器，包含供應商和模型下拉選單以及提交步驟。
- `/model <#>` 從該選擇器中選取。
- `/model status` 是詳細檢視 (驗證候選者和設定時的供應商端點 `baseUrl` + `api` 模式)。
- 模型參照會以分割 **第一個** `/` 來解析。輸入 `/model <ref>` 時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 風格)，您必須包含供應商前綴 (範例: `/model openrouter/moonshotai/kimi-k2`)。
- 如果您省略供應商，OpenClaw 會將輸入視為 **預設供應商** 的別名或模型 (僅在模型 ID 中沒有 `/` 時有效)。

完整指令行為/配置：[斜線指令](/en/tools/slash-commands)。

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

`openclaw models` (無子指令) 是 `models status` 的捷徑。

### `models list`

預設顯示已配置的模型。實用旗標：

- `--all`: 完整目錄
- `--local`: 僅本地提供商
- `--provider <name>`: 依提供商篩選
- `--plain`: 每行一個模型
- `--json`: 機器可讀輸出

### `models status`

顯示已解析的主要模型、後備模型、圖像模型以及已配置提供商的
驗證概覽。它也會顯示在驗證儲存空間中找到的設定檔之 OAuth 過期狀態
（預設在 24 小時內發出警告）。`--plain` 僅列印
已解析的主要模型。
OAuth 狀態一律會顯示（並包含在 `--json` 輸出中）。若已配置的
提供商沒有憑證，`models status` 會列印一個 **Missing auth** 區塊。
JSON 包含 `auth.oauth` (警告視窗 + 設定檔) 和 `auth.providers`
(每個提供商的有效驗證)。
請使用 `--check` 進行自動化 (當遺失/過期時退出 `1`，將過期時退出 `2`)。

驗證選擇取決於提供商/帳戶。對於持續運作的閘道主機，API 金鑰通常是最可預測的；同時也支援訂閱令牌流程。

範例 (Anthropic setup-token):

```bash
claude setup-token
openclaw models status
```

## 掃描 (OpenRouter 免費模型)

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄** 並可選地
探測模型對工具和圖像的支援。

主要旗標：

- `--no-probe`: 跳過即時探測 (僅元資料)
- `--min-params <b>`: 最小參數大小 (十億)
- `--max-age-days <days>`: 跳過舊模型
- `--provider <name>`: 提供商前綴篩選器
- `--max-candidates <n>`: 後備清單大小
- `--set-default`: 將 `agents.defaults.model.primary` 設定為第一個選擇
- `--set-image`: 將 `agents.defaults.imageModel.primary` 設定為第一個圖像選擇

探測需要 OpenRouter API 金鑰（來自認證設定檔或
`OPENROUTER_API_KEY`）。若沒有金鑰，請使用 `--no-probe` 僅列出候選項。

掃描結果排名依據：

1. 圖片支援
2. 工具延遲
3. 上下文大小
4. 參數數量

輸入

- OpenRouter `/models` 清單 (篩選器 `:free`)
- 需要來自認證設定檔或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰（請參閱 [/environment](/en/help/environment)）
- 可選篩選器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探測控制：`--timeout`、`--concurrency`

在 TTY 中執行時，您可以互動選擇備援。在非互動
模式下，傳遞 `--yes` 以接受預設值。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂供應商會寫入代理程式目錄（預設 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非將 `models.mode` 設定為 `replace`，否則此檔案預設會被合併。

匹配供應商 ID 的合併模式優先順序：

- 已存在於代理程式 `models.json` 中的非空 `baseUrl` 優先。
- 代理程式 `models.json` 中的非空 `apiKey` 僅在該供應商於目前設定/認證設定檔內容中非由 SecretRef 管理時優先。
- 由 SecretRef 管理的供應商 `apiKey` 值是從來源標記（環境參照為 `ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`）重新整理，而非持久化已解析的機密。
- 由 SecretRef 管理的供應商標頭值是從來源標記（環境參照為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`）重新整理。
- 空白或遺失的代理程式 `apiKey`/`baseUrl` 會回退至設定 `models.providers`。
- 其他供應商欄位會從設定和正規化的目錄資料重新整理。

Marker 持久性以來源為準則：OpenClaw 從活動來源配置快照（解析前）寫入標記，而非從已解析的運行時密鑰值。這適用於 OpenClaw 重新生成 `models.json` 的任何情況，包括類似 `openclaw agent` 的命令驅動路徑。
