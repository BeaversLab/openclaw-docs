---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供者預設為 **MiniMax M2.7**。

MiniMax 還提供：

- 透過 T2A v2 整合的語音合成
- 透過 `MiniMax-VL-01` 整合的圖像理解
- 透過 `music-2.5+` 整合的音樂生成
- 透過 MiniMax Coding Plan 搜尋 API 整合的 `web_search`

供應商拆分：

- `minimax`：API 金鑰文字供應商，以及整合的圖像生成、圖像理解、語音和網頁搜尋
- `minimax-portal`：OAuth 文字供應商，以及整合的圖像生成和圖像理解

## 模型系列

- `MiniMax-M2.7`：預設的託管推理模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 推理層級。
- `image-01`：圖像生成模型（生成和圖生圖編輯）。

## 圖像生成

MiniMax 外掛程式為 `image_generate` 工具註冊了 `image-01` 模型。它支援：

- **文字生圖**，具備長寬比控制。
- **圖生圖編輯**（主體參考），具備長寬比控制。
- 每個請求最多 **9 張輸出圖像**。
- 每個編輯請求最多 **1 張參考圖像**。
- 支援的長寬比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`。

若要使用 MiniMax 進行圖像生成，請將其設為圖像生成供應商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

此外掛程式使用與文字模型相同的 `MINIMAX_API_KEY` 或 OAuth 驗證。如果已經設定好 MiniMax，則不需要額外的設定。

`minimax` 和 `minimax-portal` 都會以相同的
`image-01` 模型註冊 `image_generate`。API 金鑰設定使用 `MINIMAX_API_KEY`；OAuth 設定可以改用
整合的 `minimax-portal` 驗證路徑。

當入職指南或 API 金鑰設定寫入明確的 `models.providers.minimax` 條目時，OpenClaw 會使用 `input: ["text", "image"]` 具體化 `MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed`。

內建的打包 MiniMax 文字目錄本身在該明確的提供者設定存在之前，僅維持為純文字元資料。圖片理解功能則透過外掛程式擁有的 `MiniMax-VL-01` 媒體提供者獨立公開。

請參閱 [圖片生成](/en/tools/image-generation) 以了解共用工具參數、提供者選取和故障轉移行為。

## 音樂生成

內建的 `minimax` 外掛程式也會透過共用的 `music_generate` 工具註冊音樂生成功能。

- 預設音樂模型：`minimax/music-2.5+`
- 也支援 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示詞控制：`lyrics`、`instrumental`、`durationSeconds`
- 輸出格式：`mp3`
- 基於工作階段的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

要將 MiniMax 設為預設的音樂提供者：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

請參閱 [音樂生成](/en/tools/music-generation) 以了解共用工具參數、提供者選取和故障轉移行為。

## 影片生成

內建的 `minimax` 外掛程式也會透過共用的 `video_generate` 工具註冊影片生成功能。

- 預設影片模型：`minimax/MiniMax-Hailuo-2.3`
- 模式：文字生成影片和單一圖片參考流程
- 支援 `aspectRatio` 和 `resolution`

要將 MiniMax 設為預設的影片提供者：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

請參閱 [影片生成](/en/tools/video-generation) 以了解共用工具參數、提供者選取和故障轉移行為。

## 圖片理解

MiniMax 外掛程式會獨立於文字目錄之外註冊圖片理解功能：

- `minimax`：預設圖片模型 `MiniMax-VL-01`
- `minimax-portal`：預設圖片模型 `MiniMax-VL-01`

這就是為什麼自動媒體路由可以使用 MiniMax 影像理解，
即使捆綁的文字提供者目錄仍然顯示僅限文字的 M2.7 聊天參考。

## 網路搜尋

MiniMax 外掛程式也會透過 MiniMax Coding Plan
搜尋 API 註冊 `web_search`。

- 提供者 ID：`minimax`
- 結構化結果：標題、URL、摘要、相關查詢
- 首選環境變數：`MINIMAX_CODE_PLAN_KEY`
- 接受的環境變數別名：`MINIMAX_CODING_API_KEY`
- 相容性後備：當 `MINIMAX_API_KEY` 已指向 coding-plan token 時
- 區域重複使用：`plugins.entries.minimax.config.webSearch.region`，然後 `MINIMAX_API_HOST`，然後 MiniMax 提供者基本 URL
- 搜尋保持在提供者 ID `minimax`；OAuth CN/global 設定仍可透過 `models.providers.minimax-portal.baseUrl` 間接導引區域

設定位於 `plugins.entries.minimax.config.webSearch.*`。
請參閱 [MiniMax 搜尋](/en/tools/minimax-search)。

## 選擇設定方式

### MiniMax OAuth (Coding Plan) - 推薦

**最適合：** 透過 OAuth 使用 MiniMax Coding Plan 進行快速設定，無需 API 金鑰。

使用明確的區域 OAuth 選擇進行驗證：

```bash
openclaw onboard --auth-choice minimax-global-oauth
# or
openclaw onboard --auth-choice minimax-cn-oauth
```

選項對應：

- `minimax-global-oauth`：國際使用者 (`api.minimax.io`)
- `minimax-cn-oauth`：中國使用者 (`api.minimaxi.com`)

詳情請參閱 OpenClaw 存放庫中的 MiniMax 外掛程式套件 README。

### MiniMax M2.7 (API 金鑰)

**最適合：** 具備 Anthropic 相容 API 的託管 MiniMax。

透過 CLI 設定：

- 互動式入門：

```bash
openclaw onboard --auth-choice minimax-global-api
# or
openclaw onboard --auth-choice minimax-cn-api
```

- `minimax-global-api`：國際使用者 (`api.minimax.io`)
- `minimax-cn-api`：中國使用者 (`api.minimaxi.com`)

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
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

在 Anthropic 相容串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax
思考。MiniMax 的
串流端點會在 OpenAI 風格的增量區塊中發出 `reasoning_content`，
而非原生的 Anthropic 思考區塊，如果保持隱含啟用，可能會導致內部推理
洩漏至可見輸出中。

### MiniMax M2.7 作為後備 (範例)

**最適用於：**將您最強大的最新一代模型設為主要模型，並故障轉移至 MiniMax M2.7。
下方的範例使用 Opus 作為具體的主要模型；您可以將其替換為您偏好的最新一代主要模型。

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
3. 選擇 **MiniMax** 驗證選項。
4. 系統提示時，選擇您的預設模型。

精靈/CLI 中目前的 MiniMax 驗證選項：

- `minimax-global-oauth`
- `minimax-cn-oauth`
- `minimax-global-api`
- `minimax-cn-api`

## 設定選項

- `models.providers.minimax.baseUrl`：優先使用 `https://api.minimax.io/anthropic` (Anthropic 相容)；`https://api.minimax.io/v1` 對於 OpenAI 相容的 payloads 為選用。
- `models.providers.minimax.api`：優先使用 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payloads 為選用。
- `models.providers.minimax.apiKey`：MiniMax API 金鑰 (`MINIMAX_API_KEY`)。
- `models.providers.minimax.models`：定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：別名您想要加入允許清單中的模型。
- `models.mode`：如果您想與內建模型一起新增 MiniMax，請保留 `merge`。

