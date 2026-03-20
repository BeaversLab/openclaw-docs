---
summary: "Models CLI: list, set, aliases, fallbacks, scan, status"
read_when:
  - 正在新增或修改模型 CLI (models list/set/scan/aliases/fallbacks)
  - 正在變更模型後援行為或選擇 UX
  - 正在更新模型掃描探測 (tools/images)
title: "Models CLI"
---

# Models CLI

請參閱 [/concepts/model-failover](/zh-Hant/concepts/model-failover) 以了解認證設定檔輪替、冷卻時間，以及其與後援機制的互動方式。
快速供應商總覽與範例：[/concepts/model-providers](/zh-Hant/concepts/model-providers)。

## 模型選擇運作方式

OpenClaw 依以下順序選擇模型：

1. **主要** 模型 (`agents.defaults.model.primary` 或 `agents.defaults.model`)。
2. `agents.defaults.model.fallbacks` 中的 **後援** (依順序)。
3. **供應商認證失效切換** 會在移至下一個模型之前於供應商內部發生。

相關：

- `agents.defaults.models` 是 OpenClaw 可使用的模型允許清單/目錄 (含別名)。
- `agents.defaults.imageModel` **僅在** 主要模型無法接受圖片時使用。
- `agents.defaults.imageGenerationModel` 由共享的圖片生成功能使用。若省略，`image_generate` 仍可從相容的認證支援圖片生成外掛推斷預設供應商。
- 個別代理的預設值可以透過 `agents.list[].model` 加上綁定來覆寫 `agents.defaults.model` (請參閱 [/concepts/multi-agent](/zh-Hant/concepts/multi-agent))。

## 快速模型策略

- 將您的主要模型設定為您可用的最新世代中最強的模型。
- 針對成本/延遲敏感的工作與較不重要的聊天使用後援模型。
- 對於已啟用工具的代理或不受信任的輸入，請避免使用較舊/較弱的模型階層。

## 新手引導 (建議)

如果您不想手動編輯設定檔，請執行新手引導：

```bash
openclaw onboard
```

它可以為常見供應商設定模型與認證，包括 **OpenAI Code (Codex) 訂閱** (OAuth) 與 **Anthropic** (API 金鑰或 `claude setup-token`)。

## 設定金鑰 (總覽)

- `agents.defaults.model.primary` 和 `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel.primary` 和 `agents.defaults.imageModel.fallbacks`
- `agents.defaults.imageGenerationModel.primary` 和 `agents.defaults.imageGenerationModel.fallbacks`
- `agents.defaults.models` (allowlist + aliases + provider params)
- `models.providers` (寫入 `models.json` 的自訂提供者)

Model refs 會正規化為小寫。提供者別名如 `z.ai/*` 會正規化
為 `zai/*`。

提供者設定範例（包括 OpenCode）位於
[/gateway/configuration](/zh-Hant/gateway/configuration#opencode)。

## "Model is not allowed" (以及為何回覆停止)

如果設定了 `agents.defaults.models`，它將成為 `/model` 和
session 覆寫的 **allowlist**。當使用者選擇不在該 allowlist 中的模型時，
OpenClaw 會回傳：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

這發生在產生正常回覆**之前**，因此訊息可能會感覺
「沒有回應」。解決方法是：

- 將模型新增到 `agents.defaults.models`，或
- 清除 allowlist (移除 `agents.defaults.models`)，或
- 從 `/model list` 選擇一個模型。

Allowlist 設定範例：

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

## 在聊天中切換模型 (`/model`)

您可以在不重新啟動的情況下切換目前 session 的模型：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model status
```

備註：

- `/model` (以及 `/model list`) 是一個精簡的、編號的選擇器 (模型系列 + 可用提供者)。
- 在 Discord 上，`/model` 和 `/models` 會開啟一個互動式選擇器，包含提供者和模型下拉式選單以及提交步驟。
- `/model <#>` 從該選擇器中選擇。
- `/model status` 是詳細檢視 (auth 候選者以及，設定時，提供者端點 `baseUrl` + `api` 模式)。
- Model refs 透過在 **第一個** `/` 分割來解析。輸入 `/model <ref>` 時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 風格)，您必須包含提供者前綴 (例如：`/model openrouter/moonshotai/kimi-k2`)。
- 如果您省略提供者，OpenClaw 會將輸入視為 **default provider** 的別名或模型 (僅當模型 ID 中沒有 `/` 時有效)。

