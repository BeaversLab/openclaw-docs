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

- 透過 T2A v2 捆綁的語音合成
- 透過 `MiniMax-VL-01` 捆綁的影像理解
- 透過 `music-2.5+` 捆綁的音樂生成
- 透過 MiniMax Coding Plan 搜尋 API 捆綁 `web_search`

供應商拆分：

| 供應商 ID        | 驗證     | 功能                                     |
| ---------------- | -------- | ---------------------------------------- |
| `minimax`        | API 金鑰 | 文字、影像生成、影像理解、語音、網路搜尋 |
| `minimax-portal` | OAuth    | 文字、影像生成、影像理解                 |

## 模型系列

| 模型                     | 類型         | 描述                       |
| ------------------------ | ------------ | -------------------------- |
| `MiniMax-M2.7`           | 聊天（推理） | 預設的託管推理模型         |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理層級       |
| `MiniMax-VL-01`          | 視覺         | 影像理解模型               |
| `image-01`               | 影像生成     | 文字轉影像和影像轉影像編輯 |
| `music-2.5+`             | 音樂生成     | 預設的音樂模型             |
| `music-2.5`              | 音樂生成     | 上一代音樂生成層級         |
| `music-2.0`              | 音樂生成     | 舊版音樂生成層級           |
| `MiniMax-Hailuo-2.3`     | 影片生成     | 文字轉影片和影像參考流程   |

## 開始使用

選擇您偏好的驗證方式並依照設定步驟操作。

<Tabs>
  <Tab title="OAuth (Coding Plan)">
    **最適合：** 透過 OAuth 使用 MiniMax Coding Plan 快速設置，無需 API 金鑰。

    <Tabs>
      <Tab title="國際版">
        <Steps>
          <Step title="執行入門指引">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            這將對 `api.minimax.io` 進行驗證。
          </Step>
          <Step title="驗證模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中國大陸版">
        <Steps>
          <Step title="執行入門指引">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            這將對 `api.minimaxi.com` 進行驗證。
          </Step>
          <Step title="驗證模型是否可用">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 設置使用 `minimax-portal` 提供者 ID。模型引用採用 `minimax-portal/MiniMax-M2.7` 的格式。
    </Note>

    <Tip>
    MiniMax Coding Plan 推薦連結（9 折優惠）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API key">
    **最適合：** 具有相容 Anthropic API 的託管 MiniMax。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            這會將 `api.minimax.io` 設定為基礎 URL。
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            這會將 `api.minimaxi.com` 設定為基礎 URL。
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### 設定範例

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

    <Warning>
    在相容 Anthropic 的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考。MiniMax 的串流端點會以 OpenAI 樣式的增量區塊發出 `reasoning_content`，而非原生的 Anthropic 思考區塊，如果在隱含啟用的情況下保留，可能會導致內部推理洩漏到可見的輸出中。
    </Warning>

    <Note>
    API 金鑰設定使用 `minimax` 提供者 ID。模型參照遵循 `minimax/MiniMax-M2.7` 格式。
    </Note>

  </Tab>
</Tabs>

## 透過 `openclaw configure` 設定

使用互動式設定精靈來設定 MiniMax，而無需編輯 JSON：

<Steps>
  <Step title="啟動精靈">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="選擇模型/驗證">
    從選單中選擇 **模型/驗證**。
  </Step>
  <Step title="選擇 MiniMax 驗證選項">
    從可用的 MiniMax 選項中選擇一個：

    | 驗證選擇 | 描述 |
    | --- | --- |
    | `minimax-global-oauth` | 國際 OAuth (Coding Plan) |
    | `minimax-cn-oauth` | 中國 OAuth (Coding Plan) |
    | `minimax-global-api` | 國際 API 金鑰 |
    | `minimax-cn-api` | 中國 API 金鑰 |

  </Step>
  <Step title="選擇您的預設模型">
    當系統提示時，選擇您的預設模型。
  </Step>
</Steps>

## 功能

### 圖像生成

MiniMax 插件為 `image_generate` 工具註冊了 `image-01` 模型。它支援：

