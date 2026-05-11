---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供者預設為 **MiniMax M2.7**。

MiniMax 還提供：

- 透過 T2A v2 整合的語音合成
- 透過 `MiniMax-VL-01` 整合的圖像理解
- 透過 `music-2.6` 整合的音樂生成
- 透過 MiniMax Coding Plan 搜尋 API 整合的 `web_search`

提供者區分：

| 提供者 ID        | 驗證     | 功能                                                         |
| ---------------- | -------- | ------------------------------------------------------------ |
| `minimax`        | API 金鑰 | 文字、圖像生成、音樂生成、影片生成、圖像理解、語音、網路搜尋 |
| `minimax-portal` | OAuth    | 文字、圖像生成、音樂生成、影片生成、圖像理解、語音           |

## 內建目錄

| 模型                     | 類型         | 描述                       |
| ------------------------ | ------------ | -------------------------- |
| `MiniMax-M2.7`           | 聊天（推理） | 預設的託管推理模型         |
| `MiniMax-M2.7-highspeed` | 聊天（推理） | 更快的 M2.7 推理層級       |
| `MiniMax-VL-01`          | 視覺         | 圖像理解模型               |
| `image-01`               | 圖像生成     | 文字轉圖像和圖像轉圖像編輯 |
| `music-2.6`              | 音樂生成     | 預設音樂模型               |
| `music-2.5`              | 音樂生成     | 上一代音樂生成層級         |
| `music-2.0`              | 音樂生成     | 舊版音樂生成層級           |
| `MiniMax-Hailuo-2.3`     | 影片生成     | 文字轉影片和圖像參考流程   |

## 開始使用

選擇您偏好的驗證方式並依照設定步驟進行。

<Tabs>
  <Tab title="OAuth (Coding Plan)">
    **最適用於：** 透過 OAuth 使用 MiniMax Coding Plan 快速設定，不需要 API 金鑰。

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            這會透過 `api.minimax.io` 進行驗證。
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            這會透過 `api.minimaxi.com` 進行驗證。
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    OAuth 設定使用 `minimax-portal` 提供者 ID。模型參照遵循 `minimax-portal/MiniMax-M2.7` 格式。
    </Note>

    <Tip>
    MiniMax Coding Plan 的推薦連結（10% 折扣）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API 金鑰">
    **最適用於：** 具有相容 Anthropic API 的託管 MiniMax。

    <Tabs>
      <Tab title="國際">
        <Steps>
          <Step title="執行上架設定">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            這會將 `api.minimax.io` 設定為基礎 URL。
          </Step>
          <Step title="驗證模型是否可用">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="中國">
        <Steps>
          <Step title="執行上架設定">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            這會將 `api.minimaxi.com` 設定為基礎 URL。
          </Step>
          <Step title="驗證模型是否可用">
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
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
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
    在相容 Anthropic 的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。MiniMax 的串流端點會以 OpenAI 風格的 delta 區塊發出 `reasoning_content`，而非原生 Anthropic 思考區塊。如果保持隱含啟用，可能會將內部推理洩漏到可見的輸出中。
    </Warning>

    <Note>
    API 金鑰設定使用 `minimax` 提供者 ID。模型參考遵循 `minimax/MiniMax-M2.7` 格式。
    </Note>

  </Tab>
</Tabs>

## 透過 `openclaw configure` 設定

使用互動式設定精靈來設定 MiniMax，而不需編輯 JSON：

<Steps>
  <Step title="啟動精靈">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="選取模型/驗證">
    從選單中選擇 **模型/驗證 (Model/auth)**。
  </Step>
  <Step title="選擇 MiniMax 驗證選項">
    從可用的 MiniMax 選項中選擇一個：

    | 驗證選項 | 說明 |
    | --- | --- |
    | `minimax-global-oauth` | 國際 OAuth (Coding Plan) |
    | `minimax-cn-oauth` | 中國 OAuth (Coding Plan) |
    | `minimax-global-api` | 國際 API 金鑰 |
    | `minimax-cn-api` | 中國 API 金鑰 |

  </Step>
  <Step title="選擇您的預設模型">
    當提示時，選擇您的預設模型。
  </Step>
