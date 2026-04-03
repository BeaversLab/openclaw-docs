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
- `MiniMax-M2.7-highspeed`：更快速的 M2.7 文字層級。
- `image-01`：影像生成模型（生成與圖生圖編輯）。

## 影像生成

MiniMax 外掛程式為 `image_generate` 工具註冊了 `image-01` 模型。它支援：

- **文字生圖**，並支援長寬比控制。
- **圖生圖編輯**（主體參考），並支援長寬比控制。
- 支援的長寬比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`。

若要使用 MiniMax 進行影像生成，請將其設為影像生成供應商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

該外掛程式使用與文字模型相同的 `MINIMAX_API_KEY` 或 OAuth 認證。如果 MiniMax 已設定完畢，則無需額外設定。

## 選擇設定方式

### MiniMax OAuth (Coding Plan) - 推薦

**最適合：** 透過 OAuth 快速設定 MiniMax Coding Plan，無需 API 金鑰。

啟用內建的 OAuth 外掛程式並進行身份驗證：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系統會提示您選擇一個端點：

- **Global** - 國際用戶 (`api.minimax.io`)
- **CN** - 中國用戶 (`api.minimaxi.com`)

詳情請參閱 OpenClaw repo 中 MiniMax 外掛程式套件的 README。

### MiniMax M2.7 (API 金鑰)

**最適合：** 具有相容 Anthropic API 的託管 MiniMax。

透過 CLI 設定：

- 執行 `openclaw configure`
- 選擇 **Model/auth**
- 選擇 **MiniMax** 認證選項

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

### MiniMax M2.7 作為後備（範例）

**最適合：** 將您最強大的最新一代模型作為主要模型，並在需要時故障轉移至 MiniMax M2.7。
下方範例使用 Opus 作為具體的主要模型；您可以替換為您偏好的最新一代主要模型。

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

## 透過 `openclaw configure` 設定

使用互動式設定精靈來設定 MiniMax，而無需編輯 JSON：

1. 執行 `openclaw configure`。
2. 選擇 **Model/auth**。
3. 選擇 **MiniMax** 認證選項。
4. 當系統提示時，選擇您的預設模型。

## 設定選項

- `models.providers.minimax.baseUrl`：優先使用 `https://api.minimax.io/anthropic`（相容 Anthropic）；`https://api.minimax.io/v1` 對於相容 OpenAI 的載荷為可選。
- `models.providers.minimax.api`：偏好 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payload 是可選的。
- `models.providers.minimax.apiKey`：MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：為您想要在允許清單中的模型設定別名。
- `models.mode`：如果您想將 MiniMax 與內建模型一起新增，請保留 `merge`。

## 備註

- 模型參照為 `minimax/<model>`。
- 預設文字模型：`MiniMax-M2.7`。
- 替代文字模型：`MiniMax-M2.7-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 金鑰）。
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價值。
- MiniMax Coding Plan 的推薦連結（9 折）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 請參閱 [/concepts/model-providers](/en/concepts/model-providers) 以了解供應商規則。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 進行切換。

## 疑難排解

### "Unknown model: minimax/MiniMax-M2.7"

這通常表示 **MiniMax 供應商尚未設定**（找不到供應商項目
也找不到 MiniMax auth profile/env key）。此偵測問題的修復將包含在
**2026.1.12** 版本中。您可以透過以下方式修復：

- 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動 gateway。
- 執行 `openclaw configure` 並選擇一個 **MiniMax** 驗證選項，或
- 手動新增 `models.providers.minimax` 區塊，或
- 設定 `MINIMAX_API_KEY`（或 MiniMax auth profile），以便注入供應商。

請確保模型 ID **區分大小寫**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

然後重新檢查：

```bash
openclaw models list
```
