---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供者預設為 **MiniMax M2.7**。

## 型號列表

- `MiniMax-M2.7`：預設的託管文字模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 文字層級。

## 選擇一種設定

### MiniMax OAuth (Coding Plan) - 推薦

**最適合：** 透過 OAuth 使用 MiniMax Coding Plan 快速設定，無需 API 金鑰。

啟用內建的 OAuth 外掛並進行驗證：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系統將提示您選擇一個端點：

- **Global** - 國際使用者 (`api.minimax.io`)
- **CN** - 中國大陸使用者 (`api.minimaxi.com`)

詳情請參閱 [MiniMax 外掛 README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.7 (API 金鑰)

**最適合：** 使用相容 Anthropic API 的託管 MiniMax。

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
        ],
      },
    },
  },
}
```

### MiniMax M2.7 作為備援（範例）

**最適合用於：** 將您最強大的最新一代模型設為主要模型，並在失敗時切換至 MiniMax M2.7。
下方的範例使用 Opus 作為具體的主要模型；請替換為您偏好的最新一代主要模型。

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

## 透過 `openclaw configure` 進行設定

使用互動式設定精靈來設定 MiniMax，無需編輯 JSON：

1. 執行 `openclaw configure`。
2. 選擇 **Model/auth**。
3. 選擇一個 **MiniMax** 驗證選項。
4. 當提示時，選擇您的預設模型。

## 設定選項

- `models.providers.minimax.baseUrl`：建議優先使用 `https://api.minimax.io/anthropic`（與 Anthropic 相容）；`https://api.minimax.io/v1` 對於與 OpenAI 相容的 Payload 則是選用的。
- `models.providers.minimax.api`：建議使用 `anthropic-messages`；對於 OpenAI 相容的 Payload，`openai-completions` 為選用項。
- `models.providers.minimax.apiKey`：MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：別名您想要加入允許清單的模型。
- `models.mode`：如果您想要將 MiniMax 與內建項目一並加入，請保留 `merge`。

## 注意事項

- 模型參照為 `minimax/<model>`。
- 預設文字模型：`MiniMax-M2.7`。
- 替代文字模型：`MiniMax-M2.7-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 Coding Plan 金鑰）。
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的價格值。
- MiniMax Coding Plan 的推薦連結（10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 請參閱 [/concepts/model-providers](/en/concepts/model-providers) 瞭解供應商規則。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 進行切換。

## 疑難排解

### "Unknown model: minimax/MiniMax-M2.7"

這通常意味著 **未設定 MiniMax 供應商**（找不到供應商條目
也找不到 MiniMax auth profile/env key）。針對此偵測的修復已在
**2026.1.12** 版本中。修正方法：

- 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
- 執行 `openclaw configure` 並選擇 **MiniMax** 驗證選項，或
- 手動添加 `models.providers.minimax` 區塊，或
- 設定 `MINIMAX_API_KEY`（或 MiniMax 設定檔），以便供應商可以被注入。

請確保模型 ID **區分大小寫**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

然後重新檢查：

```bash
openclaw models list
```
