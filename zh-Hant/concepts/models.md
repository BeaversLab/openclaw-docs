---
summary: "模型 CLI：list、set、aliases、fallbacks、scan、status"
read_when:
  - Adding or modifying models CLI (models list/set/scan/aliases/fallbacks)
  - Changing model fallback behavior or selection UX
  - Updating model scan probes (tools/images)
title: "模型 CLI"
---

# 模型 CLI

有關驗證設定檔輪替、冷卻，以及其如何與備援互動，請參閱 [/concepts/model-failover](/zh-Hant/concepts/model-failover)。
快速供應商概覽 + 範例：[/concepts/model-providers](/zh-Hant/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 按照以下順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **備援** 模型（按順序）。
3. 轉移到下一個模型之前，會先在供應商內部發生 **供應商驗證備援**。

相關資訊：

- `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄（加上別名）。
- `agents.defaults.imageModel` **僅在** 主要模型無法接受圖片時使用。
- 各代理程式的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model`（請參閱 [/concepts/multi-agent](/zh-Hant/concepts/multi-agent)）。

## 快速模型策略

- 將您的主要模型設定為您可取得的最強大最新世代模型。
- 針對成本/延遲敏感的任務和風險較低的聊天使用備援模型。
- 對於啟用工具的代理程式或不受信任的輸入，請避免使用舊版/較弱階層的模型。

## 新手入門（建議）

如果您不想手動編輯設定檔，請執行新手入門：

```bash
openclaw onboard
```

它可以為常見的供應商設定模型 + 驗證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 和 **Anthropic** (API 金鑰或 `claude setup-token`)。

## 設定金鑰（概覽）

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.models`（允許清單 + 別名 + 供應商參數）
- `models.providers`（寫入 `models.json` 的自訂供應商）

模型參照會正規化為小寫。像 `z.ai/*` 這樣的供應商別名會正規化為 `zai/*`。

供應商設定範例（包括 OpenCode）位於 [/gateway/configuration](/zh-Hant/gateway/configuration#opencode)。

## “Model is not allowed” (and why replies stop)

如果設定了 `agents.defaults.models`，它將成為 `/model` 和會話覆蓋的 **允許清單**。當使用者選擇的模型不在該允許清單中時，OpenClaw 會返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

這發生在生成正常回覆 **之前**，因此訊息可能會感覺像是「沒有回應」。解決方法是：

- 將模型新增到 `agents.defaults.models`，或
- 清除允許清單 (移除 `agents.defaults.models`)，或
- 從 `/model list` 中選取一個模型。

範例允許清單設定：

```json5
{
  agent: {
    model: { primary: "anthropic/claude-sonnet-4-5" },
    models: {
      "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
      "anthropic/claude-opus-4-6": { alias: "Opus" },
    },
  },
}
```

## Switching models in chat (`/model`)

您可以在不重新啟動的情況下切換目前會話的模型：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

注意事項：

- `/model` (和 `/model list`) 是一個緊湊的編號選擇器 (模型系列 + 可用提供者)。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，其中包含提供者和模型下拉式選單以及提交步驟。
- `/model <#>` 從該選擇器中選取。
- `/model status` 是詳細檢視 (驗證候選項，以及在設定時，提供者端點 `baseUrl` + `api` 模式)。
- 模型引用的解析方式是分割 **第一個** `/`。輸入 `/model <ref>` 時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 樣式)，您必須包含提供者前綴 (例如：`/model openrouter/moonshotai/kimi-k2`)。
- 如果您省略提供者，OpenClaw 會將輸入視為 **預設提供者** 的別名或模型 (僅當模型 ID 中沒有 `/` 時有效)。

完整的指令行為/設定：[Slash commands](/zh-Hant/tools/slash-commands)。

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

`openclaw models` (沒有子指令) 是 `models status` 的捷徑。

### `models list`

預設顯示已設定的模型。有用的旗標：

- `--all`：完整目錄
- `--local`：僅限本機提供者
- `--provider <name>`：依提供者篩選
- `--plain`: 每行一個模型
- `--json`: 機器可讀輸出

### `models status`

顯示已解析的主模型、備用模型、圖像模型，以及已配置提供者的驗證概覽。它還會顯示在驗證儲存庫中找到的設定檔的 OAuth 過期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主模型。
OAuth 狀態總是會顯示（並包含在 `--json` 輸出中）。如果已配置的提供者沒有憑證，`models status` 會列印 **Missing auth** 區塊。
JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`（每個提供者的有效驗證）。
請使用 `--check` 進行自動化（當遺失/過期時退出 `1`，即將過期時退出 `2`）。

驗證選擇取決於提供者/帳戶。對於常駐的閘道主機，API 金鑰通常是最可預測的；也支援訂閱權杖流程。

範例（Anthropic setup-token）：

```bash
claude setup-token
openclaw models status
```

## 掃描（OpenRouter 免費模型）

`openclaw models scan` 會檢查 OpenRouter 的 **免費模型目錄**，並可以選擇針對工具和圖像支援探測模型。

主要旗標：

- `--no-probe`: 跳過即時探測（僅限中繼資料）
- `--min-params <b>`: 最小參數大小（十億）
- `--max-age-days <days>`: 跳過較舊的模型
- `--provider <name>`: 提供者前綴篩選器
- `--max-candidates <n>`: 備用清單大小
- `--set-default`: 將 `agents.defaults.model.primary` 設定為第一個選擇
- `--set-image`: 將 `agents.defaults.imageModel.primary` 設定為第一個圖像選擇

探測需要 OpenRouter API 金鑰（來自驗證設定檔或 `OPENROUTER_API_KEY`）。如果沒有金鑰，請使用 `--no-probe` 僅列出候選項目。

掃描結果排序依據：

1. 圖像支援
2. 工具延遲
3. 語境大小
4. 參數數量

輸入

- OpenRouter `/models` 清單（篩選 `:free`）
- 需要來自 auth profiles 的 OpenRouter API 金鑰或 `OPENROUTER_API_KEY`（請參閱 [/environment](/zh-Hant/help/environment)）
- 可選過濾器：`--max-age-days`、`--min-params`、`--provider`、`--max-candidates`
- 探針控制：`--timeout`、`--concurrency`

在 TTY 中執行時，您可以互動選擇後備模型。在非互動模式下，傳遞 `--yes` 以接受預設值。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會寫入 agent 目錄下的 `models.json`（預設為 `~/.openclaw/agents/<agentId>/agent/models.json`）。除非將 `models.mode` 設定為 `replace`，否則預設會合併此檔案。

相符提供者 ID 的合併模式優先順序：

- 已存在於 agent `models.json` 中的非空 `baseUrl` 優先。
- 僅當該提供者在目前的 config/auth-profile 語境中非由 SecretRef 管理時，agent `models.json` 中的非空 `apiKey` 才會優先。
- SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（env 參考為 `ENV_VAR_NAME`，file/exec 參考為 `secretref-managed`），而不是保存解析後的密碼。
- SecretRef 管理的提供者標頭值會從來源標記重新整理（env 參考為 `secretref-env:ENV_VAR_NAME`，file/exec 參考為 `secretref-managed`）。
- 空白或遺失的 agent `apiKey`/`baseUrl` 會退回到 config `models.providers`。
- 其他提供者欄位會從 config 和正規化目錄資料重新整理。

標記持久性由來源授權：OpenClaw 從使用中的來源 config 快照（解析前）寫入標記，而非從解析後的執行時期密碼值。
這適用於 OpenClaw 每次重新產生 `models.json` 時，包括像 `openclaw agent` 這類命令驅動路徑。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