</Steps>

## 功能

### 影像生成

MiniMax 外掛為 `image_generate` 工具註冊了 `image-01` 模型。它支援：

- **文字轉圖像生成**，支援長寬比控制
- **圖像轉圖像編輯** (主體參考)，支援長寬比控制
- 每個請求最多 **9 張輸出圖像**
- 每個編輯請求最多 **1 張參考圖像**
- 支援的長寬比：`1:1`、`16:9`、`4:3`、`3:2`、`2:3`、`3:4`、`9:16`、`21:9`

若要使用 MiniMax 進行影像生成，請將其設定為影像生成供應商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

此外掛使用與文字模型相同的 `MINIMAX_API_KEY` 或 OAuth 驗證。如果已經設定了 MiniMax，則不需要額外的配置。

`minimax` 和 `minimax-portal` 都會使用相同的
`image-01` 模型來註冊 `image_generate`。API 金鑰設定使用 `MINIMAX_API_KEY`；OAuth 設定可以改用
內建的 `minimax-portal` 驗證路徑。

影像生成總是使用 MiniMax 的專屬圖像端點
(`/v1/image_generation`) 並忽略 `models.providers.minimax.baseUrl`，
因為該欄位設定的是聊天/Anthropic 相容的基礎 URL。設定
`MINIMAX_API_HOST=https://api.minimaxi.com` 以透過 CN 端點路由影像生成；
預設的全域端點是
`https://api.minimax.io`。

當上架或 API 金鑰設定寫入明確的 `models.providers.minimax`
項目時，OpenClaw 會將 `MiniMax-M2.7` 和
`MiniMax-M2.7-highspeed` 具體化為純文字聊天模型。圖像理解功能
則透過外掛擁有的 `MiniMax-VL-01` 媒體供應商單獨公開。

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、供應商選擇和故障轉移行為。</Note>

### 文字轉語音

內建的 `minimax` 外掛將 MiniMax T2A v2 註冊為
`messages.tts` 的語音供應商。

