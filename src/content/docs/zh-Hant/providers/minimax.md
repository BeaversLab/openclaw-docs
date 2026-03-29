---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供商預設為 **MiniMax M2.7**，並為了相容性在目錄中保留
**MiniMax M2.5**。

## 型號列表

- `MiniMax-M2.7`：預設的託管文字模型。
- `MiniMax-M2.7-highspeed`：更快速的 M2.7 文字層級。
- `MiniMax-M2.5`：先前的文字模型，仍可在 MiniMax 目錄中使用。
- `MiniMax-M2.5-highspeed`：更快速的 M2.5 文字層級。
- `MiniMax-VL-01`：用於文字 + 圖片輸入的視覺模型。

## 選擇設定方式

### MiniMax OAuth (Coding Plan) - 推薦

**最適用於：** 透過 OAuth 使用 MiniMax Coding Plan 快速設定，不需要 API 金鑰。

啟用內建的 OAuth 外掛並進行驗證：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系統將會提示您選擇端點：

- **Global** - 國際用戶 (`api.minimax.io`)
- **CN** - 中國用戶 (`api.minimaxi.com`)

詳情請參閱 [MiniMax plugin README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.7 (API 金鑰)

**最適用於：** 使用相容 Anthropic API 的託管 MiniMax。

透過 CLI 設定：

- 執行 `openclaw configure`
- 選擇 **Model/auth**
- 選擇一個 **MiniMax** 驗證選項

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### MiniMax M2.7 作為後備 (範例)

**最適用於：** 將您最強大的最新世代模型設為主要，並自動故障轉移到 MiniMax M2.7。
下方範例使用 Opus 作為具體的主要模型；您可以替換為您偏好的最新世代主要模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

### 選用：透過 LM Studio 本地運行 (手動)

**最適用於：** 透過 LM Studio 進行本地推論。
我們在強大的硬體 (例如桌面/伺服器) 上，使用 LM Studio 的本地伺服器運行 MiniMax M2.5，獲得了不錯的結果。

透過 `openclaw.json` 手動設定：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 透過 `openclaw configure` 設定

使用互動式設定精靈來設定 MiniMax，無需編輯 JSON：

1. 執行 `openclaw configure`。
2. 選擇 **Model/auth**。
3. 選擇一個 **MiniMax** 驗證選項。
4. 當系統提示時，選擇您的預設模型。

## 設定選項

- `models.providers.minimax.baseUrl`：優先使用 `https://api.minimax.io/anthropic` (相容 Anthropic)；`https://api.minimax.io/v1` 對於相容 OpenAI 的載荷為可選。
- `models.providers.minimax.api`: 偏好 `anthropic-messages`；`openai-completions` 對於相容 OpenAI 的 payload 是可選的。
- `models.providers.minimax.apiKey`: MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`: 定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`: 為您想要列入允許清單的模型設定別名。
- `models.mode`: 如果您想將 MiniMax 與內建模型一起新增，請保留 `merge`。

## 備註

- 模型參照為 `minimax/<model>`。
- 預設文字模型：`MiniMax-M2.7`。
- 替代文字模型：`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`、`MiniMax-M2.5-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (需要 coding plan 金鑰)。
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價數值。
- MiniMax Coding Plan 的推薦連結（10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 參閱 [/concepts/model-providers](/en/concepts/model-providers) 以了解提供商規則。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 進行切換。

## 疑難排解

### "Unknown model: minimax/MiniMax-M2.7"

這通常表示 **MiniMax 提供商未設定**（找不到提供商項目
和 MiniMax auth profile/env 金鑰）。此偵測的修復方案在於
**2026.1.12**。修正方法：

- 升級至 **2026.1.12** (或從原始碼 `main` 執行)，然後重新啟動 gateway。
- 執行 `openclaw configure` 並選擇 **MiniMax** auth 選項，或
- 手動新增 `models.providers.minimax` 區塊，或
- 設定 `MINIMAX_API_KEY` (或 MiniMax auth profile) 以便插入提供商。

請確保模型 ID **區分大小寫**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`
- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然後重新檢查：

```bash
openclaw models list
```