- **文字轉圖像生成**，並可控制長寬比
- **圖像轉圖像編輯**（主體參考），並可控制長寬比
- 每個請求最多可輸出 **9 張圖像**
- 每個編輯請求最多可使用 **1 張參考圖像**
- 支援的長寬比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

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

該插件使用與文字模型相同的 `MINIMAX_API_KEY` 或 OAuth 驗證。如果已經設定了 MiniMax，則不需要額外配置。

`minimax` 和 `minimax-portal` 都會使用相同的
`image-01` 模型來註冊 `image_generate`。API 金鑰設定使用 `MINIMAX_API_KEY`；OAuth 設定則可以改用
內建的 `minimax-portal` 驗證路徑。

當入門或 API 金鑰設定寫入明確的 `models.providers.minimax`
項目時，OpenClaw 會以 `input: ["text", "image"]` 具體化
`MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed`。

內建捆綁的 MiniMax 文字目錄本身在被明確提供者設定存在之前，僅保持為僅限文字的中繼資料。圖像理解功能透過外掛程式擁有的 `MiniMax-VL-01` 媒體提供者單獨公開。

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選取和容錯移轉行為。</Note>

### 音樂生成

內建捆綁的 `minimax` 外掛程式也會透過共用的
`music_generate` 工具註冊音樂生成。

- 預設音樂模型：`minimax/music-2.5+`
- 同時支援 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示控制：`lyrics`、`instrumental`、`durationSeconds`
- 輸出格式：`mp3`
- 基於工作階段的執行會透過共用的任務/狀態流程分離，包括 `action: "status"`

若要使用 MiniMax 作為預設音樂提供者：

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

<Note>請參閱 [音樂生成](/zh-Hant/tools/music-generation) 以了解共用工具參數、提供者選取和容錯移轉行為。</Note>

### 影片生成

內建捆綁的 `minimax` 外掛程式也會透過共用的
`video_generate` 工具註冊影片生成。

- 預設影片模型：`minimax/MiniMax-Hailuo-2.3`
- 模式：文字生成影片和單一圖片參考流程
- 支援 `aspectRatio` 和 `resolution`

若要使用 MiniMax 作為預設影片提供者：

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

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共用工具參數、提供者選取和容錯移轉行為。</Note>

### 圖像理解

MiniMax 外掛程式會將圖像理解功能與文字
目錄分開註冊：

| 提供者 ID        | 預設圖像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

這就是為什麼即使隨附的文字提供者目錄仍顯示僅限文字的 M2.7 聊天參考，自動媒體路由仍可使用 MiniMax 圖像理解。

### 網路搜尋

MiniMax 外掛程式也透過 MiniMax Coding Plan 搜尋 API 註冊 `web_search`。

- 提供者 ID：`minimax`
- 結構化結果：標題、網址、摘要、相關查詢
- 首選的環境變數：`MINIMAX_CODE_PLAN_KEY`
- 接受的環境變數別名：`MINIMAX_CODING_API_KEY`
- 相容性回退：當 `MINIMAX_API_KEY` 已指向 coding-plan token 時使用
- 區域重用：先 `plugins.entries.minimax.config.webSearch.region`，然後 `MINIMAX_API_HOST`，接著是 MiniMax 提供者基礎 URL
- 搜尋保持在提供者 ID `minimax` 上；OAuth 中國/全球設定仍可透過 `models.providers.minimax-portal.baseUrl` 間接導向區域

設定位於 `plugins.entries.minimax.config.webSearch.*` 之下。