## 備註

- 模型參照遵循驗證路徑：
  - API 金鑰設定：`minimax/<model>`
  - OAuth 設定：`minimax-portal/<model>`
- 預設聊天模型：`MiniMax-M2.7`
- 替代聊天模型：`MiniMax-M2.7-highspeed`
- 在 `api: "anthropic-messages"` 上，除非已在參數/設定中明確設定思考模式，否則 OpenClaw 會
  注入 `thinking: { type: "disabled" }`。
- `/fast on` 或 `params.fastMode: true` 會在 Anthropic 相容串流路徑上將
  `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 入門與直接 API 金鑰設定會為兩種 M2.7 變體寫入明確的模型定義並包含
  `input: ["text", "image"]`
- 隨附的提供者目錄目前將聊天參照公開為僅限文字的
  中繼資料，直到存在明確的 MiniMax 提供者設定為止
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 金鑰）。
- OpenClaw 將 MiniMax coding-plan 的使用量標準化為與其他提供者相同的 `% left` 顯示方式。
  MiniMax 原始的 `usage_percent` / `usagePercent`
  欄位是剩餘配額，而非已用配額，因此 OpenClaw 會將其反轉。
  當存在以計數為基礎的欄位時優先採用。當 API 返回 `model_remains` 時，
  OpenClaw 偏好聊天模型條目，並在需要時從 `start_time` / `end_time` 推導視窗標籤，
  並將選取的模型名稱包含在計畫標籤中，以便更容易區分 coding-plan 視窗。
- 使用量快照將 `minimax`、`minimax-cn` 和 `minimax-portal` 視為
  同一個 MiniMax 配額介面，並在回退到 Coding Plan 金鑰環境變數之前，優先使用已儲存的 MiniMax OAuth。
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價數值。
- MiniMax Coding Plan 的推薦連結（10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 請參閱 [/concepts/model-providers](/en/concepts/model-providers) 以了解提供者規則。
- 使用 `openclaw models list` 確認目前的提供者 ID，然後使用
  `openclaw models set minimax/MiniMax-M2.7` 或
  `openclaw models set minimax-portal/MiniMax-M2.7` 進行切換。

## 疑難排解

### "Unknown model: minimax/MiniMax-M2.7"

這通常表示 **MiniMax 提供者尚未設定**（找不到相符的
提供者條目，也找不到 MiniMax 認證設定檔/環境金鑰）。此偵測問題的修復將包含在 **2026.1.12** 版本中。修正方法：

- 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
- 執行 `openclaw configure` 並選取 **MiniMax** 認證選項，或
- 手動新增相符的 `models.providers.minimax` 或
  `models.providers.minimax-portal` 區塊，或
- 設定 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 認證設定檔
  以便注入相符的提供者。

請確保模型 ID **區分大小寫**：

- API 金鑰路徑：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
- OAuth 路徑：`minimax-portal/MiniMax-M2.7` 或
  `minimax-portal/MiniMax-M2.7-highspeed`

然後使用以下指令重新檢查：

```bash
openclaw models list
```
