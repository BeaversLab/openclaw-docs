---
summary: "在 OpenClaw 中透過 API 金鑰、setup-token 或 Claude CLI 使用 Anthropic Claude"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
  - You want to reuse Claude CLI subscription auth on the gateway host
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic 建構了 **Claude** 模型系列並透過 API 提供存取。
在 OpenClaw 中，您可以使用 API 金鑰或 **setup-token** 進行驗證。

## 選項 A：Anthropic API 金鑰

**最適用於：** 標準 API 存取和依用量計費。
在 Anthropic Console 中建立您的 API 金鑰。

### CLI 設定

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Claude CLI 設定片段

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 預設思考設定 (Claude 4.6)

- 當未設定明確的思考層級時，Anthropic Claude 4.6 模型在 OpenClaw 中預設為 `adaptive` 思考。
- 您可以為每則訊息 (`/think:<level>`) 或在模型參數中覆寫：
  `agents.defaults.models["anthropic/<model>"].params.thinking`。
- 相關 Anthropic 文件：
  - [適應性思考](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [擴展思考](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## 快速模式 (Anthropic API)

OpenClaw 共用的 `/fast` 開關也支援直接的公開 Anthropic 流量，包括傳送至 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證請求。

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

- OpenClaw 僅針對直接的 `api.anthropic.com` 請求注入 Anthropic 服務層級。如果您透過代理或閘道路由 `anthropic/*`，`/fast` 將保持 `service_tier` 不變。
- 明確指定的 Anthropic `serviceTier` 或 `service_tier` 模型參數會在兩者皆設定時覆寫 `/fast` 預設值。
- Anthropic 會在回應的 `usage.service_tier` 下回報有效層級。在不具 Priority Tier 容量的帳戶上，`service_tier: "auto"` 仍可能解析為 `standard`。

## 提示詞快取 (Anthropic API)

OpenClaw 支援 Anthropic 的提示詞快取功能。這僅限 **API**；訂閱驗證不遵循快取設定。

### 設定

在您的模型設定中使用 `cacheRetention` 參數：

| 數值    | 快取持續時間 | 說明                       |
| ------- | ------------ | -------------------------- |
| `none`  | 無快取       | 停用提示詞快取             |
| `short` | 5 分鐘       | API 金鑰驗證的預設值       |
| `long`  | 1 小時       | 擴充快取（需要 beta 標誌） |

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

使用 Anthropic API 金鑰驗證時，OpenClaw 會自動對所有 Anthropic 模型套用 `cacheRetention: "short"`（5 分鐘快取）。您可以透過在設定中明確設定 `cacheRetention` 來覆寫此行為。

### 各代理程式的 cacheRetention 覆寫

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

快取相關參數的設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params`（符合 `id`，按鍵覆寫）

這讓一個代理程式可以保持長效快取，而同一模型上的另一個代理程式則停用快取，以避免在突發/低重用流量上產生寫入成本。

### Bedrock Claude 注意事項

- Bedrock 上的 Anthropic Claude 模型 (`amazon-bedrock/*anthropic.claude*`) 在設定時接受 `cacheRetention` 透傳。
- 非 Anthropic 的 Bedrock 模型會在執行時期強制設為 `cacheRetention: "none"`。
- Anthropic API 金鑰智慧預設值也會在未設定明確值時，為 Claude-on-Bedrock 模型參照植入 `cacheRetention: "short"`。

### 舊版參數

較舊的 `cacheControlTtl` 參數仍受支援以維持向後相容性：

- `"5m"` 對應至 `short`
- `"1h"` 對應至 `long`

我們建議遷移至新的 `cacheRetention` 參數。

OpenClaw 在 Anthropic API 請求中包含了 `extended-cache-ttl-2025-04-11` 測試版標誌；如果您覆寫供應商標頭，請保留此標誌（請參閱 [/gateway/configuration](/en/gateway/configuration)）。

## 1M 上下文視窗（Anthropic beta）

Anthropic 的 1M 上下文視窗目前為測試版限制功能。在 OpenClaw 中，您可以針對支援的 Opus/Sonnet 模型，使用 `params.context1m: true` 逐個模型啟用它。

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

OpenClaw 會將此對應至 Anthropic 請求上的 `anthropic-beta: context-1m-2025-08-07`。

僅當針對該模型明確將 `params.context1m` 設定為 `true` 時，才會啟用此功能。

需求：Anthropic 必須允許該憑證使用長上下文（通常為 API 金鑰計費，或已啟用額外使用量的訂閱帳戶）。否則 Anthropic 將傳回：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

注意：Anthropic 目前會在使用訂閱設定權杖 (`sk-ant-oat-*`) 時拒絕 `context-1m-*` 測試版請求。如果您使用訂閱驗證設定 `context1m: true`，OpenClaw 將記錄警告並透過跳過 context1m 測試版標頭同時保留必要的 OAuth 測試版，來回退至標準上下文視窗。

## 選項 B：使用 Claude CLI 作為訊息提供者

**最適合：** 已安裝 Claude CLI 並使用 Claude 訂閱登入的
單使用者閘道主機。

此路徑使用本機 `claude` 二進位檔案進行模型推斷，而不是直接呼叫 Anthropic API。OpenClaw 將其視為 **CLI 後端供應商**，並使用如下模型引用：

- `claude-cli/claude-sonnet-4-6`
- `claude-cli/claude-opus-4-6`

運作方式：

1. OpenClaw 會在 **閘道主機** 上啟動 `claude -p --output-format json ...`。
2. 第一輪會傳送 `--session-id <uuid>`。
3. 後續輪次會透過 `--resume <sessionId>` 重複使用已儲存的 Claude 會話。
4. 您的聊天訊息仍會經過正常的 OpenClaw 訊息管線，但
   實際的模型回覆是由 Claude CLI 產生。

### 需求

- 在 gateway host 上安裝 Claude CLI 並可在 PATH 中使用，或是
  設定了絕對指令路徑。
- Claude CLI 已在同一台主機上完成驗證：

```bash
claude auth status
```

- 當您的設定明確參考 `claude-cli/...` 或 `claude-cli` 後端設定時，OpenClaw 會在閘道啟動時自動載入內建的 Anthropic 外掛程式。

### 設定片段

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "claude-cli/claude-sonnet-4-6",
      },
      models: {
        "claude-cli/claude-sonnet-4-6": {},
      },
      sandbox: { mode: "off" },
    },
  },
}
```

如果 `claude` 二進位檔案不在閘道主機的 PATH 上：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

### 您將獲得

- 重複使用來自本機 CLI 的 Claude 訂閱驗證
- 一般的 OpenClaw 訊息/會話路由
- 跨回合的 Claude CLI 會話連續性

### 從 Anthropic 驗證遷移至 Claude CLI

如果您目前使用 `anthropic/...` 搭配 setup-token 或 API 金鑰，並希望
將相同的閘道主機切換至 Claude CLI：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

或是在 onboarding 中：

```bash
openclaw onboard --auth-choice anthropic-cli
```

此操作的用途：

- 驗證 Claude CLI 已在 gateway 主機上登入
- 將預設模型切換為 `claude-cli/...`
- 將 Anthropic 預設模型回退機制（如 `anthropic/claude-opus-4-6`）
  重寫為 `claude-cli/claude-opus-4-6`
- 將相符的 `claude-cli/...` 項目新增至 `agents.defaults.models`

此操作**不**會做的：

- 刪除您現有的 Anthropic 驗證設定檔
- 移除主要預設模型/允許清單路徑之外的每一個舊 `anthropic/...` 設定參考

這讓回滾變得很簡單：如果有需要，只需將預設模型改回 `anthropic/...` 即可。

### 重要限制

- 這**不是** Anthropic API 提供者。這是本機 CLI 執行環境。
- 在 CLI 後端執行時，OpenClaw 端會停用工具。
- 文字輸入，文字輸出。沒有 OpenClaw 串流移交。
- 最適合個人的閘道主機，而非共用的多使用者計費設定。

更多詳情：[/gateway/cli-backends](/en/gateway/cli-backends)

## 選項 C：Claude setup-token

**最適合：** 使用您的 Claude 訂閱。

### 在哪裡取得 setup-token

Setup-token 是由 **Claude Code CLI** 所建立，而非 Anthropic Console。您可以在**任何機器**上執行此操作：

```bash
claude setup-token
```

將 token 貼上到 OpenClaw （精靈： **Anthropic token (paste setup-token)**），或在閘道主機上執行：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在不同的機器上產生 token，請將其貼上：

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

## 備註

- 使用 `claude setup-token` 產生 setup-token 並貼上，或在閘道主機上執行 `openclaw models auth setup-token`。
- 如果在 Claude 訂閱上看到「OAuth token refresh failed …」，請使用 setup-token 重新驗證。請參閱 [/gateway/troubleshooting](/en/gateway/troubleshooting)。
- 驗證詳情 + 重用規則位於 [/concepts/oauth](/en/concepts/oauth)。

## 疑難排解

**401 錯誤 / token 突然失效**

- Claude 訂閱驗證可能會過期或被撤銷。請重新執行 `claude setup-token`
  並將其貼入 **gateway host**。
- 如果 Claude CLI 登入位於不同的機器上，請在閘道主機上使用
  `openclaw models auth paste-token --provider anthropic`。

**找不到提供者 "anthropic" 的 API 金鑰**

- 驗證是**針對每個 agent**。新的 agent 不會繼承主要 agent 的金鑰。
- 為該 agent 重新執行上架流程，或在閘道主機上貼上 setup-token / API 金鑰，然後使用 `openclaw models status` 進行驗證。

**No credentials found for profile `anthropic:default`**

- 執行 `openclaw models status` 以查看目前啟用的驗證設定檔。
- 重新執行入門引導，或為該設定檔貼上 setup-token / API 金鑰。

**沒有可用的驗證設定檔（全部皆在冷卻/不可用狀態）**

- 檢查 `openclaw models status --json` 中的 `auth.unusableProfiles`。
- 新增另一個 Anthropic 設定檔或等待冷卻結束。

更多資訊：[/gateway/troubleshooting](/en/gateway/troubleshooting) 和 [/help/faq](/en/help/faq)。
