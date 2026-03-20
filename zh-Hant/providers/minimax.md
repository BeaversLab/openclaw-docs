---
summary: "在 OpenClaw 中使用 MiniMax M2.5"
read_when:
  - 您想在 OpenClaw 中使用 MiniMax 模型
  - 您需要 MiniMax 設定指南
title: "MiniMax"
---

# MiniMax

MiniMax 是一家建構 **M2/M2.5** 模型系列的 AI 公司。目前的專注於程式設計的版本是 **MiniMax M2.5**（2025 年 12 月 23 日發布），專為現實世界的複雜任務而設計。

來源：[MiniMax M2.5 發布說明](https://www.minimax.io/news/minimax-m25)

## 模型概覽 (M2.5)

MiniMax 強調了 M2.5 中的以下改進：

- 更強的 **多語言程式設計** 能力 (Rust, Java, Go, C++, Kotlin, Objective-C, TS/JS)。
- 更佳的 **網頁/應用程式開發** 和美觀的輸出品質 (包括原生行動應用)。
- 改進的 **複合指令** 處理能力，適用於辦公室式的工作流程，基於交錯思考 (interleaved thinking) 和整合式約束執行。
- **更簡潔的回應**，具備更低的 token 使用量和更快的迭代迴圈。
- 更強的 **工具/代理框架** 相容性和上下文管理 (Claude Code,
  Droid/Factory AI, Cline, Kilo Code, Roo Code, BlackBox)。
- 更佳的 **對話和技術寫作** 輸出品質。

## MiniMax M2.5 與 MiniMax M2.5 Highspeed

- **速度：** `MiniMax-M2.5-highspeed` 是 MiniMax 文件中的官方高速層級。
- **成本：** MiniMax 價目表列出了相同的輸入成本，而高速版的輸出成本較高。
- **目前的模型 ID：** 使用 `MiniMax-M2.5` 或 `MiniMax-M2.5-highspeed`。

## 選擇設定方式

### MiniMax OAuth (Coding Plan) - 推薦

**最適用於：** 透過 OAuth 快速設定 MiniMax Coding Plan，無需 API 金鑰。

啟用內建的 OAuth 外掛並進行驗證：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系統將提示您選擇一個端點：

- **Global** - 國際使用者 (`api.minimax.io`)
- **CN** - 中國使用者 (`api.minimaxi.com`)

詳情請參閱 [MiniMax 外掛 README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.5 (API 金鑰)

**最適用於：** 使用相容 Anthropic API 的託管 MiniMax。

透過 CLI 設定：

- 執行 `openclaw configure`
- 選擇 **Model/auth**
- 選擇 **MiniMax M2.5**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.5" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
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

### MiniMax M2.5 作為後備 (範例)

**最適用於：** 將您最強大的最新一代模型作為主要模型，並將 MiniMax M2.5 作為故障轉移。
下方的範例使用 Opus 作為具體的主要模型；您可以替換為您偏好的最新一代主要模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
    },
  },
}
```

### 選用：透過 LM Studio 本地設定 (手動)

**最適用於：** 使用 LM Studio 進行本地推論。
我們在使用 LM Studio 的本地伺服器時，在強大的硬體（例如桌上型電腦/伺服器）上使用 MiniMax M2.5 獲得了不錯的結果。

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

## 透過 `openclaw configure` 進行設定

使用互動式設定精靈來設定 MiniMax，無需編輯 JSON：

1. 執行 `openclaw configure`。
2. 選取 **Model/auth**。
3. 選擇 **MiniMax M2.5**。
4. 當系統提示時，選擇您的預設模型。

## 設定選項

- `models.providers.minimax.baseUrl`: 優先使用 `https://api.minimax.io/anthropic` (相容 Anthropic)；`https://api.minimax.io/v1` 是 OpenAI 相容 Payload 的選用項目。
- `models.providers.minimax.api`: 優先使用 `anthropic-messages`；`openai-completions` 是 OpenAI 相容 Payload 的選用項目。
- `models.providers.minimax.apiKey`: MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`: 定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`: 為您想要加入允許清單的模型設定別名。
- `models.mode`: 如果您想將 MiniMax 與內建模型一起新增，請保留 `merge`。

## 備註

- 模型參照為 `minimax/<model>`。
- 推薦的模型 ID：`MiniMax-M2.5` 和 `MiniMax-M2.5-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (需要 coding plan 金鑰)。
- 如果您需要準確的成本追蹤，請更新 `models.json` 中的定價數值。
- MiniMax Coding Plan 的推薦連結 (10% 折扣)：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 以了解提供者規則。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.5` 進行切換。

## 疑難排解

### "Unknown model: minimax/MiniMax-M2.5"

這通常表示 **未設定 MiniMax 提供者** (找不到提供者項目且找不到 MiniMax 認證設定檔/環境金鑰)。針對此偵測問題的修正包含在 **2026.1.12** 版本中 (撰寫時尚未發布)。修正方法：

- 升級到 **2026.1.12**（或從源代碼運行 `main`），然後重啟閘道。
- 運行 `openclaw configure` 並選擇 **MiniMax M2.5**，或
- 手動添加 `models.providers.minimax` 區塊，或
- 設定 `MINIMAX_API_KEY`（或 MiniMax 認證設定檔），以便注入提供者。

請確保模型 ID **區分大小寫**：

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然後使用以下指令重新檢查：

```bash
openclaw models list
```

import en from "/components/footer/en.mdx";

<en />
