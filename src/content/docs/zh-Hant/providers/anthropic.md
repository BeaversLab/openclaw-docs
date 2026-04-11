---
summary: "在 OpenClaw 中透過 API 金鑰或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列，並透過 API 和 Claude CLI 提供存取權。在 OpenClaw 中，同時支援 Anthropic API 金鑰和 Claude CLI 的重複使用。若已設定現有的舊版 Anthropic token 設定檔，執行階段仍會予以採用。

<Warning>
Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用方式再次獲准，因此除非 Anthropic 發布新政策，否則 OpenClaw 將此整合中的 Claude CLI 重複使用和 `claude -p` 使用視為已獲授權。

對於長期存在的閘道主機，Anthropic API 金鑰仍然是最清晰且最可預測的生產路徑。如果您已在主機上使用 Claude CLI，OpenClaw 可以直接重複使用該登入資訊。

Anthropic 目前的公開文件：

- [Claude Code CLI 參考資料](https://code.claude.com/docs/en/cli-reference)
- [Claude Agent SDK 概覽](https://platform.claude.com/docs/en/agent-sdk/overview)

- [在 Pro 或 Max 方案中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [在 Team 或 Enterprise 方案中使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

如果您想要最清晰的計費路徑，請改用 Anthropic API 金鑰。
OpenClaw 也支援其他訂閱式選項，包括 [OpenAI
Codex](/en/providers/openai)、[Qwen Cloud Coding Plan](/en/providers/qwen)、
[MiniMax Coding Plan](/en/providers/minimax) 和 [Z.AI / GLM Coding
Plan](/en/providers/glm)。

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

- 在未設定明確思考層級的情況下，Anthropic Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。
- 您可以針對每則訊息 (`/think:<level>`) 或在模型參數中覆寫：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相關 Anthropic 文件：
  - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式

OpenClaw 的共用 `/fast` 切換開關也支援直接的公開 Anthropic 流量，包括發送到 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證請求。

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

- OpenClaw 僅針對直接 `api.anthropic.com` 請求注入 Anthropic 服務層級。如果您透過 Proxy 或 Gateway 路由 `anthropic/*`，`/fast` 將保持 `service_tier` 不變。
- 明確指定的 Anthropic `serviceTier` 或 `service_tier` 模型參數會在兩者皆設定時覆蓋 `/fast` 預設值。
- Anthropic 會在回應中的 `usage.service_tier` 下回報有效層級。對於不具備 Priority Tier 容量的帳戶，`service_tier: "auto"` 仍可能解析為 `standard`。

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

使用 Anthropic API 金鑰驗證時，OpenClaw 會自動為所有 Anthropic 模型套用 `cacheRetention: "short"`（5 分鐘快取）。您可以透過在設定中明確設定 `cacheRetention` 來覆蓋此設定。

### 各代理程式 cacheRetention 覆寫

使用模型層級參數作為基準，然後透過 `agents.list[].params` 覆蓋特定 Agent。

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
2. `agents.list[].params` (符合 `id`，依鍵值覆蓋)

這允許一個代理程式保持長期快取，而同一模型上的另一個代理程式則停用快取，以避免在突發/低重用流量上產生寫入成本。

### Bedrock Claude 注意事項

- Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在設定時接受 `cacheRetention` 透傳。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設定為 `cacheRetention: "none"`。
- 當未設定明確值時，Anthropic API 金鑰的智慧型預設值也會為 Claude-on-Bedrock 模型引用植入 `cacheRetention: "short"`。

## 1M 上下文視窗 (Anthropic beta)

Anthropic 的 1M 上下文視窗處於 Beta 封測階段。在 OpenClaw 中，請針對支援的 Opus/Sonnet 模型，使用 `params.context1m: true` 逐模型啟用此功能。

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

OpenClaw 會將此對應到 Anthropic 請求中的
`anthropic-beta: context-1m-2025-08-07`。

僅當該模型的 `params.context1m` 被明確設定為
`true` 時，才會啟用此功能。

需求：Anthropic 必須允許該憑證使用長上下文。

注意：當使用舊版 Anthropic 權杖驗證（`sk-ant-oat-*`）時，Anthropic 目前會拒絕 `context-1m-*` beta 請求。如果您使用該舊版驗證模式設定 `context1m: true`，OpenClaw 會記錄警告並透過跳過 context1m beta 標頭，同時保留所需的 OAuth beta，來回退至標準上下文視窗。

## Claude CLI 後端

OpenClaw 支援內建的 Anthropic `claude-cli` 後端。

- Anthropic 人員告訴我們，此種使用方式再次獲得允許。
- 因此，除非 Anthropic 發布新政策，否則 OpenClaw 視 Claude CLI 重複使用與 `claude -p` 的使用為此整合所核准的方式。
- 對於常駐的閘道主機和明確的伺服器端帳單控制，Anthropic API 金鑰仍然是最清楚的生產環境途徑。
- 設定與執行時期的詳細資訊位於 [/gateway/cli-backends](/en/gateway/cli-backends)。

## 注意事項

- Anthropic 的公開 Claude Code 文件仍然記載直接使用 CLI 的方式，例如 `claude -p`，且 Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用方式再次獲得允許。除非 Anthropic 發布新的政策變更，否則我們將該指引視為確定。
- Anthropic setup-token 在 OpenClaw 中仍可作為支援的權杖驗證途徑使用，但若有提供，OpenClaw 現在偏好使用 Claude CLI 重複使用與 `claude -p`。
- 驗證詳細資訊與重複使用規則位於 [/concepts/oauth](/en/concepts/oauth)。

## 疑難排解

**401 錯誤 / Token 突然失效**

- Anthropic 權杖驗證可能會過期或被撤銷。
- 對於新的設定，請遷移至 Anthropic API 金鑰。

**找不到提供者 "anthropic" 的 API 金鑰**

- 驗證是 **每個代理程式** 獨立的。新代理程式不會繼承主要代理程式的金鑰。
- 為該 agent 重新執行上架流程，或在閘道主機上設定 API 金鑰，然後使用 `openclaw models status` 進行驗證。

**未找到設定檔 `anthropic:default` 的憑證**

- 執行 `openclaw models status` 以查看目前使用的是哪個驗證設定檔。
- 請重新執行上架流程，或為該設定檔路徑設定 API 金鑰。

**沒有可用的驗證設定檔（全部都在冷卻/不可用狀態）**

- 檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- Anthropic 的速率限制冷卻可能是特定於模型的，因此當目前使用的模型正在冷卻時，同屬的
  Anthropic 模型可能仍然可用。
- 新增另一個 Anthropic 設定檔或等待冷卻結束。

更多資訊：[/gateway/troubleshooting](/en/gateway/troubleshooting) 與 [/help/faq](/en/help/faq)。