完整指令行為/設定：[Slash commands](/zh-Hant/tools/slash-commands)。

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

預設顯示已設定的模型。實用旗標：

- `--all`：完整目錄
- `--local`：僅本機提供者
- `--provider <name>`：依提供者篩選
- `--plain`：每行一個模型
- `--json`：機器可讀輸出

### `models status`

顯示已解析的主要模型、後備模型、圖像模型，以及已設定提供者的授權概覽。它還會顯示在授權儲存區中找到的設定檔的 OAuth 到期狀態（預設在 24 小時內發出警告）。`--plain` 僅列印已解析的主要模型。
OAuth 狀態一律會顯示（並包含在 `--json` 輸出中）。如果已設定的提供者沒有憑證，`models status` 會列印 **Missing auth** 區塊。
JSON 包含 `auth.oauth`（警告視窗 + 設定檔）和 `auth.providers`
（每個提供者的有效授權）。
使用 `--check` 進行自動化（當憑證遺失/過期時退出 `1`，即將到期時退出 `2`）。

授權選擇取決於提供者/帳戶。對於永久連線的閘道主機，API 金鑰通常是最可預測的；也支援訂閱權杖流程。

範例（Anthropic setup-token）：

```bash
claude setup-token
openclaw models status
```

## 掃描（OpenRouter 免費模型）

`openclaw models scan` 會檢查 OpenRouter 的 **free model catalog**，並可選擇對模型進行探測以檢查工具和圖像支援。

主要旗標：

- `--no-probe`：跳過即時探測（僅中繼資料）
- `--min-params <b>`：最小參數大小（十億）
- `--max-age-days <days>`：跳過較舊的模型
- `--provider <name>`：提供者前綴篩選器
- `--max-candidates <n>`：後備清單大小
- `--set-default`：將 `agents.defaults.model.primary` 設定為第一個選擇
- `--set-image`：將 `agents.defaults.imageModel.primary` 設定為第一個圖像選擇

探測需要 OpenRouter API 金鑰（來自 auth profiles 或
`OPENROUTER_API_KEY`）。如果沒有金鑰，請使用 `--no-probe` 僅列出候選項。

掃描結果的排序依據為：

1. 圖片支援
2. 工具延遲
3. 上下文大小
4. 參數數量

輸入

- OpenRouter `/models` 列表 (篩選 `:free`)
- 需要來自 auth profiles 或 `OPENROUTER_API_KEY` 的 OpenRouter API 金鑰 (參見 [/environment](/zh-Hant/help/environment))
- 可選篩選器：`--max-age-days`, `--min-params`, `--provider`, `--max-candidates`
- 探測控制：`--timeout`, `--concurrency`

在 TTY 中執行時，您可以互動地選擇備選模型。在非互動
模式下，傳遞 `--yes` 以接受預設值。

## 模型註冊表 (`models.json`)

`models.providers` 中的自訂提供者會寫入到 agent
目錄（預設 `~/.openclaw/agents/<agentId>/agent/models.json`）下的 `models.json` 中。除非
`models.mode` 被設為 `replace`，否則預設會合併此檔案。

匹配提供者 ID 的合併模式優先順序：

- agent `models.json` 中已存在的非空 `baseUrl` 優先。
- agent `models.json` 中的非空 `apiKey` 僅在該提供者未在目前 config/auth-profile 上下文中由 SecretRef 管理時優先。
- 由 SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`），而不是持續化已解析的密碼。
- 由 SecretRef 管理的提供者標頭值會從來源標記重新整理（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）。
- 空白的或遺失的 agent `apiKey`/`baseUrl` 會回退到 config `models.providers`。
- 其他提供者欄位會從 config 和標準化的目錄資料重新整理。

Marker 持久性是源權威的：OpenClaw 從活躍的源配置快照（解析前）寫入 marker，而不是從解析後的運行時 secret 值寫入。
這適用於 OpenClaw 重新生成 `models.json` 的任何時候，包括像 `openclaw agent` 這樣的命令驅動路徑。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
