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
在 Anthropic Console 中建立您的 API 金鑰。

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
- 您可以針對每則訊息 (`/think:<level>`) 或在模型參數中覆寫：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相關 Anthropic 文件：
  - [自適應思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [擴展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 的共享 `/fast` 切換開關也支援直接 Anthropic API 金鑰流量。

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

- 這僅限於 **API 金鑰**。Anthropic setup-token / OAuth 驗證不遵循 OpenClaw 快速模式層級注入。
- OpenClaw 僅針對直接 `api.anthropic.com` 請求注入 Anthropic 服務層級。如果您透過代理伺服器或閘道路由 `anthropic/*`，`/fast` 將保持 `service_tier` 不變。
- Anthropic 會在回應中的 `usage.service_tier` 下報告有效的層級。對於沒有優先層級容量的帳戶，`service_tier: "auto"` 仍然可能解析為 `standard`。

## 提示詞快取 (Anthropic API)

OpenClaw 支援 Anthropic 的提示詞快取功能。這僅限於 **API**；訂閱驗證不會遵守快取設定。

### 設定

在您的模型設定中使用 `cacheRetention` 參數：

| 數值    | 快取持續時間 | 說明                      |
| ------- | ------------ | ------------------------- |
| `none`  | 無快取       | 停用提示詞快取            |
| `short` | 5 分鐘       | API 金鑰驗證的預設值      |
| `long`  | 1 小時       | 延伸快取 (需要 beta 標記) |

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

使用 Anthropic API 金鑰驗證時，OpenClaw 會自動為所有 Anthropic 模型套用 `cacheRetention: "short"`（5 分鐘快取）。您可以透過在設定中明確設定 `cacheRetention` 來覆寫此設定。

### 各代理的 cacheRetention 覆寫

使用模型層級參數作為基準，然後透過 `agents.list[].params` 覆寫特定代理。

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

相關快取參數的設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（符合 `id`，按鍵覆寫）

這讓一個代理可以保持長效快取，而同一模型上的另一個代理可以停用快取，以避免在突發/低複用流量上產生寫入成本。

### Bedrock Claude 說明

- Bedrock 上的 Anthropic Claude 模型（`amazon-bedrock/*anthropic.claude*`）在設定後接受 `cacheRetention` 傳遞。
- 非 Anthropic Bedrock 模型在運行時強制為 `cacheRetention: "none"`。
- 當未設定明確值時，Anthropic API 金鑰的智慧預設值也會為 Bedrock 上的 Claude 模型引用設定 `cacheRetention: "short"`。

### 舊版參數

較舊的 `cacheControlTtl` 參數仍為了向後相容性而受支援：

- `"5m"` 對應至 `short`
- `"1h"` 對應至 `long`

我們建議遷移至新的 `cacheRetention` 參數。

OpenClaw 在 Anthropic API 請求中包含了 `extended-cache-ttl-2025-04-11` beta 旗標；如果您覆寫提供者標頭，請保留該旗標（請參閱 [/gateway/configuration](/zh-Hant/gateway/configuration)）。

## 1M 上下文視窗 (Anthropic beta)

Anthropic 的 100 萬上下文視窗目前處於測試階段。在 OpenClaw 中，您可以針對支援的 Opus/Sonnet 模型，透過 `params.context1m: true` 逐個模型啟用此功能。

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

OpenClaw 會將此對應到 Anthropic 請求中的 `anthropic-beta: context-1m-2025-08-07`。

只有當該模型的 `params.context1m` 被明確設定為 `true` 時，此功能才會啟用。

需求：Anthropic 必須允許該憑證使用長上下文（通常是 API 金鑰計費，或已啟用額外使用量的訂閱帳戶）。否則 Anthropic 將返回：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：當使用 OAuth/訂閱權杖 (`sk-ant-oat-*`) 時，Anthropic 目前會拒絕 `context-1m-*` 測試版請求。OpenClaw 會自動在 OAuth 驗證中跳過 context1m 測試版標頭，並保留必要的 OAuth 測試版功能。

## 選項 B：Claude 設定權杖

**最適用於：** 使用您的 Claude 訂閱。

### 在哪裡取得 setup-token

Setup-token 是由 **Claude Code CLI** 產生，而非 Anthropic Console。您可以在 **任何機器** 上執行：

```bash
claude setup-token
```

將 token 貼上至 OpenClaw（精靈：**Anthropic token (paste setup-token)**），或在 gateway 主機上執行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在不同的機器上產生 token，請將其貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

### CLI 設定（setup-token）

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### 設定片段（setup-token）

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 備註

- 使用 `claude setup-token` 產生 setup-token 並貼上，或在 gateway 主機上執行 `openclaw models auth setup-token`。
- 如果您在 Claude 訂閱上看到「OAuth token refresh failed …」，請使用 setup-token 重新驗證。請參閱 [/gateway/troubleshooting](/zh-Hant/gateway/troubleshooting)。
- 驗證詳細資訊與重複使用規則位於 [/concepts/oauth](/zh-Hant/concepts/oauth)。

## 疑難排解

**401 錯誤 / token 突然失效**

- Claude 訂閱驗證可能會過期或被撤銷。請重新執行 `claude setup-token` 並將其貼上到 **gateway host**。
- 如果 Claude CLI 登入位於不同的機器上，請在 gateway host 上使用 `openclaw models auth paste-token --provider anthropic`。

**找不到提供者 "anthropic" 的 API 金鑰**

- 驗證是**針對每個代理 (agent)** 的。新代理不會繼承主要代理的金鑰。
- 為該代理重新執行入門流程，或在 gateway host 上貼上 setup-token / API 金鑰，然後使用 `openclaw models status` 進行驗證。

**找不到設定檔 `anthropic:default` 的憑證**

- 執行 `openclaw models status` 以查看目前使用的是哪個驗證設定檔。
- 重新執行入門流程，或為該設定檔貼上 setup-token / API 金鑰。

**沒有可用的驗證設定檔 (全部都在冷卻中/無法使用)**

- 檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- 新增另一個 Anthropic 設定檔或等待冷卻結束。

更多：[/gateway/troubleshooting](/zh-Hant/gateway/troubleshooting) 和 [/help/faq](/zh-Hant/help/faq)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
