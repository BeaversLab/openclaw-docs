---
summary: "在 OpenClaw 中使用 MiniMax M2.5"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

MiniMax 是一家構建 **M2/M2.5** 模型系列的 AI 公司。目前專注於編碼的發布版本是 **MiniMax M2.5**（2025 年 12 月 23 日），旨在解決現實世界的複雜任務。

來源：[MiniMax M2.5 發布說明](https://www.minimax.io/news/minimax-m25)

## 模型概覽 (M2.5)

MiniMax 強調了 M2.5 中的以下改進：

- 更強的 **多語言編碼** (Rust, Java, Go, C++, Kotlin, Objective-C, TS/JS)。
- 更好的 **網頁/應用程式開發** 和美觀的輸出品質（包括原生行動應用程式）。
- 改進了針對辦公室風格工作流程的 **複合指令** 處理，基於交錯思考和整合約束執行。
- **更簡潔的回應**，減少 token 使用量並加快迭代循環。
- 更強的 **工具/代理程式框架** 相容性和上下文管理 (Claude Code, Droid/Factory AI, Cline, Kilo Code, Roo Code, BlackBox)。
- 更高品質的 **對話和技術寫作** 輸出。

## MiniMax M2.5 vs MiniMax M2.5 Highspeed

- **速度：** `MiniMax-M2.5-highspeed` 是 MiniMax 文件中官方指定的快速層級。
- **成本：** MiniMax 的定價表顯示，高速版的輸入成本相同，但輸出成本較高。
- **目前的模型 ID：** 使用 `MiniMax-M2.5` 或 `MiniMax-M2.5-highspeed`。

## 選擇設定方式

### MiniMax OAuth (Coding Plan) — 推薦

**適用於：** 透過 OAuth 快速設定 MiniMax Coding Plan，無需 API 金鑰。

啟用內建的 OAuth 外掛程式並進行驗證：

```bash
openclaw plugins enable minimax  # skip if already loaded.
openclaw gateway restart  # restart if gateway is already running
openclaw onboard --auth-choice minimax-portal
```

系統將提示您選擇一個端點：

- **Global** - 國際使用者 (`api.minimax.io`)
- **CN** - 中國使用者 (`api.minimaxi.com`)

詳情請參閱 [MiniMax 外掛程式 README](https://github.com/openclaw/openclaw/tree/main/extensions/minimax)。

### MiniMax M2.5 (API 金鑰)

**適用於：** 使用相容 Anthropic API 的託管 MiniMax。

透過 CLI 設定：

- 執行 `openclaw configure`
- 選取 **Model/auth**
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

**適用於：** 將您最強大的最新世代模型設為主要模型，並在故障時切換至 MiniMax M2.5。
下方範例使用 Opus 作為具體的主要模型；請替換為您偏好的最新世代主要模型。

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

### 可選：透過 LM Studio 本地運行（手動）

**最適用於：** 透過 LM Studio 進行本地推論。
我們在強大硬體（例如桌面/伺服器）上使用 LM Studio 的本地伺服器測試 MiniMax M2.5 時，看到了卓越的成果。

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
2. 選擇 **模型/驗證 (Model/auth)**。
3. 選擇 **MiniMax M2.5**。
4. 當系統提示時，選擇您的預設模型。

## 設定選項

- `models.providers.minimax.baseUrl`：優先使用 `https://api.minimax.io/anthropic` (Anthropic 相容)；`https://api.minimax.io/v1` 對於 OpenAI 相容的 payload 是可選的。
- `models.providers.minimax.api`：優先使用 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payload 是可選的。
- `models.providers.minimax.apiKey`：MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：為您想要加入允許清單的模型建立別名。
- `models.mode`：如果您想要將 MiniMax 與內建模型一起新增，請保留 `merge`。

## 備註

- 模型參照為 `minimax/<model>`。
- 推薦的模型 ID：`MiniMax-M2.5` 和 `MiniMax-M2.5-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (需要 coding plan 金鑰)。
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價數值。
- MiniMax Coding Plan 的推薦連結 (10% 折扣)：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 以了解提供商規則。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.5` 進行切換。

## 疑難排解

### “Unknown model: minimax/MiniMax-M2.5”

這通常表示 **MiniMax 提供者未設定**（找不到提供者條目
也找不到 MiniMax auth profile/env key）。此偵測問題的修正將包含在
**2026.1.12** 版本中（撰寫時尚未發布）。修正方法：

- 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動 gateway。
- 執行 `openclaw configure` 並選取 **MiniMax M2.5**，或
- 手動新增 `models.providers.minimax` 區塊，或
- 設定 `MINIMAX_API_KEY`（或 MiniMax auth profile），以便注入提供者。

請確保模型 ID **區分大小寫**：

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然後使用以下方式重新檢查：

```bash
openclaw models list
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
