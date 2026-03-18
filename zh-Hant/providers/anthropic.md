---
summary: "在 OpenClaw 中透過 API 金鑰或 setup-token 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列並透過 API 提供存取。
在 OpenClaw 中，您可以使用 API 金鑰或 **setup-token** 進行驗證。

## 選項 A：Anthropic API 金鑰

**最適合：** 標準 API 存取與依用量計費。
請在 Anthropic Console 中建立您的 API 金鑰。

### CLI 設定

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 設定片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 思考預設值 (Claude 4.6)

- 當未設定明確的思考層級時，Anthropic Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。
- 您可以在單一訊息 (`/think:<level>`) 或模型參數中覆寫：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相關 Anthropic 文件：
  - [適應性思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [擴充思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共用 `/fast` 切換開關也支援直接 Anthropic API 金鑰流量。

- `/fast on` 對應至 `service_tier: "auto"`
- `/fast off` 對應至 `service_tier: "standard_only"`
- 設定預設值：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

重要限制：

- 此功能**僅限 API 金鑰**。Anthropic setup-token / OAuth 驗證不會接受 OpenClaw 快速模式層級注入。
- OpenClaw 僅針對直接的 `api.anthropic.com` 請求注入 Anthropic 服務層級。如果您將 `anthropic/*` 透過代理或閘道路由，`/fast` 將不會變更 `service_tier`。
- Anthropic 在回應中的 `usage.service_tier` 下回報有效層級。對於沒有優先層級容量的帳戶，`service_tier: "auto"` 可能仍會解析為 `standard`。

## 提示詞快取 (Anthropic API)

OpenClaw 支援 Anthropic 的提示詞快取功能。此功能**僅限 API**；訂閱驗證不會接受快取設定。

### 設定

在您的模型設定中使用 `cacheRetention` 參數：

| 數值    | 快取持續時間 | 說明                       |
| ------- | ------------ | -------------------------- |
| `none`  | 無快取       | 停用提示詞快取             |
| `short` | 5 分鐘       | API 金鑰驗證的預設值       |
| `long`  | 1 小時       | 擴充快取（需要 beta 標記） |

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

### 每個代理的 cacheRetention 覆蓋

使用模型層級參數作為基線，然後透過 `agents.list[].params` 覆蓋特定代理。

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

快取相關參數的設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（符合 `id`，按金鑰覆蓋）

這允許一個代理保持長期快取，而同一模型上的另一個代理停用快取，以避免在突發/低重用流量上產生寫入成本。

### Bedrock Claude 說明

- Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在設定時接受 `cacheRetention` 透傳。
- 非 Anthropic Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。
- Anthropic API 金鑰的智慧預設值也會在未設定明確值時，為 Claude-on-Bedrock 模型引用設定 `cacheRetention: "short"`。

### 舊版參數

較舊的 `cacheControlTtl` 參數為了向後相容性仍然受到支援：

- `"5m"` 對應到 `short`
- `"1h"` 對應到 `long`

我們建議遷移到新的 `cacheRetention` 參數。

OpenClaw 包含針對 Anthropic API 請求的 `extended-cache-ttl-2025-04-11` beta 標記；如果您覆蓋提供者標頭，請保留此標記（請參閱 [/gateway/configuration](/zh-Hant/gateway/configuration)）。

## 1M 語境視窗（Anthropic beta）

Anthropic 的 1M 語境視窗受 beta 限制。在 OpenClaw 中，針對支援的 Opus/Sonnet 模型，使用 `params.context1m: true` 逐模型啟用它。

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

OpenClaw 將此對應到 Anthropic 請求上的
`anthropic-beta: context-1m-2025-08-07`。

僅當該模型的 `params.context1m` 明確設定為 `true` 時，
這才會啟動。

要求：Anthropic 必須允許該憑證使用長內容（通常是 API 金鑰計費，或啟用了額外使用量的訂閱帳戶）。否則 Anthropic 會傳回：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：Anthropic 目前會在使用 OAuth/訂閱權杖（`sk-ant-oat-*`）時拒絕 `context-1m-*` 的 beta 請求。OpenClaw 會自動略過 OAuth 認證的 context1m beta 標頭，並保留所需的 OAuth betas。

## 選項 B：Claude setup-token

**最適合：** 使用您的 Claude 訂閱。

### 在哪裡取得 setup-token

Setup-token 是由 **Claude Code CLI** 建立，而非 Anthropic Console。您可以在**任何機器**上執行此操作：

```bash
claude setup-token
```

將權杖貼入 OpenClaw（精靈：**Anthropic token (paste setup-token)**），或在閘道主機上執行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在不同的機器上產生權杖，請將其貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI 設定 (setup-token)

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### 設定片段 (setup-token)

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 注意事項

- 使用 `claude setup-token` 產生 setup-token 並將其貼上，或在閘道主機上執行 `openclaw models auth setup-token`。
- 如果您在 Claude 訂閱上看到「OAuth token refresh failed …」，請使用 setup-token 重新進行認證。請參閱 [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/zh-Hant/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- 認證詳細資訊 + 重用規則位於 [/concepts/oauth](/zh-Hant/concepts/oauth)。

## 疑難排解

**401 錯誤 / 權杖突然無效**

- Claude 訂閱認證可能會過期或被撤銷。請重新執行 `claude setup-token`
  並將其貼入 **閘道主機**。
- 如果 Claude CLI 登入位於不同的機器上，請在閘道主機上使用
  `openclaw models auth paste-token --provider anthropic`。

**找不到供應商 "anthropic" 的 API 金鑰**

- 認證是**針對每個代理程式** 的。新的代理程式不會繼承主要代理程式的金鑰。
- 請重新執行該代理程式的上架流程，或在閘道主機上貼上 setup-token / API 金鑰，
  然後使用 `openclaw models status` 進行驗證。

**找不到設定檔 `anthropic:default` 的憑證**

- 執行 `openclaw models status` 以查看目前作用中的認證設定檔。
- 請重新執行上架流程，或為該設定檔貼上 setup-token / API 金鑰。

**沒有可用的認證設定檔（全部都在冷卻/不可用狀態）**

- 檢查 `openclaw models status --json` 以取得 `auth.unusableProfiles`。
- 新增另一個 Anthropic 設定檔或等待冷卻。

更多資訊：[/gateway/troubleshooting](/zh-Hant/gateway/troubleshooting) 和 [/help/faq](/zh-Hant/help/faq)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