- 預設 TTS 模型：`speech-2.8-hd`
- 預設語音：`English_expressive_narrator`
- 支援的內建模型 ID 包括 `speech-2.8-hd`、`speech-2.8-turbo`、
  `speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、
  `speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 驗證解析順序為 `messages.tts.providers.minimax.apiKey`，接著是
  `minimax-portal` OAuth/權杖驗證設定檔，然後是 Token Plan 環境
  金鑰 (`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、
  `MINIMAX_CODING_API_KEY`)，最後是 `MINIMAX_API_KEY`。
- 如果未設定 TTS 主機，OpenClaw 會重複使用已設定的
  `minimax-portal` OAuth 主機，並移除 Anthropic 相容的路徑後綴，
  例如 `/anthropic`。
- 一般音訊附件保持 MP3 格式。
- 飛書 和 Telegram 等語音訊息目標會使用 `ffmpeg` 從 MiniMax
  MP3 轉碼為 48kHz Opus，因為飛書/Lark 檔案 API 只
  接受 `file_type: "opus"` 作為原生音訊訊息。
- MiniMax T2A 接受分數形式的 `speed` 和 `vol`，但 `pitch` 會以
  整數形式傳送；OpenClaw 會在 API 請求前截斷分數形式的 `pitch` 數值。

| 設定                                     | 環境變數               | 預設值                        | 說明                      |
| ---------------------------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主機。    |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。             |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用於語音輸出的語音 ID。   |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | 播放速度，`0.5..2.0`。    |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | 音量，`(0, 10]`。         |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | 整數音調偏移，`-12..12`。 |

### 音樂生成

內建的 MiniMax 外掛程式透過共用的
`music_generate` 工具為 `minimax` 和 `minimax-portal` 註冊音樂生成功能。

- 預設音樂模型：`minimax/music-2.6`
- OAuth 音樂模型：`minimax-portal/music-2.6`
- 也支援 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示詞控制：`lyrics`、`instrumental`、`durationSeconds`
- 輸出格式：`mp3`
- 會話支援的執行透過共用的任務/狀態流程分離，包括 `action: "status"`

若要將 MiniMax 用作預設的音樂提供商：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>請參閱[音樂生成](/zh-Hant/tools/music-generation)以了解共用工具參數、提供商選擇和故障轉移行為。</Note>

### 視訊生成

內建的 MiniMax 外掛程式透過共用的
`video_generate` 工具為 `minimax` 和 `minimax-portal` 註冊視訊生成功能。

- 預設視訊模型：`minimax/MiniMax-Hailuo-2.3`
- OAuth 視訊模型：`minimax-portal/MiniMax-Hailuo-2.3`
- 模式：文字轉視訊和單一圖片參考流程
- 支援 `aspectRatio` 和 `resolution`

若要將 MiniMax 用作預設的視訊提供商：

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

<Note>請參閱[視訊生成](/zh-Hant/tools/video-generation)以了解共用工具參數、提供商選擇和故障轉移行為。</Note>

### 圖像理解

MiniMax 外掛程式會將圖像理解與文字目錄分別註冊：

| 供應商 ID        | 預設圖像模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

這就是為什麼即使內建的文字供應商目錄仍顯示僅限文字的 M2.7 聊天參考，自動媒體路由仍可使用 MiniMax 圖像理解的原因。

### 網路搜尋

MiniMax 外掛程式也透過 MiniMax Coding Plan 搜尋 API 註冊 `web_search`。

- 供應商 ID：`minimax`
- 結構化結果：標題、網址、摘要、相關查詢
- 首選環境變數：`MINIMAX_CODE_PLAN_KEY`
- 接受的環境變數別名：`MINIMAX_CODING_API_KEY`
- 相容性備援方案：當 `MINIMAX_API_KEY` 已指向 coding-plan token 時使用
- 區域重複使用：先 `plugins.entries.minimax.config.webSearch.region`，接著 `MINIMAX_API_HOST`，然後是 MiniMax 供應商基礎 URL
- 搜尋保持在供應商 ID `minimax` 上；OAuth CN/global 設定仍可透過 `models.providers.minimax-portal.baseUrl` 間接調整區域

設定位於 `plugins.entries.minimax.config.webSearch.*` 之下。

<Note>完整的網路搜尋設定與使用方式，請參閱 [MiniMax Search](/zh-Hant/tools/minimax-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Configuration options">
    | Option | Description |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 偏好 `https://api.minimax.io/anthropic` (Anthropic 相容)；`https://api.minimax.io/v1` 對於 OpenAI 相容的 payload 是可選的 |
    | `models.providers.minimax.api` | 偏好 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payload 是可選的 |
    | `models.providers.minimax.apiKey` | MiniMax API 金鑰 (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | 定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 為您希望加入允許清單的模型設定別名 |
    | `models.mode` | 如果您想將 MiniMax 與內建模型一起加入，請保留 `merge` |
  </Accordion>

  <Accordion title="Thinking defaults">
    在 `api: "anthropic-messages"` 上，除非已在參數/設定中明確設定思考，否則 OpenClaw 會注入 `thinking: { type: "disabled" }`。

    這可以防止 MiniMax 的串流端點在 OpenAI 風格的增量區塊中發出 `reasoning_content`，從而導致內部推理洩漏到可見的輸出中。

  </Accordion>

<Accordion title="Fast mode">`/fast on` 或 `params.fastMode: true` 會在 Anthropic 相容的串流路徑上將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。</Accordion>

  <Accordion title="Fallback example">
    **最適用於：** 將您最強大的最新世代模型作為主要模型，並在失敗時切換至 MiniMax M2.7。以下範例使用 Opus 作為具體的主要模型；您可以將其替換為您偏好的最新世代主要模型。

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

  <Accordion title="Coding Plan 使用詳情">
    - Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 Coding Plan 金鑰）。
    - OpenClaw 會將 MiniMax coding-plan 的使用量標準化為與其他供應商相同的 `% left` 顯示方式。MiniMax 的原始 `usage_percent` / `usagePercent` 欄位代表剩餘配額，而非已用配額，因此 OpenClaw 會將其反轉。當存在基於計數的欄位時，優先使用該欄位。
    - 當 API 返回 `model_remains` 時，OpenClaw 偏好使用聊天模型條目，並在需要時從 `start_time` / `end_time` 推導視窗標籤，同時將選定的模型名稱包含在計劃標籤中，以便更容易區分 coding-plan 視窗。
    - 使用量快照將 `minimax`、`minimax-cn` 和 `minimax-portal` 視為同一個 MiniMax 配額介面，並且在回退到 Coding Plan 金鑰環境變數之前，優先使用已儲存的 MiniMax OAuth。
  </Accordion>
</AccordionGroup>

## 備註

- 模型參照遵循驗證路徑：
  - API 金鑰設定：`minimax/<model>`
  - OAuth 設定：`minimax-portal/<model>`
- 預設聊天模型：`MiniMax-M2.7`
- 備用聊天模型：`MiniMax-M2.7-highspeed`
- 入門和直接 API 金鑰設定會為這兩種 M2.7 變體撰寫僅限文字的模型定義
- 圖像理解使用外掛程式擁有的 `MiniMax-VL-01` 媒體供應商
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價數值
- 使用 `openclaw models list` 確認目前的供應商 ID，然後使用 `openclaw models set minimax/MiniMax-M2.7` 或 `openclaw models set minimax-portal/MiniMax-M2.7` 進行切換

<Tip>MiniMax Coding Plan 的推薦連結（九折）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>參閱 [Model providers](/zh-Hant/concepts/model-providers) 以了解供應商規則。</Note>

## 疑難排解

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M2.7"'>
    這通常表示 **MiniMax 提供者未設定**（找不到相符的提供者項目，也找不到 MiniMax 認證設定檔/環境金鑰）。針對此偵測問題的修復在 **2026.1.12** 版中。修復方法：

    - 升級至 **2026.1.12**（或從原始碼執行 `main`），然後重新啟動閘道。
    - 執行 `openclaw configure` 並選擇 **MiniMax** 認證選項，或
    - 手動新增相符的 `models.providers.minimax` 或 `models.providers.minimax-portal` 區塊，或
    - 設定 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 認證設定檔，以便插入相符的提供者。

    請確保模型 ID **區分大小寫**：

    - API-key 路徑：`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路徑：`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然後使用以下指令重新檢查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關

<CardGroup cols={2}>
  <Card title="Model selection" href="/zh-Hant/concepts/model-providers" icon="layers">
    選擇提供者、模型參照和故障轉移行為。
  </Card>
  <Card title="Image generation" href="/zh-Hant/tools/image-generation" icon="image">
    共用的圖片工具參數和提供者選擇。
  </Card>
  <Card title="Music generation" href="/zh-Hant/tools/music-generation" icon="music">
    共用的音樂工具參數和提供者選擇。
  </Card>
  <Card title="Video generation" href="/zh-Hant/tools/video-generation" icon="video">
    共用的影片工具參數和提供者選擇。
  </Card>
  <Card title="MiniMax Search" href="/zh-Hant/tools/minimax-search" icon="magnifying-glass">
    透過 MiniMax Coding Plan 進行網路搜尋設定。
  </Card>
  <Card title="Troubleshooting" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
