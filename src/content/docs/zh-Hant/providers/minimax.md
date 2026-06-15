---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

OpenClaw 的 MiniMax 提供者預設為 **MiniMax M3**。

MiniMax 還提供：

- 透過 T2A v2 整合的語音合成
- 透過 `MiniMax-VL-01` 整合的圖像理解
- 透過 `music-2.6` 整合的音樂生成
- 透過 MiniMax Token Plan 搜尋 API 捆綁的 `web_search`

提供者區分：

| 提供者 ID        | 驗證     | 功能                                                         |
| ---------------- | -------- | ------------------------------------------------------------ |
| `minimax`        | API 金鑰 | 文字、圖像生成、音樂生成、影片生成、圖像理解、語音、網路搜尋 |
| `minimax-portal` | OAuth    | 文字、圖像生成、音樂生成、影片生成、圖像理解、語音           |

## 內建目錄

| 模型                     | 類型         | 描述                       |
| ------------------------ | ------------ | -------------------------- |
| `MiniMax-M3`             | 聊天（推理） | 預設的託管推理模型         |
| `MiniMax-M2.7`           | 聊天（推理） | 先前的託管推理模型         |
| `MiniMax-M2.7-highspeed` | 聊天 (推理)  | 更快的 M2.7 推理層級       |
| `MiniMax-VL-01`          | 視覺         | 圖像理解模型               |
| `image-01`               | 圖像生成     | 文字轉圖像和圖像轉圖像編輯 |
| `music-2.6`              | 音樂生成     | 預設音樂模型               |
| `music-2.5`              | 音樂生成     | 先前的音樂生成層級         |
| `music-2.0`              | 音樂生成     | 舊版音樂生成層級           |
| `MiniMax-Hailuo-2.3`     | 影片生成     | 文字轉影片和圖片參照流程   |

## 開始使用

選擇您偏好的驗證方法並依照設定步驟操作。

