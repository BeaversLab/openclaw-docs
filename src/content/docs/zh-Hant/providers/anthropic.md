---
summary: "在 OpenClaw 中透過 API 金鑰使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列並透過 API 提供存取權。在 OpenClaw 中，新的 Anthropic 設定應使用 API 金鑰。舊有的 Anthropic token 設定檔若已設定，在執行時間仍會受到支援。

<Warning>
對於 OpenClaw 中的 Anthropic，計費劃分如下：

- **Anthropic API 金鑰**：標準的 Anthropic API 計費。
- **OpenClaw 內部的 Claude 訂閱驗證**：Anthropic 於 **2026 年 4 月 4 日下午 12:00 PT / 晚上 8:00 BST** 告知 OpenClaw 用戶，這將被視為第三方應用程式使用，並需要 **額外使用量** (隨用隨付，與訂閱分開計費)。

我們本地的重現結果符合該劃分：

- 直接的 `claude -p` 可能仍然有效
- 當提示詞識別出 OpenClaw 時，`claude -p --append-system-prompt ...` 可能會觸發額外使用量防護機制
- 相同的類 OpenClaw 系統提示詞在 Anthropic SDK + `ANTHROPIC_API_KEY` 路徑上 **不會** 重現該阻擋

因此實用規則是：**使用 Anthropic API 金鑰，或搭配額外使用量的 Claude 訂閱**。如果您希望最明確的生產環境路徑，請使用 Anthropic API 金鑰。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考資料](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概覽](https://platform.claude.com/docs/en/agent-sdk/overview)

- [透過 Pro 或 Max 方案使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [透過 Team 或 Enterprise 方案使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

如果您希望最明確的計費路徑，請改用 Anthropic API 金鑰。OpenClaw 也支援其他訂閱式選項，包括 [OpenAI Codex](/en/providers/openai)、[Qwen Cloud Coding Plan](/en/providers/qwen)、[MiniMax Coding Plan](/en/providers/minimax) 以及 [Z.AI / GLM Coding Plan](/en/providers/glm)。

</Warning>

## 選項 A：Anthropic API 金鑰

**最適用於：** 標準 API 存取和隨用隨付計費。在 Anthropic Console 中建立您的 API 金鑰。

### CLI 設定

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Anthropic 設定片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 思考預設值

- 在 OpenClaw 中，當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive` 思考模式。
- 您可以在每個訊息 (`/think:<level>`) 或模型參數中覆寫：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相關 Anthropic 文件：
  - [自適應思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [擴展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式

OpenClaw 的共用 `/fast` 切換開關也支援直接公開的 Anthropic 流量，包括發送到 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證請求。

- `/fast on` 對應至 `service_tier: "auto"`
- `/fast off` 對應至 `service_tier: "standard_only"`
- 設定預設值：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-6": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

重要限制：

- OpenClaw 僅針對直接 `api.anthropic.com` 請求注入 Anthropic 服務層級。如果您透過 Proxy 或閘道路由 `anthropic/*`，`/fast` 將不會更改 `service_tier`。
- 當兩者都設定時，明確的 Anthropic `serviceTier` 或 `service_tier` 模型參數會覆寫 `/fast` 預設值。
- Anthropic 在回應中的 `usage.service_tier` 下回報有效層級。對於沒有優先層級容量的帳戶，`service_tier: "auto"` 可能仍會解析為 `standard`。

## 提示詞快取

OpenClaw 支援 Anthropic 的提示詞快取功能。這僅限於 **API**；舊版 Anthropic Token 驗證不會遵守快取設定。

### 設定

在您的模型設定中使用 `cacheRetention` 參數：

| 數值    | 快取持續時間 | 說明                 |
| ------- | ------------ | -------------------- |
| `none`  | 無快取       | 停用提示詞快取       |
| `short` | 5 分鐘       | API 金鑰驗證的預設值 |
| `long`  | 1 小時       | 擴展快取             |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### 預設值

使用 Anthropic API 金鑰驗證時，OpenClaw 會自動為所有 Anthropic 模型套用 `cacheRetention: "short"` (5 分鐘快取)。您可以透過在設定中明確設定 `cacheRetention` 來覆寫此設定。

### 各代理程式 cacheRetention 覆寫

使用模型層級參數作為基準，然後透過 `agents.list[].params` 覆寫特定代理程式。

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" }, // baseline for most agents
        },
      },
    },
    list: [
      { id: "research", default: true },
      { id: "alerts", params: { cacheRetention: "none" } }, // override for this agent only
    ],
  },
}
```

快取相關參數的配置合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (比對 `id`，按鍵值覆寫)

這允許一個代理程式保持長期快取，而同一模型上的另一個代理程式則停用快取，以避免在突發/低重用流量上產生寫入成本。

### Bedrock Claude 注意事項

- Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在配置時接受 `cacheRetention` 透傳。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。
- 當未設定明確值時，Anthropic API 金鑰的智慧預設值也會為 Bedrock 上的 Claude 模型參照植入 `cacheRetention: "short"`。

## 1M 上下文視窗 (Anthropic beta)

Anthropic 的 1M 上下文視窗處於 beta 封鎖狀態。在 OpenClaw 中，請針對支援的 Opus/Sonnet 模型使用 `params.context1m: true` 逐一啟用。

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { context1m: true },
        },
      },
    },
  },
}
```

OpenClaw 會將此對應至 Anthropic 請求中的 `anthropic-beta: context-1m-2025-08-07`。

僅當該模型的 `params.context1m` 被明確設定為 `true` 時，才會啟用此功能。

需求：Anthropic 必須允許該憑證使用長上下文 (通常是 API 金鑰計費，或是啟用了 Extra Usage 的 OpenClaw Claude 登入路徑/舊版權杖驗證)。否則 Anthropic 會傳回：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：當使用舊版 Anthropic 權杖驗證 (`sk-ant-oat-*`) 時，Anthropic 目前會拒絕 `context-1m-*` beta 請求。如果您使用該舊版驗證模式配置 `context1m: true`，OpenClaw 會記錄警告並透過跳過 context1m beta 標頭 (同時保留所需的 OAuth betas) 來還原至標準上下文視窗。

## 已移除：Claude CLI 後端

內建的 Anthropic `claude-cli` 後端已被移除。

- Anthropic 於 2026 年 4 月 4 日的通知指出，由 OpenClaw 驅動的 Claude 登入流量屬於第三方協力廠商使用，並需要 **Extra Usage**。
- 我們的本地重現測試也顯示，當附加的提示詞識別出 OpenClaw 時，直接 `claude -p --append-system-prompt ...` 也可能觸發相同的防護機制。
- 相同的 OpenClaw 風格系統提示詞在 Anthropic SDK + `ANTHROPIC_API_KEY` 路徑上則不會觸發該防護機制。
- 請使用 Anthropic API 金鑰來處理 OpenClaw 中的 Anthropic 流量。

## 注意事項

- Anthropic 的公開 Claude Code 文件仍然記載了直接 CLI 用法，例如
  `claude -p`，但 Anthropic 對 OpenClaw 用戶的特別通知指出，
  **OpenClaw** 的 Claude 登入路徑屬於第三方套件的使用，需要
  **額外使用量**（與訂閱分開計費的隨用隨付）。
  我們本地的重現結果也顯示，當附加的提示
  識別出 OpenClaw 時，直接的
  `claude -p --append-system-prompt ...` 可能會遇到相同的防護，而相同的
  提示結構在 Anthropic SDK + `ANTHROPIC_API_KEY` 路徑上則不會重現此問題。對於生產環境，我們
  改用 Anthropic API 金鑰。
- Anthropic 設定 Token 在 OpenClaw 中再次作為舊版/手動路徑提供。Anthropic 針對 OpenClaw 的特定計費通知仍然適用，因此請預期 Anthropic 會對此路徑要求 **額外使用量**，並在此前提下使用。
- 驗證詳細資訊與重複使用規則位於 [/concepts/oauth](/en/concepts/oauth)。

## 疑難排解

**401 錯誤 / Token 突然失效**

- 舊版 Anthropic Token 驗證可能會過期或被撤銷。
- 對於新的設定，請遷移至 Anthropic API 金鑰。

**找不到提供者 "anthropic" 的 API 金鑰**

- 驗證是 **每個代理程式** 獨立的。新代理程式不會繼承主要代理程式的金鑰。
- 請為該代理程式重新執行上架流程，或在閘道主機上設定 API 金鑰，
  然後使用 `openclaw models status` 進行驗證。

**找不到設定檔 `anthropic:default` 的憑證**

- 執行 `openclaw models status` 以查看目前生效的驗證設定檔。
- 請重新執行上架流程，或為該設定檔路徑設定 API 金鑰。

**沒有可用的驗證設定檔（全部都在冷卻/不可用狀態）**

- 檢查 `openclaw models status --json` 中是否有 `auth.unusableProfiles`。
- Anthropic 的速率限制冷卻可能是特定於模型的，因此當目前使用的模型正在冷卻時，同屬的
  Anthropic 模型可能仍然可用。
- 新增另一個 Anthropic 設定檔或等待冷卻結束。

更多資訊：[/gateway/troubleshooting](/en/gateway/troubleshooting) 和 [/help/faq](/en/help/faq)。