<Note>請參閱 [MiniMax Search](/zh-Hant/tools/minimax-search) 以取得完整的網路搜尋設定與使用方式。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Configuration options">
    | 選項 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 優先使用 `https://api.minimax.io/anthropic` (Anthropic 相容)；`https://api.minimax.io/v1` 對於 OpenAI 相容的 payload 是選用的 |
    | `models.providers.minimax.api` | 優先使用 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payload 是選用的 |
    | `models.providers.minimax.apiKey` | MiniMax API 金鑰 (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | 定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 為您想要加入允許清單的模型設定別名 |
    | `models.mode` | 如果您想將 MiniMax 與內建模型並用，請保留 `merge` |
  </Accordion>

  <Accordion title="Thinking defaults">
    在 `api: "anthropic-messages"` 上，除非已在 params/config 中明確設定 thinking，否則 OpenClaw 會注入 `thinking: { type: "disabled" }`。

    這可以防止 MiniMax 的串流端點在 OpenAI 風格的 delta 區塊中發出 `reasoning_content`，否則會將內部推理洩漏到可見輸出中。

  </Accordion>

<Accordion title="Fast mode">`/fast on` 或 `params.fastMode: true` 會在 Anthropic 相容的串流路徑上將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。</Accordion>

  <Accordion title="Fallback example">
    **最適用於：**將您最強大的最新世代模型設為主要模型，並故障轉移到 MiniMax M2.7。下方的範例使用 Opus 作為具體的主要模型；您可以替換為您偏好的最新世代主要模型。

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

  </Accordion>

  <Accordion title="Coding Plan usage details">
    - Coding Plan 使用量 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan 金鑰）。
    - OpenClaw 會將 MiniMax coding-plan 使用量正規化為與其他提供者相同的 `% left` 顯示格式。MiniMax 原始的 `usage_percent` / `usagePercent` 欄位代表剩餘配額，而非已消耗配額，因此 OpenClaw 會將其反轉。當存在計數型欄位時，以計數型欄位為準。
    - 當 API 傳回 `model_remains` 時，OpenClaw 偏好使用 chat-model 條目，必要時從 `start_time` / `end_time` 推導視窗標籤，並在計畫標籤中包含所選模型名稱，以便更容易區分 coding-plan 視窗。
    - 使用量快照將 `minimax`、`minimax-cn` 和 `minimax-portal` 視為同一個 MiniMax 配額層面，並且優先使用儲存的 MiniMax OAuth，然後才回退到 Coding Plan 金鑰環境變數。
  </Accordion>
</AccordionGroup>

## 註記

- 模型參照遵循驗證路徑：
  - API 金鑰設定：`minimax/<model>`
  - OAuth 設定：`minimax-portal/<model>`
- 預設聊天模型：`MiniMax-M2.7`
- 替代聊天模型：`MiniMax-M2.7-highspeed`
- 入門和直接 API 金鑰設定需要針對這兩款 M2.7 變體使用 `input: ["text", "image"]` 撰寫明確的模型定義
- 內建的提供者目錄目前將聊天參照僅公開為純文字元資料，直到存在明確的 MiniMax 提供者設定為止
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價數值
- 使用 `openclaw models list` 確認目前的提供者 ID，然後使用 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 進行切換

<Tip>MiniMax 編碼計畫的推薦連結（9 折）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>請參閱 [模型提供者](/zh-Hant/concepts/model-providers) 了解提供者規則。</Note>

## 疑難排解

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M2.7"'>
    這通常表示 **未設定 MiniMax 提供者**（找不到相符的提供者條目，也找不到 MiniMax 認證設定檔/環境金鑰）。此偵測問題的修正包含在 **2026.1.12** 版本中。修正方法如下：

    - 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
    - 執行 `openclaw configure` 並選擇 **MiniMax** 認證選項，或
    - 手動新增相符的 `models.providers.minimax` 或 `models.providers.minimax-portal` 區塊，或
    - 設定 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 認證設定檔，以便注入相符的提供者。

    請確保模型 ID **區分大小寫**：

    - API 金鑰路徑：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路徑：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然後使用以下方式重新檢查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 與 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇供應商、模型參照和故障轉移行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的影像工具參數與供應商選擇。
  </Card>
  <Card title="Music generation" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數與供應商選擇。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數與供應商選擇。
  </Card>
  <Card title="MiniMax Search" href="/zh-Hant/tools/minimax-search" icon="magnifying-glass">
    透過 MiniMax Coding Plan 進行網路搜尋設定。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