<Tabs>
  <Tab title="OAuth (Coding Plan)">
    **最適合：** 透過 OAuth 使用 MiniMax Coding Plan 快速設定，不需要 API 金鑰。

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
    OAuth 設定使用 `minimax-portal` 提供者 ID。模型參照遵循 `minimax-portal/MiniMax-M3` 格式。
    </Note>

    <Tip>
    MiniMax Coding Plan 推薦連結 (10% 折扣)：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API 金鑰">
    **最適用於：** 擁有 Anthropic 相容 API 的託管 MiniMax。

    <Tabs>
      <Tab title="國際">
        <Steps>
          <Step title="執行入門設定">
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
          <Step title="執行入門設定">
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
      agents: { defaults: { model: { primary: "minimax/MiniMax-M3" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
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
    在 Anthropic 相容的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。MiniMax 的串流端點會在 OpenAI 風格的 delta 區塊中發出 `reasoning_content`，而不是原生的 Anthropic 思考區塊；如果在隱含啟用的情況下保留此設定，可能會將內部推理洩漏到可見的輸出中。
    </Warning>

    <Note>
    API 金鑰設定使用 `minimax` 提供者 ID。模型參照遵循 `minimax/MiniMax-M3` 格式。
    </Note>

  </Tab>
</Tabs>

## 透過 `openclaw configure` 進行設定

使用互動式設定精靈來設定 MiniMax，而無需編輯 JSON：

<Steps>
  <Step title="啟動精靈">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="選擇 Model/auth">
    從選單中選擇 **Model/auth**。
  </Step>
  <Step title="選擇 MiniMax 驗證選項">
    選擇其中一個可用的 MiniMax 選項：

    | 驗證選擇 | 說明 |
    | --- | --- |
    | `minimax-global-oauth` | 國際 OAuth (開發計畫) |
    | `minimax-cn-oauth` | 中國 OAuth (開發計畫) |
    | `minimax-global-api` | 國際 API 金鑰 |
    | `minimax-cn-api` | 中國 API 金鑰 |

  </Step>
  <Step title="選擇您的預設模型">
    當提示時，選擇您的預設模型。
  </Step>
</Steps>

## 功能

### 圖片生成

MiniMax 插件為 `image_generate` 工具註冊了 `image-01` 模型。它支援：

- 支援長寬比控制的 **文字轉圖片生成**
- 支援長寬比控制的 **圖片轉圖片編輯** (主體參考)
- 每個請求最多 **9 張輸出圖片**
- 每個編輯請求最多 **1 張參考圖片**
- 支援的長寬比：`1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

若要使用 MiniMax 進行圖片生成，請將其設為圖片生成供應商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

該插件使用與文字模型相同的 `MINIMAX_API_KEY` 或 OAuth 驗證。如果已經設定了 MiniMax，則不需要額外設定。

`minimax` 和 `minimax-portal` 都會註冊具有相同
`image-01` 模型的 `image_generate`。API 金鑰設定使用 `MINIMAX_API_KEY`；OAuth 設定則可以改用
內建的 `minimax-portal` 驗證路徑。

圖片生成始終使用 MiniMax 專用的圖片端點
(`/v1/image_generation`) 並忽略 `models.providers.minimax.baseUrl`，
因為該欄位設定的是聊天/Anthropic 相容的基礎 URL。請設定
`MINIMAX_API_HOST=https://api.minimaxi.com` 將圖片生成
路由至 CN 端點；預設的全域端點為
`https://api.minimax.io`。

當入門或 API 金鑰設定寫入明確的 `models.providers.minimax` 條目時，OpenClaw 會將 `MiniMax-M3`、`MiniMax-M2.7` 和 `MiniMax-M2.7-highspeed` 具體化為聊天模型。M3 支援文字和圖像輸入；圖像理解則透過外掛程式擁有的 `MiniMax-VL-01` 媒體提供者單獨公開。

<Note>請參閱 [圖像生成](/zh-Hant/tools/image-generation) 以了解共用工具參數、提供者選擇和故障轉移行為。</Note>

### 文字轉語音

隨附的 `minimax` 外掛程式會將 MiniMax T2A v2 註冊為 `messages.tts` 的語音提供者。

- 預設 TTS 模型：`speech-2.8-hd`
- 預設語音：`English_expressive_narrator`
- 支援的隨附模型 ID 包括 `speech-2.8-hd`、`speech-2.8-turbo`、`speech-2.6-hd`、`speech-2.6-turbo`、`speech-02-hd`、`speech-02-turbo`、`speech-01-hd` 和 `speech-01-turbo`。
- 驗證解析依次為 `messages.tts.providers.minimax.apiKey`，然後是 `minimax-portal` OAuth/Token 驗證設定檔，接著是 Token Plan 環境金鑰 (`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`)，最後是 `MINIMAX_API_KEY`。
- 如果未設定 TTS 主機，OpenClaw 會重複使用已設定的 `minimax-portal` OAuth 主機，並移除相容 Anthropic 的路徑尾碼，例如 `/anthropic`。
- 一般音訊附件維持為 MP3 格式。
- 針對飛書和 Telegram 等語音訊息目標，會使用 `ffmpeg` 將 MiniMax MP3 轉碼為 48kHz Opus，因為飛書/Lark 檔案 API 僅接受 `file_type: "opus"` 作為原生音訊訊息。
- MiniMax T2A 接受小數的 `speed` 和 `vol`，但 `pitch` 會作為整數傳送；OpenClaw 會在 API 請求前截斷小數的 `pitch` 值。

| 設定                                            | 環境變數               | 預設值                        | 描述                      |
| ----------------------------------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `messages.tts.providers.minimax.baseUrl`        | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | MiniMax T2A API 主機。    |
| `messages.tts.providers.minimax.model`          | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | TTS 模型 ID。             |
| `messages.tts.providers.minimax.speakerVoiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | 用於語音輸出的音色 ID。   |
| `messages.tts.providers.minimax.speed`          |                        | `1.0`                         | 播放速度，`0.5..2.0`。    |
| `messages.tts.providers.minimax.vol`            |                        | `1.0`                         | 音量，`(0, 10]`。         |
| `messages.tts.providers.minimax.pitch`          |                        | `0`                           | 整數音高偏移，`-12..12`。 |

### 音樂生成

內建的 MiniMax 外掛透過共享的 `music_generate` 工具，為 `minimax` 和 `minimax-portal` 註冊音樂生成功能。

- 預設音樂模型：`minimax/music-2.6`
- OAuth 音樂模型：`minimax-portal/music-2.6`
- 同時支援 `minimax/music-2.5` 和 `minimax/music-2.0`
- 提示詞控制：`lyrics`、`instrumental`
- 輸出格式：`mp3`
- 支援會話的執行會透過共享的任務/狀態流程進行分離，包括 `action: "status"`

若要將 MiniMax 設為預設的音樂提供者：

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

<Note>請參閱 [音樂生成](/zh-Hant/tools/music-generation) 以了解共享工具參數、提供者選擇和容錯行為。</Note>

### 影片生成

內建的 MiniMax 外掛透過共享的 `video_generate` 工具，為 `minimax` 和 `minimax-portal` 註冊影片生成功能。

- 預設影片模型：`minimax/MiniMax-Hailuo-2.3`
- OAuth 影片模型：`minimax-portal/MiniMax-Hailuo-2.3`
- 模式：文字生成影片和單張圖片參考流程
- 支援 `aspectRatio` 和 `resolution`

若要將 MiniMax 設為預設的影片提供者：

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

<Note>請參閱 [影片生成](/zh-Hant/tools/video-generation) 以了解共享工具參數、提供者選擇和容錯行為。</Note>

### 圖片理解

MiniMax 外掛程式與文字目錄分別註冊圖片理解功能：

| 提供者 ID        | 預設圖片模型    |
| ---------------- | --------------- |
| `minimax`        | `MiniMax-VL-01` |
| `minimax-portal` | `MiniMax-VL-01` |

這就是為什麼即使套件的文字提供者目錄也包含 M3 支援圖片的聊天引用，自動媒體路由仍可使用 MiniMax 圖片理解功能。

### 網路搜尋

MiniMax 外掛程式也透過 MiniMax Token Plan 搜尋 API 註冊了 `web_search`。

- 提供者 ID：`minimax`
- 結構化結果：標題、URL、摘要、相關查詢
- 偏好的環境變數：`MINIMAX_CODE_PLAN_KEY`
- 接受的環境變數別名：`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`
- 相容性備援：當 `MINIMAX_API_KEY` 已指向 token-plan 憑證時
- 區域重複使用：`plugins.entries.minimax.config.webSearch.region`，然後是 `MINIMAX_API_HOST`，最後是 MiniMax 提供者基礎 URL
- 搜尋保持在提供者 ID `minimax`；OAuth CN/global 設定可透過 `models.providers.minimax-portal.baseUrl` 間接引導區域，並可透過 `MINIMAX_OAUTH_TOKEN` 提供 bearer auth

設定位於 `plugins.entries.minimax.config.webSearch.*` 之下。

<Note>完整的網路搜尋設定與用法請參閱 [MiniMax Search](/zh-Hant/tools/minimax-search)。</Note>

## 進階設定

<AccordionGroup>
  <Accordion title="Configuration options">
    | 選項 | 描述 |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | 偏好 `https://api.minimax.io/anthropic` (Anthropic 相容)；`https://api.minimax.io/v1` 對於 OpenAI 相容的 payload 是可選的 |
    | `models.providers.minimax.api` | 偏好 `anthropic-messages`；`openai-completions` 對於 OpenAI 相容的 payload 是可選的 |
    | `models.providers.minimax.apiKey` | MiniMax API 金鑰 (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | 定義 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost` |
    | `agents.defaults.models` | 為您想要列入白名單的模型設定別名 |
    | `models.mode` | 如果您想將 MiniMax 與內建項目一起新增，請保留 `merge` |
  </Accordion>

  <Accordion title="Thinking defaults">
    在 `api: "anthropic-messages"` 上，OpenClaw 會注入 `thinking: { type: "disabled" }`，除非思考（thinking）已在參數/配置中明確設定。

    這可以防止 MiniMax 的串流端點在 OpenAI 風格的 delta 區塊中發出 `reasoning_content`，否則將導致內部推理洩漏到可見輸出中。

  </Accordion>

<Accordion title="Fast mode">`/fast on` 或 `params.fastMode: true` 會在 Anthropic 相容的串流路徑上將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。</Accordion>

  <Accordion title="Fallback example">
    **最適用於：** 將您最強大的最新世代模型設為主要模型，並故障轉移到 MiniMax M2.7。以下範例使用 Opus 作為具體的主要模型；請替換為您偏好的最新世代主要模型。

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

  <Accordion title="編碼方案使用詳情">
    - 編碼方案使用 API：`https://api.minimaxi.com/v1/token_plan/remains` 或 `https://api.minimax.io/v1/token_plan/remains`（需要編碼方案金鑰）。
    - 使用量輪詢會從配置的 `models.providers.minimax-portal.baseUrl` 或 `models.providers.minimax.baseUrl` 推導主機，因此使用 `https://api.minimax.io/anthropic` 的全域設定會輪詢 `api.minimax.io`。為了相容性，遺失或格式錯誤的基礎 URL 會保留 CN 備援。
    - OpenClaw 會將 MiniMax 編碼方案的使用量標準化，與其他供應商使用的相同 `% left` 顯示一致。MiniMax 原始的 `usage_percent` / `usagePercent` 欄位代表剩餘配額，而非已用配額，因此 OpenClaw 會將其反轉。優先使用基於計數的欄位（如果存在）。
    - 當 API 返回 `model_remains` 時，OpenClaw 優先選擇聊天模型條目，並在需要時從 `start_time` / `end_time` 推導視窗標籤，並在方案標籤中包含所選模型名稱，以便更容易區分編碼方案的視窗。
    - 使用量快照將 `minimax`、`minimax-cn` 和 `minimax-portal` 視為同一個 MiniMax 配額層面，並優先使用已儲存的 MiniMax OAuth，然後才回退到編碼方案金鑰環境變數。

  </Accordion>
</AccordionGroup>

## 注意事項

- 模型參照遵循驗證路徑：
  - API 金鑰設定：`minimax/<model>`
  - OAuth 設定：`minimax-portal/<model>`
- 預設聊天模型：`MiniMax-M3`
- 替代聊天模型：`MiniMax-M2.7`、`MiniMax-M2.7-highspeed`
- 上架和直接 API 金鑰設定會寫入 M3 和兩種 M2.7 變體的模型定義
- 圖像理解使用外掛程式擁有的 `MiniMax-VL-01` 媒體供應商
- 如果您需要精確的成本追蹤，請更新 `models.json` 中的定價值
- 使用 `openclaw models list` 確認目前的供應商 ID，然後使用 `openclaw models set minimax/MiniMax-M3` 或 `openclaw models set minimax-portal/MiniMax-M3` 切換

<Tip>MiniMax 編碼方案推薦連結（10% 折扣）：[MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>請參閱 [模型供應商](/zh-Hant/concepts/model-providers) 瞭解供應商規則。</Note>

## 疑難排解

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M3"'>
    這通常表示 **未設定 MiniMax 供應商**（找不到相符的供應商項目及 MiniMax 驗證設定檔/環境金鑰）。此偵測問題的修正將包含於 **2026.1.12** 版中。修正方式：

    - 升級至 **2026.1.12** 版（或從原始碼執行 `main`），然後重新啟動閘道。
    - 執行 `openclaw configure` 並選擇 **MiniMax** 驗證選項，或
    - 手動新增相符的 `models.providers.minimax` 或 `models.providers.minimax-portal` 區塊，或
    - 設定 `MINIMAX_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 MiniMax 驗證設定檔，以便插入相符的供應商。

    請確保模型 ID **區分大小寫**：

    - API 金鑰路徑：`minimax/MiniMax-M3`、`minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`
    - OAuth 路徑：`minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7` 或 `minimax-portal/MiniMax-M2.7-highspeed`

    然後使用以下指令重新檢查：

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>更多說明：[疑難排解](/zh-Hant/help/troubleshooting) 和 [常見問題](/zh-Hant/help/faq)。</Note>

## 相關內容

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
  <Card title="視訊生成" href="/zh-Hant/tools/video-generation" icon="video">
    共用的視訊工具參數和提供者選擇。
  </Card>
  <Card title="MiniMax 搜尋" href="/zh-Hant/tools/minimax-search" icon="magnifying-glass">
    透過 MiniMax Token 方案進行的網頁搜尋設定。
  </Card>
  <Card title="疑難排解" href="/zh-Hant/help/troubleshooting" icon="wrench">
    一般疑難排解與常見問題。
  </Card>
</CardGroup>
